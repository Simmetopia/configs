"use strict";
exports.__esModule = true;
var render_voyager_page_1 = require("./render-voyager-page");
function expressMiddleware(options) {
    return function (_req, res) {
        res.setHeader('Content-Type', 'text/html');
        res.write(render_voyager_page_1["default"](options));
        res.end();
    };
}
exports["default"] = expressMiddleware;
