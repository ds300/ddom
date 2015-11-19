import { root, React, lifecycle } from '../build/ddom'
import { List } from 'immutable'
import { atom, transaction, Derivable } from 'derivable'

window.addEventListener('load', () => {
  root(document.body, <div>hello world</div>);
});
