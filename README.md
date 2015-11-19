# DDOM is Derivable DOM
Virtual DOM with less of the virtual

DOM structure (parent/child relationships only) is treated the same way as in React, with diffing and patching.

Dynamic HTMLElement properties, on the other hand, are bound (one-way!) to the nodes themselves.

This is all achieved using [Derivables](https://github.com/ds300/derivablejs) which enforces immutability and consistency in the state layer so we still avoid (most of?) the problems that React solves, but without (most of?) the additional problems it creates (e.g. inability to re-parent nodes). Whether or not new problems are created remains to be seen, but I am optimistic!

Composable custom behaviour based on Derivables is simple to implement and simple to apply.

toy example:

```javascript
import {React, root, behaviour} from 'ddom'
import {atom} from 'derivable'

const $Time = atom(+new Date());
setInterval(() => $Time.set(+new Date()), 16);

const $seconds = $Time.derive(t => t - (t % 1000));

// blink on/off every quarter second
const blink = behaviour.ShowWhen($Time.derive(t => Math.round(t/250) % 2 == 0));

// custom behaviour
function TranslateX ($amount) {
  return node => $amount.reactor(x => {
    node.style.transform = `translateX(${x})`;
  });
}

const wobble = TranslateX(
  $Time.derive(t => (Math.sin(t / 300) * 40) + "px")
);

// this is an ordinary HTMLElement
const page = (
  <div behaviour={[blink, wobble]}>
    The time is now {$seconds.derive(t => new Date(t).toString())}
  </div>
);

window.addEventListener('load', () => {
  root(document.body, page);
})
```

So this updates the displayed time every second, shows/hides the div every quarter
second, and wobbles about a bit, all just by updating the `time` atom.

[have a look](https://ds300.github.com/ddom/test/)
