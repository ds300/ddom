var derivable_1 = require('derivable');
function populateMatrix(a, b) {
    var matrix = [];
    for (var i = 0; i < b.length; i++) {
        var row = [];
        for (var j = 0; j < a.length; j++) {
            var rowPrev = row[j - 1] || 0;
            var colPrev = i > 0 ? matrix[i - 1][j] : 0;
            var best = Math.max(rowPrev, colPrev) + (a[j] === b[i] ? 1 : 0);
            row[j] = best;
        }
        matrix.push(row);
    }
    return matrix;
}
function backtrack(result, matrix, a, b, i, j) {
    if (i === -1 || j === -1) {
        return;
    }
    else if (a[j] === b[i]) {
        result.unshift(a[j]);
        backtrack(result, matrix, a, b, i - 1, j - 1);
    }
    else if ((i > 0 ? matrix[i - 1][j] : 0) > (j > 0 ? matrix[i][j - 1] : 0)) {
        backtrack(result, matrix, a, b, i - 1, j);
    }
    else {
        backtrack(result, matrix, a, b, i, j - 1);
    }
}
function longestCommonSubsequence(a, b) {
    var result = [];
    backtrack(result, populateMatrix(a, b), a, b, b.length - 1, a.length - 1);
    return result;
}
exports.longestCommonSubsequence = longestCommonSubsequence;
function renderClass(obj) {
    if (obj instanceof Array) {
        return obj.map(renderClass).join(" ");
    }
    else if (typeof obj === 'string' || obj instanceof String) {
        return obj;
    }
    else {
        var result = "";
        for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
            var k = _a[_i];
            if (obj[k]) {
                result += " " + k;
            }
        }
        return result.slice(1);
    }
}
exports.renderClass = renderClass;
function entries(obj) {
    var ks = Object.keys(obj);
    return ks.map(function (k) { return [k, obj[k]]; });
}
exports.entries = entries;
function deepDeref(obj) {
    if (derivable_1.isDerivable(obj)) {
        return deepDeref(obj.get());
    }
    else if (obj instanceof Array) {
        return obj.map(deepDeref);
    }
    else if (obj.constructor === Object) {
        var result = {};
        Object.keys(obj).forEach(function (k) {
            result[k] = deepDeref(obj[k]);
        });
        return result;
    }
    else {
        return obj;
    }
}
exports.deepDeref = deepDeref;
