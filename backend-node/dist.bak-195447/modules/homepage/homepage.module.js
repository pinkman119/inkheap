"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomePageModule = void 0;
const common_1 = require("@nestjs/common");
const homepage_service_1 = require("./homepage.service");
const homepage_controller_1 = require("./homepage.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const upload_module_1 = require("../upload/upload.module");
let HomePageModule = class HomePageModule {
};
exports.HomePageModule = HomePageModule;
exports.HomePageModule = HomePageModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, upload_module_1.UploadModule],
        controllers: [homepage_controller_1.HomePagePublicController, homepage_controller_1.HomePageAdminController],
        providers: [homepage_service_1.HomePageService],
        exports: [homepage_service_1.HomePageService],
    })
], HomePageModule);
//# sourceMappingURL=homepage.module.js.map