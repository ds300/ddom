var _ = require('derivable');
var immutable_1 = require('immutable');
function deriveIDStuff(uf, xs) {
    var ids = xs.derive(function (xs) { return xs.map(uf).toList(); });
    var id2idx = ids.derive(function (ids) {
        var map = immutable_1.Map().asMutable();
        ids.forEach(function (id, idx) {
            map.set(id, idx);
        });
        return map.asImmutable();
    });
    return { ids: ids, id2idx: id2idx };
}
function lookup(xs, id2idx, id) {
    return xs.get(id2idx.get(id));
}
function lookupCursor(id2idx, id) {
    return {
        get: function (xs) {
            return xs.get(id2idx.get().get(id));
        },
        set: function (xs, value) {
            return xs.set(id2idx.get().get(id), value);
        }
    };
}
var NOT_FOUND = [];
function ucmap(uf, f, xs) {
    var cache = immutable_1.Map();
    var _a = deriveIDStuff(uf, xs), ids = _a.ids, id2idx = _a.id2idx;
    return ids.derive(function (ids) {
        var newCache = immutable_1.Map().asMutable();
        var result = [];
        ids.forEach(function (id) {
            var existing = cache.get(id);
            var value;
            if (existing != null && existing.length > 0) {
                value = existing.shift();
            }
            else {
                var deriv = _.isAtom(xs) ? xs.lens(lookupCursor(id2idx, id)) : xs.derive(lookup, id2idx, id);
                var idx = id2idx.derive(function (id2idx) { return id2idx.get(id); });
                value = f(deriv, idx);
            }
            result.push(value);
            var newItems = newCache.get(id);
            if (newItems) {
                newItems.push(value);
            }
            else {
                newCache.set(id, [value]);
            }
        });
        cache = newCache.asImmutable();
        return immutable_1.List(result);
    });
}
exports.ucmap = ucmap;
;
var identity = function (x) { return x; };
function cmap(f, xs) {
    return ucmap(identity, f, xs);
}
exports.cmap = cmap;
