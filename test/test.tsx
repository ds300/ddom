import {React, root, behaviour} from '../build/ddom'
import {atom} from '../node_modules/derivable'

const {ShowWhen, BindValue} = behaviour;

const $Time = atom(Date.now());
setInterval(() => $Time.set(Date.now()), 16);

const $seconds = $Time.derive(t => t - (t % 1000));

// blink on/off every quarter second
const blink = ShowWhen($Time.derive(t => Math.round(t/250) % 2 == 0));

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

const $Name = atom("");
const $Bio = atom("");
const $Age = atom(0);
const form = (
  <div>
    <input type='text' behaviour={BindValue($Name)}></input>
    <br />
    <textarea behaviour={BindValue($Bio)}></textarea>
    <br />
    <select behaviour={BindValue($Age)}>
      <option value={1}>1</option>
      <option value={2}>2</option>
      <option value={3}>3</option>
    </select>
  </div>
);
const [$hovering, hover] = behaviour.Hover();
const junk = (
  <div behaviour={hover}>
    <div>the name is {$Name}</div>
    <div>the bio is {$Bio}</div>
    <div>the age is {$Age.derive(a => a + 50)}</div>
    <div behaviour={ShowWhen($hovering)}>hovering yo</div>
  </div>
);

window.addEventListener('load', () => {
  root(document.body, page);
  root(document.body, form);
  root(document.body, junk);
})
