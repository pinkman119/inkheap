"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.XiaojiModule = void 0;
const common_1 = require("@nestjs/common");
const xiaoji_controller_1 = require("./xiaoji.controller");
const xiaoji_admin_controller_1 = require("./xiaoji-admin.controller");
const xiaoji_service_1 = require("./xiaoji.service");
let XiaojiModule = class XiaojiModule {
};
exports.XiaojiModule = XiaojiModule;
exports.XiaojiModule = XiaojiModule = __decorate([
    (0, common_1.Module)({
        controllers: [xiaoji_controller_1.XiaojiController, xiaoji_admin_controller_1.AdminXiaojiController],
        providers: [xiaoji_service_1.XiaojiService],
        exports: [xiaoji_service_1.XiaojiService],
    })
], XiaojiModule);
//# sourceMappingURL=xiaoji.module.js.map