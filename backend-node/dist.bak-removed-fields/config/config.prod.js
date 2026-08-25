"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prodConfig = void 0;
exports.prodConfig = {
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'personal_profile',
    },
    jwt: {
        secret: process.env.JWT_SECRET || '',
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
};
//# sourceMappingURL=config.prod.js.map