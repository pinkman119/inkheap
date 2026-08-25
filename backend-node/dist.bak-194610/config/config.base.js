"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseConfig = void 0;
exports.baseConfig = {
    app: {
        name: 'personal-profile-backend',
        port: 3000,
        env: 'production',
        prefix: '/api',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'inkheap-admin-secret-key-2026',
        expiresIn: '7d',
    },
};
//# sourceMappingURL=config.base.js.map