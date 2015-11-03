import * as _ from 'derivable'
import * as I from 'immutable'
import * as util from './util'
import { ucmap } from './caching'

const customPropertyHandlers = {
  $class: function (node: HTMLElement, val) {
    if (!_.isDerivable(val)) {
      val = _.struct([val]);
    }
    const className = val.derive(util.renderClass);
    lifecycle(node, className.reactor(cn => node.className = cn));
  },
  $style: function (node: HTMLElement, styles) {
    for (let style of Object.keys(styles)) {
      let val = styles[style];
      if (_.isDerivable(val)) {
        ((style, val) => {
          lifecycle(node, val.reactor(v => node.style[style] = v));
        })(style, val);
      } else {
        node.style[style] = val;
      }
    }
  },
  $show: function (node: HTMLElement, val) {
    if (_.isDerivable(val)) {
      lifecycle(node, val.reactor(v => node.style.display = v ? null : 'none'));
    } else {
      node.style.display = val ? null : 'none';
    }
  },
  $hide: function (node: HTMLElement, val) {
    if (_.isDerivable(val)) {
      lifecycle(node, val.reactor(v => node.style.display = v ? 'none' : null));
    } else {
      node.style.display = val ? 'none' : null;
    }
  },
}


const IN_DOM = '__ddom__elemInDom';
const PARENT = '__ddom__elemParent';
const KIDS = '__ddom__kids';
const CURRENT_KIDS = '__ddom__current__kids';
const TREE = '__ddom__tree';
const CURRENT_SUBTREE = '__ddom__current__subtree';

function ensureChildState(child: HTMLElement) {
  if (child && child !== document.body && !child[PARENT]) {
    child[PARENT] = _.atom(ensureChildState(child.parentElement));
    child[IN_DOM] = child[PARENT].derive(parent => {
      return parent && (parent === document.body || parent[IN_DOM].get());
    });
  }
  return child;
}

/**
 * adds lifecycle callbacks to child. invokes onMount if child is already in
 * the dom
 */
export function lifecycle(child: HTMLElement, reactor: _.Reactor<any>);
export function lifecycle(child: HTMLElement, onMount: () => void, onUnmount: () => void);
export function lifecycle(child: HTMLElement, onMount, onUnmount?) {
  ensureChildState(child);
  let r: _.Reactor<any>;
  if (_.isReactor(onMount)) {
    r = child[IN_DOM].reactor(inDom => {
      if (inDom) {
        onMount.start().force();
      } else {
        onMount.stop();
      }
    }).start();
  } else {
    r = child[IN_DOM].reactor(inDom => {
      if (inDom) {
        onMount && onMount();
      } else {
        onUnmount && onUnmount();
      }
    }).start();
  }

  if (child[IN_DOM].get()) {
    r.force();
  }
}

export const renderable = Symbol('ddom_renderable');

function flattenKids (thing: any): any[] {
  const result = [];

  function descend (thing: any) {
    if (thing != null) {
      if (_.isDerivable(thing)) {
        descend(thing.get());
      } else if (thing instanceof Array) {
        for (let i = 0; i < thing.length; i++) {
          descend(thing[i]);
        }
      } else if (thing instanceof I.List) {
        thing.forEach(descend);
      } else if (typeof thing === 'string' || thing instanceof String) {
        result.push(thing);
      } else if (thing[renderable]){
        descend(thing[renderable]());
      } else if (thing[Symbol.iterator]) {
        for (let item of thing) {
          descend(item);
        }
      } else {
        result.push(thing);
      }
    }
  }

  descend(thing);

  return result;
}

function buildKidNodes (nodeCache: I.Map<string, Node[]>, kids: any[]): [Node[], I.Map<any, Node[]>] {
  const result = [];
  const newCache = I.Map<any, Node[]>().asMutable();
  for (let kid of kids) {
    if (kid instanceof Node) {
      result.push(kid)
    } else {
      const s = kid.toString()
      let node: Node;
      const oldNodes = nodeCache.get(s);
      if (oldNodes && oldNodes.length > 0) {
        node = oldNodes.shift();
      }
      if (!node) {
        node = document.createTextNode(s);
      }
      if (!newCache.has(s)) {
        newCache.set(s, [node]);
      } else {
        newCache.get(s).push(node);
      }
      result.push(node);
    }
  }

  return [result, newCache.asImmutable()];
}

function remove(kid: ChildNode) {
  kid.remove();
  if (kid instanceof HTMLElement) {
    kid[PARENT].set(null);
  }
}

function insert(parent: HTMLElement, node: Node, before: Node) {
  parent.insertBefore(node, before);
  if (node instanceof HTMLElement) {
    ensureChildState(node);
    node[PARENT].set(parent);
  }
}

function buildTree(nodes: Node[]) {
  const result = [];
  for (var i = 0, len = nodes.length; i < len; i++) {
    let node = nodes[i];
    if (node instanceof HTMLElement && node[TREE]) {
      result.push(node[TREE].get());
    } else {
      result.push(node);
    }
  }
  return result;
}


/**
 * Creates a VDOM node from the given spec. jsx pluggable
 */
export function dom(tagName: string, props: any, ...children: any[]): HTMLElement {
  if (typeof tagName !== 'string') {
    throw new Error("domlock only supports regular html tags.");
  }

  const result = document.createElement(tagName);

  if (props) {
    for (let key of Object.keys(props)) {
      let val = props[key];
      if (key[0] === '$') {
        let f = customPropertyHandlers[key];
        if (!f) {
          throw new Error("unrecognized special property: " + key);
        } else {
          f(result, val);
        }
      } else {
        if (_.isDerivable(val)) {
          ((key, val) => {
            lifecycle(result, val.reactor(v => result[key] = v));
          })(key, val);
        } else {
          result[key] = val;
        }
      }
    }
  }

  if (children.length) {
    let textNodeCache = I.Map<string, Node[]>();
    result[KIDS] = _.derivation(() => flattenKids(children)).derive(items => {
      let [nodes, newCache] = buildKidNodes(textNodeCache, items);
      textNodeCache = newCache;
      return nodes;
    });
    result[CURRENT_KIDS] = [];
    result[TREE] = result[KIDS].derive(kids => [result, kids, buildTree(kids)]);
    result[CURRENT_SUBTREE] = [];
  }

  return result;
}

function processTree(tree) {
  if (tree instanceof Array) {
    let [node, newKids, subTree] = tree;
    let currentKids = node[CURRENT_KIDS];
    if (newKids !== currentKids) {

      const text = x => x.textContent
      let lcs = util.longestCommonSubsequence(currentKids, newKids);

      let x = 0;
      currentKids.forEach(ck => {
        if (ck !== lcs[x]) {
          remove(ck);
        } else {
          x++;
        }
      });
      x = 0;
      newKids.forEach(nk => {
        if (nk !== lcs[x]) {
          insert(node, nk, lcs[x]);
        } else {
          x++;
        }
      });
      node[CURRENT_KIDS] = newKids;
    }


    let currentSubTree = node[CURRENT_SUBTREE];
    if (currentSubTree !== subTree) {
      subTree.forEach(processTree);
      node[CURRENT_SUBTREE] = subTree;
    }
  }
}


export function root(parent: HTMLElement, child:Node) {
  parent.appendChild(child);
  if (child instanceof HTMLElement) {
    ensureChildState(child);
    child[PARENT].set(parent);
    const tree = child[TREE];
    if (tree) {
      tree.react(_.transaction(tree => {
        processTree(tree);
      }));
    }
  }
}
