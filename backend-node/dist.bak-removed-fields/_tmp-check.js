"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./generated/prisma");
const p = new prisma_1.PrismaClient();
const _models = [p.article, p.blog, p.blogCategory];
console.log(_models.length);
//# sourceMappingURL=_tmp-check.js.map