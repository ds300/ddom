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
