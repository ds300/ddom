import { root, dom } from '../src/ddom'
import { cmap, ucmap } from '../src/caching'
import { List } from 'immutable'
import { atom, transaction } from 'derivable'

const React = {createElement: dom};

const things = atom(List([1,2,3,4,5]));

const thing = <div $class={things.derive(t => t.size + "balls")}>hello world! {cmap(x => x.derive(x => x * 2), things)} </div>;

window.addEventListener('load', () => root(document.body, thing));

// todo: make sure that a node's children's removals and insertions have been
// processed before
window.addEventListener('keypress', transaction(ev => {
  things.swap(things => things.update(0, x => x + 1));
  if (ev.shiftKey) {
    things.swap(x => x.unshift(1));
  } else if (ev.altKey) {
    things.swap(x => x.shift());
  }
}))
