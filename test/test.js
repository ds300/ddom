var ddom_1 = require('../build/ddom');
var derivable_1 = require('derivable');
var $Epoch = derivable_1.atom(1);
var inc = function (x) { return x + 1; };
var $odd = $Epoch.derive(function (x) { return x % 2; });
var app = (ddom_1.React.createElement("div", {"behaviour": ddom_1.behaviour.ShowWhen($odd)}, "hey world"));
window.addEventListener('load', function () {
    ddom_1.root(document.body, app);
});
window.addEventListener('keydown', function () {
    $Epoch.swap(inc);
});
