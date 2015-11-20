var ddom_1 = require('../build/ddom');
var derivable_1 = require('../node_modules/derivable');
var ShowWhen = ddom_1.behaviour.ShowWhen, BindValue = ddom_1.behaviour.BindValue;
var $Time = derivable_1.atom(Date.now());
setInterval(function () { return $Time.set(Date.now()); }, 16);
var $seconds = $Time.derive(function (t) { return t - (t % 1000); });
var blink = ShowWhen($Time.derive(function (t) { return Math.round(t / 250) % 2 == 0; }));
function TranslateX($amount) {
    return function (node) { return $amount.reactor(function (x) {
        node.style.transform = "translateX(" + x + ")";
    }); };
}
var wobble = TranslateX($Time.derive(function (t) { return (Math.sin(t / 300) * 40) + "px"; }));
var page = (ddom_1.React.createElement("div", {"behaviour": [blink, wobble]}, "The time is now ", $seconds.derive(function (t) { return new Date(t).toString(); })));
var $Name = derivable_1.atom("");
var $Bio = derivable_1.atom("");
var $Age = derivable_1.atom(0);
var form = (ddom_1.React.createElement("div", null, ddom_1.React.createElement("input", {"type": 'text', "behaviour": BindValue($Name)}), ddom_1.React.createElement("br", null), ddom_1.React.createElement("textarea", {"behaviour": BindValue($Bio)}), ddom_1.React.createElement("br", null), ddom_1.React.createElement("select", {"behaviour": BindValue($Age)}, ddom_1.React.createElement("option", {"value": 1}, "1"), ddom_1.React.createElement("option", {"value": 2}, "2"), ddom_1.React.createElement("option", {"value": 3}, "3"))));
var _a = ddom_1.behaviour.Hover(), $hovering = _a[0], hover = _a[1];
var junk = (ddom_1.React.createElement("div", {"behaviour": hover}, ddom_1.React.createElement("div", null, "the name is ", $Name), ddom_1.React.createElement("div", null, "the bio is ", $Bio), ddom_1.React.createElement("div", null, "the age is ", $Age.derive(function (a) { return a + 50; })), ddom_1.React.createElement("div", {"behaviour": ShowWhen($hovering)}, "hovering yo")));
window.addEventListener('load', function () {
    ddom_1.root(document.body, page);
    ddom_1.root(document.body, form);
    ddom_1.root(document.body, junk);
});
