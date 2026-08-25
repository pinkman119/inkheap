"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configRegister = void 0;
exports.getConfig = getConfig;
const config_1 = require("@nestjs/config");
const config_base_1 = require("./config.base");
const config_prod_1 = require("./config.prod");
function getConfig() {
    return {
        ...config_base_1.baseConfig,
        ...config_prod_1.prodConfig,
    };
}
exports.configRegister = (0, config_1.registerAs)('app', () => getConfig());
__exportStar(require("./config.interface"), exports);
__exportStar(require("./config.base"), exports);
__exportStar(require("./config.prod"), exports);
//# sourceMappingURL=index.js.map