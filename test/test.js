var ddom_1 = require('ddom');
var derivable_1 = require('derivable');
var $Time = derivable_1.atom(+new Date());
setInterval(function () { return $Time.set(+new Date()); }, 16);
var $seconds = $Time.derive(function (t) { return t - (t % 1000); });
var blink = ddom_1.behaviour.ShowWhen($Time.derive(function (t) { return Math.round(t / 250) % 2 == 0; }));
function TranslateX($amount) {
    return function (node) { return $amount.reactor(function (x) {
        node.style.transform = "translateX(" + x + ")";
    }); };
}
var wobble = TranslateX($Time.derive(function (t) { return (Math.sin(t / 300) * 40) + "px"; }));
var page = (ddom_1.React.createElement("div", {"behaviour": [blink, wobble]}, "The time is now ", $seconds.derive(function (t) { return new Date(t).toString(); })));
window.addEventListener('load', function () {
    ddom_1.root(document.body, page);
});
