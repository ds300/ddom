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
var KIDS = '__ddom__kids';
var CURRENT_KIDS = '__ddom__current__kids';
var TREE = '__ddom__tree';
var CURRENT_SUBTREE = '__ddom__current__subtree';
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
function buildKidNodes(nodeCache, kids) {
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
function remove(kid) {
    kid.remove();
    if (kid instanceof HTMLElement) {
        kid[PARENT].set(null);
    }
}
function insert(parent, node, before) {
    parent.insertBefore(node, before);
    if (node instanceof HTMLElement) {
        ensureChildState(node);
        node[PARENT].set(parent);
    }
}
function buildTree(nodes) {
    var result = [];
    for (var i = 0, len = nodes.length; i < len; i++) {
        var node = nodes[i];
        if (node instanceof HTMLElement && node[TREE]) {
            result.push(node[TREE].get());
        }
        else {
            result.push(node);
        }
    }
    return result;
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
        var textNodeCache = I.Map();
        result[KIDS] = _.derivation(function () { return flattenKids(children); }).derive(function (items) {
            var _a = buildKidNodes(textNodeCache, items), nodes = _a[0], newCache = _a[1];
            textNodeCache = newCache;
            return nodes;
        });
        result[CURRENT_KIDS] = [];
        result[TREE] = result[KIDS].derive(function (kids) { return [result, kids, buildTree(kids)]; });
        result[CURRENT_SUBTREE] = [];
    }
    return result;
}
exports.dom = dom;
function processTree(tree) {
    if (tree instanceof Array) {
        var node = tree[0], newKids = tree[1], subTree = tree[2];
        var currentKids = node[CURRENT_KIDS];
        if (newKids !== currentKids) {
            var text = function (x) { return x.textContent; };
            var lcs = util.longestCommonSubsequence(currentKids, newKids);
            var x = 0;
            currentKids.forEach(function (ck) {
                if (ck !== lcs[x]) {
                    remove(ck);
                }
                else {
                    x++;
                }
            });
            x = 0;
            newKids.forEach(function (nk) {
                if (nk !== lcs[x]) {
                    insert(node, nk, lcs[x]);
                }
                else {
                    x++;
                }
            });
            node[CURRENT_KIDS] = newKids;
        }
        var currentSubTree = node[CURRENT_SUBTREE];
        if (currentSubTree !== subTree) {
            subTree.forEach(processTree);
            node[CURRENT_SUBTREE] = subTree;
        }
    }
}
function root(parent, child) {
    parent.appendChild(child);
    if (child instanceof HTMLElement) {
        ensureChildState(child);
        child[PARENT].set(parent);
        var tree = child[TREE];
        if (tree) {
            tree.react(_.transaction(function (tree) {
                processTree(tree);
            }));
        }
    }
}
exports.root = root;
