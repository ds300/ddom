import { root, dom, lifecycle } from '../src/ddom'
import { cmap, ucmap } from '../src/caching'
import { List } from 'immutable'
import { atom, transaction, Derivable } from 'derivable'

const React = {createElement: dom};

const things = atom(List([1,2]));

const time = atom(+new Date());
setInterval(() => time.set(+new Date()), 50);

const seconds = time.derive(t => t - (t % 1000));

// blink on/off every quarter second
const blink = time.derive(t => Math.round(t/250) % 2 == 0);

function renderNumber(n: Derivable<number>, i: Derivable<number>) {
  const even = i.derive(i => i % 2 == 0);
  const color = even.then(blink, true).then('black', 'white');
  return <span>{n.derive(n => n * 2)}</span>;
}

const thing = <div>{cmap(renderNumber, things)}</div>;

window.addEventListener('keypress', transaction(ev => {
  things.swap(things => things.size ? things.update(0, x => x + 1) : things);
  if (ev.shiftKey) {
    console.log("shibnitsz");
    things.swap(x => x.unshift(1));
  } else if (ev.altKey) {
    console.log("flatularnce");
    things.swap(x => x.shift());
  }
}));



// this is an ordinary HTMLElement
const page = (
  <div>
    The time is now {seconds.derive(t => new Date(t).toString())}
    { thing }
  </div>
);

window.addEventListener('load', () => {
  root(document.body, thing);
})
