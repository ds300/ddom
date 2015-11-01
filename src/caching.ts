import { Atom, Derivable, Reactor, Lens } from 'derivable'
import * as _ from 'derivable'
import { List, Map } from 'immutable'

// we're gonna use the ids + id2idx pattern a few more times so for brevity...
interface IDStuff<U> {
  ids: Derivable<List<U>>
  id2idx: Derivable<Map<U, number>>
}

function deriveIDStuff<T, U> (uf: (v:T) => U, xs: Derivable<List<T>>): IDStuff<U> {
  const ids: Derivable<List<U>> = xs.derive(xs => xs.map(uf).toList());
  const id2idx: Derivable<Map<U, number>> = ids.derive(ids => {
    let map = Map<U, number>().asMutable();
    ids.forEach((id, idx) => {
      map.set(id, idx);
    });
    return map.asImmutable();
  });
  return {ids, id2idx};
}

function lookup<T, U> (xs: List<T>, id2idx: Map<U, number>, id: U): T {
  return xs.get(id2idx.get(id));
}

function lookupCursor<T, U>(
  id2idx: Derivable<Map<U, number>>,
  id: U
): Lens<List<T>, T> {
  return {
    get (xs: List<T>): T {
      return xs.get(id2idx.get().get(id));
    },
    set (xs: List<T>, value: T): List<T> {
      return xs.set(id2idx.get().get(id), value);
    }
  }
}

const NOT_FOUND = {};

export function ucmap<I, O, U>(
    uf: (i: I) => U,
    f: (i: Derivable<I>, idx?: Derivable<number>) => O,
    xs: Derivable<List<I>>
  ): Derivable<List<O>> {

  let cache: Map<U, O> = Map<U, O>();

  const {ids, id2idx} = deriveIDStuff<I, U>(uf, xs);

  return ids.derive(ids => {
    let newCache = Map<U, O>().asMutable();
    let result = [];

    ids.forEach(id => {
      // allow duplicates
      let value: O = newCache.get(id, <O>NOT_FOUND);
      if (value === NOT_FOUND) {
        value = cache.get(id, <O>NOT_FOUND);
        if (value === NOT_FOUND) {
          var deriv = _.isAtom(xs) ? (<Atom<List<I>>>xs).lens(lookupCursor<I, U>(id2idx, id)) : xs.derive(lookup, id2idx, id);
          var idx = id2idx.derive(id2idx => id2idx.get(id));
          value = f(deriv, idx);
        }
        newCache.set(id, value);
      }
      result.push(value);
    });

    cache = newCache.asImmutable();
    return List(result);
  });
};

const identity = x => x;

export function cmap<I, O>(f: (i: Derivable<I>, idx?: Derivable<number>) => O, xs: Derivable<List<I>>): Derivable<List<O>> {
  return ucmap(identity, f, xs);
}
