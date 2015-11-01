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
      val.react(x => console.log("thing is", x))
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
    } else if (thing != null) {
      result.push(thing);
    }
  }

  descend(thing);

  return result;
}

function buildKids (nodeCache: I.Map<string, Node[]>, kids: any[]): [Node[], I.Map<any, Node[]>] {
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

type Insertion = {
  parent: Node,
  before: Node
};

let _RESTRUCTURINGS_: I.OrderedMap<Node, Insertion>;
let _removals_: I.OrderedSet<ChildNode>;

function withRestructurings (f: () => void) {
  if (_RESTRUCTURINGS_) {
    f();
  } else {
    _RESTRUCTURINGS_ = I.OrderedMap<Node, Insertion>().asMutable();
    _removals_ = I.OrderedSet<ChildNode>().asMutable();
    try {
      f();
    } finally {
      setTimeout(() => {
        _removals_.forEach(kid => {
          kid.remove();
          if (kid instanceof HTMLElement) {
            kid[PARENT].set(null);
          }
        });
        _RESTRUCTURINGS_.forEach(({parent, before}, node: Node) => {
          parent.insertBefore(node, before);
          if (node instanceof HTMLElement) {
            ensureChildState(node);
            node[PARENT].set(parent);
          }
        });
        _RESTRUCTURINGS_ = null;
        _removals_ = null;
      }, 0);
    }
  }
}

function addRestructuring(parent: Node, kid: Node, before: Node) {
  if (_RESTRUCTURINGS_.has(kid)) {
    console.error("Node found at more than one location in the DOM: ", kid);
  }
  _RESTRUCTURINGS_.set(kid, {parent, before});
}

function addRemoval(kid: ChildNode) {
  _removals_.add(kid);
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
    const flattened = _.atom(children).derive(flattenKids);

    let nodeCache = I.Map<string, Node[]>();
    let currentKids = [];

    lifecycle(result, flattened.reactor(flattened => {
      withRestructurings(() => {
        let [newKids, newCache] = buildKids(nodeCache, flattened);
        nodeCache = newCache;

        let lcs = util.longestCommonSubsequence(currentKids, newKids);

        let i = 0, j = 0;
        lcs.forEach(sharedKid => {
          while (currentKids[i] !== sharedKid) {
            addRemoval(currentKids[i++]);
          }
          i++
          while (newKids[j] !== sharedKid) {
            let kid = newKids[j++];
            addRestructuring(result, kid, sharedKid);
          }
          j++
        });
        while (i < currentKids.length) {
          addRemoval(currentKids[i++]);
        }
        while (j < newKids.length) {
          let kid = newKids[j++];
          addRestructuring(result, kid, null);
        }

        currentKids = newKids;
      })
    }));
  }

  return result;
}

export function root(parent: HTMLElement, child:Node) {
  parent.appendChild(child);
  if (child instanceof HTMLElement) {
    ensureChildState(child);
    child[PARENT].set(parent);
  }
}
