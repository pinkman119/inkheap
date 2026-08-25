"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ProxyController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyController = void 0;
const common_1 = require("@nestjs/common");
let ProxyController = ProxyController_1 = class ProxyController {
    logger = new common_1.Logger(ProxyController_1.name);
    async image(url, res) {
        if (!url || typeof url !== 'string') {
            throw new common_1.BadRequestException('url required');
        }
        let target;
        try {
            target = new URL(url);
        }
        catch {
            throw new common_1.BadRequestException('invalid url');
        }
        if (target.protocol !== 'http:' && target.protocol !== 'https:') {
            throw new common_1.BadRequestException('unsupported protocol');
        }
        try {
            const upstream = await fetch(target.toString(), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; InkHeapBot/1.0; +https://inkheap.local)',
                    Accept: 'image/*,*/*',
                    Referer: target.origin + '/',
                },
            });
            if (!upstream.ok) {
                res.status(upstream.status).end();
                return;
            }
            const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=2592000');
            res.setHeader('Access-Control-Allow-Origin', '*');
            const body = upstream.body;
            if (body && typeof body.pipe === 'function') {
                body.pipe(res);
            }
            else {
                const buf = Buffer.from(await upstream.arrayBuffer());
                res.end(buf);
            }
        }
        catch (err) {
            this.logger.error(`proxy image failed: ${target.toString()}`, err);
            if (!res.headersSent)
                res.status(502).end();
        }
    }
};
exports.ProxyController = ProxyController;
__decorate([
    (0, common_1.Get)('image'),
    __param(0, (0, common_1.Query)('url')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProxyController.prototype, "image", null);
exports.ProxyController = ProxyController = ProxyController_1 = __decorate([
    (0, common_1.Controller)('proxy')
], ProxyController);
//# sourceMappingURL=proxy.controller.js.map