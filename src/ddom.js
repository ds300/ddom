var _ = require('derivable');
var I = require('immutable');
var util = require('./util');
var customPropertyHandlers = {
    $class: function (node, val) {
        if (!_.isDerivable(val)) {
            val = _.struct([val]);
        }
        var className = val.derive(util.renderClass);
        lifecycle(node, className.reactor(function (cn) { return node.className = cn; }));
    },
    $style: function (node, styles) {
        for (var _i = 0, _a = Object.keys(styles); _i < _a.length; _i++) {
            var style = _a[_i];
            var val = styles[style];
            if (_.isDerivable(val)) {
                (function (style, val) {
                    lifecycle(node, val.reactor(function (v) { return node.style[style] = v; }));
                })(style, val);
            }
            else {
                node.style[style] = val;
            }
        }
    },
    $show: function (node, val) {
        if (_.isDerivable(val)) {
            val.react(function (x) { return console.log("thing is", x); });
            lifecycle(node, val.reactor(function (v) { return node.style.display = v ? null : 'none'; }));
        }
        else {
            node.style.display = val ? null : 'none';
        }
    },
    $hide: function (node, val) {
        if (_.isDerivable(val)) {
            lifecycle(node, val.reactor(function (v) { return node.style.display = v ? 'none' : null; }));
        }
        else {
            node.style.display = val ? 'none' : null;
        }
    },
};
var IN_DOM = '__ddom__elemInDom';
var PARENT = '__ddom__elemParent';
function ensureChildState(child) {
    if (child && child !== document.body && !child[PARENT]) {
        child[PARENT] = _.atom(ensureChildState(child.parentElement));
        child[IN_DOM] = child[PARENT].derive(function (parent) {
            return parent && (parent === document.body || parent[IN_DOM].get());
        });
    }
    return child;
}
function lifecycle(child, onMount, onUnmount) {
    ensureChildState(child);
    var r;
    if (_.isReactor(onMount)) {
        r = child[IN_DOM].reactor(function (inDom) {
            if (inDom) {
                onMount.start().force();
            }
            else {
                onMount.stop();
            }
        }).start();
    }
    else {
        r = child[IN_DOM].reactor(function (inDom) {
            if (inDom) {
                onMount && onMount();
            }
            else {
                onUnmount && onUnmount();
            }
        }).start();
    }
    if (child[IN_DOM].get()) {
        r.force();
    }
}
exports.lifecycle = lifecycle;
exports.renderable = Symbol('ddom_renderable');
function flattenKids(thing) {
    var result = [];
    function descend(thing) {
        if (_.isDerivable(thing)) {
            descend(thing.get());
        }
        else if (thing instanceof Array) {
            for (var i = 0; i < thing.length; i++) {
                descend(thing[i]);
            }
        }
        else if (thing instanceof I.List) {
            thing.forEach(descend);
        }
        else if (typeof thing === 'string' || thing instanceof String) {
            result.push(thing);
        }
        else if (thing[exports.renderable]) {
            descend(thing[exports.renderable]());
        }
        else if (thing[Symbol.iterator]) {
            for (var _i = 0; _i < thing.length; _i++) {
                var item = thing[_i];
                descend(item);
            }
        }
        else if (thing != null) {
            result.push(thing);
        }
    }
    descend(thing);
    return result;
}
function buildKids(nodeCache, kids) {
    var result = [];
    var newCache = I.Map().asMutable();
    for (var _i = 0; _i < kids.length; _i++) {
        var kid = kids[_i];
        if (kid instanceof Node) {
            result.push(kid);
        }
        else {
            var s = kid.toString();
            var node = void 0;
            var oldNodes = nodeCache.get(s);
            if (oldNodes && oldNodes.length > 0) {
                node = oldNodes.shift();
            }
            if (!node) {
                node = document.createTextNode(s);
            }
            if (!newCache.has(s)) {
                newCache.set(s, [node]);
            }
            else {
                newCache.get(s).push(node);
            }
            result.push(node);
        }
    }
    return [result, newCache.asImmutable()];
}
var _RESTRUCTURINGS_;
var _removals_;
function withRestructurings(f) {
    if (_RESTRUCTURINGS_) {
        f();
    }
    else {
        _RESTRUCTURINGS_ = I.OrderedMap().asMutable();
        _removals_ = I.OrderedSet().asMutable();
        try {
            f();
        }
        finally {
            setTimeout(function () {
                _removals_.forEach(function (kid) {
                    kid.remove();
                    if (kid instanceof HTMLElement) {
                        kid[PARENT].set(null);
                    }
                });
                _RESTRUCTURINGS_.forEach(function (_a, node) {
                    var parent = _a.parent, before = _a.before;
                    parent.insertBefore(node, before);
                    if (node instanceof HTMLElement) {
                        ensureChildState(node);
                        node[PARENT].set(parent);
                    }
                });
                _RESTRUCTURINGS_ = null;
                _removals_ = null;
            }, 0);
        }
    }
}
function addRestructuring(parent, kid, before) {
    if (_RESTRUCTURINGS_.has(kid)) {
        console.error("Node found at more than one location in the DOM: ", kid);
    }
    _RESTRUCTURINGS_.set(kid, { parent: parent, before: before });
}
function addRemoval(kid) {
    _removals_.add(kid);
}
function dom(tagName, props) {
    var children = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        children[_i - 2] = arguments[_i];
    }
    if (typeof tagName !== 'string') {
        throw new Error("domlock only supports regular html tags.");
    }
    var result = document.createElement(tagName);
    if (props) {
        for (var _a = 0, _b = Object.keys(props); _a < _b.length; _a++) {
            var key = _b[_a];
            var val = props[key];
            if (key[0] === '$') {
                var f = customPropertyHandlers[key];
                if (!f) {
                    throw new Error("unrecognized special property: " + key);
                }
                else {
                    f(result, val);
                }
            }
            else {
                if (_.isDerivable(val)) {
                    (function (key, val) {
                        lifecycle(result, val.reactor(function (v) { return result[key] = v; }));
                    })(key, val);
                }
                else {
                    result[key] = val;
                }
            }
        }
    }
    if (children.length) {
        var flattened = _.atom(children).derive(flattenKids);
        var nodeCache = I.Map();
        var currentKids = [];
        lifecycle(result, flattened.reactor(function (flattened) {
            withRestructurings(function () {
                var _a = buildKids(nodeCache, flattened), newKids = _a[0], newCache = _a[1];
                nodeCache = newCache;
                var lcs = util.longestCommonSubsequence(currentKids, newKids);
                var i = 0, j = 0;
                lcs.forEach(function (sharedKid) {
                    while (currentKids[i] !== sharedKid) {
                        addRemoval(currentKids[i++]);
                    }
                    i++;
                    while (newKids[j] !== sharedKid) {
                        var kid = newKids[j++];
                        addRestructuring(result, kid, sharedKid);
                    }
                    j++;
                });
                while (i < currentKids.length) {
                    addRemoval(currentKids[i++]);
                }
                while (j < newKids.length) {
                    var kid = newKids[j++];
                    addRestructuring(result, kid, null);
                }
                currentKids = newKids;
            });
        }));
    }
    return result;
}
exports.dom = dom;
function root(parent, child) {
    parent.appendChild(child);
    if (child instanceof HTMLElement) {
        ensureChildState(child);
        child[PARENT].set(parent);
    }
}
exports.root = root;
