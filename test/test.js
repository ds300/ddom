var ddom_1 = require('../src/ddom');
var caching_1 = require('../src/caching');
var immutable_1 = require('immutable');
var derivable_1 = require('derivable');
var React = { createElement: ddom_1.dom };
var things = derivable_1.atom(immutable_1.List([1, 2]));
var time = derivable_1.atom(+new Date());
setInterval(function () { return time.set(+new Date()); }, 50);
var seconds = time.derive(function (t) { return t - (t % 1000); });
var blink = time.derive(function (t) { return Math.round(t / 250) % 2 == 0; });
function renderNumber(n, i) {
    var even = i.derive(function (i) { return i % 2 == 0; });
    var color = even.then(blink, true).then('black', 'white');
    return React.createElement("span", null, n.derive(function (n) { return n * 2; }));
}
var thing = React.createElement("div", null, caching_1.cmap(renderNumber, things));
window.addEventListener('keypress', derivable_1.transaction(function (ev) {
    things.swap(function (things) { return things.size ? things.update(0, function (x) { return x + 1; }) : things; });
    if (ev.shiftKey) {
        console.log("shibnitsz");
        things.swap(function (x) { return x.unshift(1); });
    }
    else if (ev.altKey) {
        console.log("flatularnce");
        things.swap(function (x) { return x.shift(); });
    }
}));
var page = (React.createElement("div", null, "The time is now ", seconds.derive(function (t) { return new Date(t).toString(); }), thing));
window.addEventListener('load', function () {
    ddom_1.root(document.body, thing);
});
