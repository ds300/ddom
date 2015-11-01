var ddom_1 = require('../src/ddom');
var caching_1 = require('../src/caching');
var immutable_1 = require('immutable');
var derivable_1 = require('derivable');
var React = { createElement: ddom_1.dom };
var things = derivable_1.atom(immutable_1.List([1, 2, 3, 4, 5]));
var thing = React.createElement("div", {"$class": things.derive(function (t) { return t.size + "balls"; })}, "hello world! ", caching_1.cmap(function (x) { return x.derive(function (x) { return x * 2; }); }, things), " ");
window.addEventListener('load', function () { return ddom_1.root(document.body, thing); });
window.addEventListener('keypress', derivable_1.transaction(function (ev) {
    things.swap(function (things) { return things.update(0, function (x) { return x + 1; }); });
    if (ev.shiftKey) {
        things.swap(function (x) { return x.unshift(1); });
    }
    else if (ev.altKey) {
        things.swap(function (x) { return x.shift(); });
    }
}));
