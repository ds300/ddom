var ddom_1 = require('../build/ddom');
window.addEventListener('load', function () {
    ddom_1.root(document.body, ddom_1.React.createElement("div", null, "hello world"));
});
