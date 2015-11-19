import * as util from './util'
import * as _ from 'derivable'

// es6 type filler
declare function Symbol(name: string);
declare module Symbol { export const iterator: string };
declare module Object {
  export function assign(...objs: any[]): any;
  export function keys(obj: any): string[];
  export const prototype: Object;
};

/**
 * ddom is DerivableDOM
 */
module ddom {
/**
 * Node modifier, for use with include
 */
export type BehaviourAssigner = (node: HTMLElement) => _.Reactor<any>;

function applyBehvaiour(node:HTMLElement, b: BehaviourAssigner) {
  let maybeReactor = b(node);
  if (_.isReactor(maybeReactor)) {
    lifecycle(node, maybeReactor);
  }
}

const specialPropertyHandlers = {
  class: function (node: HTMLElement, val) {
    if (!_.isDerivable(val)) {
      val = _.struct([val]);
    }
    const className = val.derive(util.renderClass);
    lifecycle(node, className.reactor(cn => node.className = cn));
  },
  style: function (node: HTMLElement, styles) {
    if (_.isDerivable(styles)) {
      styles = styles.derive(util.deepDeref);
      lifecycle(node, styles.reactor(styles => {
        Object.assign(node.style, styles);
      }));
    } else {
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
    }
  },
  behaviour: function (node: HTMLElement, behaviour: BehaviourAssigner[]) {
    const apply = b => applyBehvaiour(node, b);
    if (typeof behaviour === 'function') {
      apply(behaviour);
    } else {
      behaviour.forEach(apply);
    }
  }
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
}

/**
 * Use this symbol to add custom rendering logic to your types.
 * the assigned value should be a function and will be called with no args,
 * it should return another renderable thing
 */
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
      } else if (typeof thing.forEach === 'function') {
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

type NodeCache = { [text: string]: Node[] };

function buildKidNodes (nodeCache: NodeCache, kids: any[]): [Node[], NodeCache] {
  const result = [];
  const newCache: NodeCache = {};
  for (let kid of kids) {
    if (kid instanceof Node) {
      result.push(kid)
    } else {
      const s = kid.toString()
      let node: Node;
      const oldNodes = nodeCache[s];
      if (oldNodes && oldNodes.length > 0) {
        node = oldNodes.shift();
      }
      if (!node) {
        node = document.createTextNode(s);
      }
      if (!Object.prototype.hasOwnProperty.call(newCache, s)) {
        newCache[s] = [node];
      } else {
        newCache[s].push(node);
      }
      result.push(node);
    }
  }

  return [result, newCache];
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
 * Create dom nodes from tag name, props, and children. Hooks up derivables
 * to reactions which themselves are hooked into the lifecycle of the returned
 * dom node.
 */
export function dom(tagName: string, props: any, ...children: any[]): HTMLElement {
  if (typeof tagName !== 'string') {
    throw new Error("domlock only supports regular html tags.");
  }

  const result = document.createElement(tagName);

  if (props) {
    for (let key of Object.keys(props)) {
      let val = props[key];
      let special = specialPropertyHandlers[key];
      if (special) {
        special(result, val);
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
    let textNodeCache: NodeCache = {};
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

/**
 * Inserts a ddom-rendered node into the regular dom, using appendChild
 */
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

/**
 * JSX support
 */
export const React = {createElement: dom};

export module behaviour {
  /**
   * Shows/hides a node based on whether when is truthy/falsey respectively
   */
  export function ShowWhen(when: _.Derivable<any>): BehaviourAssigner {
    return node => when.reactor(condition => {
      if (condition) {
        node.style.display = null;
      } else {
        node.style.display = 'none';
      }
    });
  }
  /**
   * Shows/hides a node based on whether when is falsey/truthy respectively
   */
  export function HideWhen(when: _.Derivable<any>): BehaviourAssigner {
    return ShowWhen(when.not());
  }
}

}

export = ddom;
