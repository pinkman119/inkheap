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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../src/generated/prisma");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new prisma_1.PrismaClient();
async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.adminUser.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
        },
    });
    console.log('Admin user seeded: admin / admin123');
    const categories = [
        { key: 'frontend', name: '前端开发', sortOrder: 1, icon: 'code' },
        { key: 'frontend/vue', name: 'Vue.js', parentKey: 'frontend', sortOrder: 1 },
        { key: 'frontend/react', name: 'React', parentKey: 'frontend', sortOrder: 2 },
        { key: 'backend', name: '后端开发', sortOrder: 2, icon: 'server' },
        { key: 'backend/node', name: 'Node.js', parentKey: 'backend', sortOrder: 1 },
        { key: 'backend/java', name: 'Java', parentKey: 'backend', sortOrder: 2 },
        { key: 'blockchain', name: '区块链', sortOrder: 3, icon: 'link' },
        { key: 'ai', name: 'AI & 机器学习', sortOrder: 4, icon: 'brain' },
    ];
    for (const cat of categories) {
        await prisma.category.upsert({
            where: { key: cat.key },
            update: {},
            create: cat,
        });
    }
    console.log('Categories seeded: 8 categories');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map