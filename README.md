# DDOM is Derivable DOM structure

Virtual DOM is an excellent idea. Immutable state really simplifies things.

But why force the immutability and diffing onto the DOM? It wasn't designed for
that, and we have ugly problems trying to reconcile that fact with our desire
for all the joy and simplicity of immutable data.

But it turns out pushing the immutability and diffing into the application state
layer makes *absolutely perfect sense*. Then we don't need virtual DOM. We can
just write clever tools that know how to translate our state directly into optimal
DOM updates, but without getting in our way when we need to get down and dirty
with the beastly Object-Orientedness of the DOM.

[DerivableJS](https://github.com/ds300/derivablejs) lets us do the whole immutable
application state thing with unsurpassed elegance, while DDOM knows how to turn
Derivables into DOM updates with maximal efficiency. Voila!

There is a lot more work to do before this becomes user-friendly. In particular
the api around dealing with collections is a little bit frightening, but nothing
a few wrappers couldn't sort out.

Example (with babel):

```javascript
import {dom, root} from 'ddom'
import {atom} from 'derivable'
// @jsx dom

const time = atom(+new Date());
setInterval(() => time.set(+new Date()), 50);

const seconds = time.derive(t => t - (t % 1000));

// blink on/off every quarter second
const blink = time.derive(t => Math.round(t/250) % 2 == 0);

// this is an ordinary HTMLElement
const page = (
  <div $show={blink}>
    The time is now {seconds.derive(t => new Date(t).toString())}
  </div>
);

window.addEventListener('load', () => {
  root(document.body, page);
})
```

So this updates the displayed time every second, and shows/hides the div every quarter
second, just by updating the `time` atom.
