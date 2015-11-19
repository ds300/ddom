import { root, React, behaviour } from '../build/ddom'
import { List } from 'immutable'
import { atom, transaction, Derivable } from 'derivable'

const $Epoch = atom(1);

const inc = x => x + 1;

const $odd = $Epoch.derive(x => x % 2);

const app = (
  <div behaviour={behaviour.ShowWhen($odd)}>hey world</div>
);

window.addEventListener('load', () => {
  root(document.body, app);
});

window.addEventListener('keydown', () => {
  $Epoch.swap(inc);
})
