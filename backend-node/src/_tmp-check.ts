import { PrismaClient } from './generated/prisma';

// 临时类型验证文件：确认新生成的 Prisma Client 包含 Blog / BlogCategory 模型。
// 验证完成后可删除本文件。
const p = new PrismaClient();
const _models = [p.article, p.blog, p.blogCategory];
console.log(_models.length);
