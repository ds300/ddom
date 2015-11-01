import { List, Map, OrderedSet } from 'immutable'
import { Atom, Derivable, isAtom, Lens } from 'derivable'

function populateMatrix(a: any[], b: any[]): number[][] {
  let matrix = [];

  for (let i = 0; i < b.length; i++) {
    let row = [];
    for (let j = 0; j < a.length; j++) {
      let rowPrev = row[j - 1] || 0;
      let colPrev = i > 0 ? matrix[i-1][j] : 0;
      let best = Math.max(rowPrev, colPrev) + (a[j] === b[i] ? 1 : 0);

      row[j] = best;
    }
    matrix.push(row);
  }

  return matrix;
}

function backtrack(result: any[], matrix: number[][], a: any[], b: any[], i: number, j: number) {
  if (i === -1 || j === -1) {
    return;
  } else if (a[j] === b[i]) {
    result.unshift(a[j]);
    backtrack(result, matrix, a, b, i-1, j-1);
  } else if ((i > 0 ? matrix[i-1][j] : 0) > (j > 0 ? matrix[i][j-1] : 0)){
    backtrack(result, matrix, a, b, i-1, j);
  } else {
    backtrack(result, matrix, a, b, i, j-1);
  }
}

export function longestCommonSubsequence(a: any[], b: any[]): any[] {
  let result = [];
  backtrack(result, populateMatrix(a, b), a, b, b.length - 1, a.length - 1);
  return result;
}

export function renderClass(obj: any) {
  if (obj instanceof Array) {
    return obj.map(renderClass).join(" ");
  } else if (typeof obj === 'string' || obj instanceof String) {
    return obj;
  } else if (obj instanceof Map) {
    return (<Map<any, boolean>>obj).map((v, k) => v ? renderClass(k) : "").join(" ");
  } else {
    let result = "";
    for (let k of Object.keys(obj)) {
      if (obj[k]) {
        result += " " + k;
      }
    }
    return result.slice(1);
  }
}

export function entries<K, V>(obj: Map<K, V>): List<[K, V]>;
export function entries(obj: any): List<[string, any]> {
  if (obj instanceof Map) {
    return obj.entrySeq().toList();
  } else {
    let ks = Object.keys(obj);
    return List(<[string, any][]>ks.map(k => [k, obj[k]]));
  }
}
