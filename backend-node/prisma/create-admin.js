/**
 * 创建 / 更新后台管理员账号（AdminUser，密码 bcrypt 哈希）。
 *
 * 用法：
 *   node prisma/create-admin.js <username> <password> [role]
 *
 * 示例：
 *   node prisma/create-admin.js dba 'MyStrongPass123' admin
 *
 * 说明：
 * - 用户名已存在时视为「重置密码/角色」，覆盖更新
 * - role 目前后台不做细分权限校验，默认 admin（所有账号可登录后台全部功能）
 * - 生产容器内执行时读取容器 env DATABASE_URL，直连生产库
 */
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const [username, password, role] = process.argv.slice(2);

  if (!username || !password) {
    console.error('用法: node prisma/create-admin.js <username> <password> [role=admin]');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('错误: 密码至少 6 位');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.adminUser.upsert({
      where: { username },
      update: { password: hash, role: role || 'admin' },
      create: { username, password: hash, role: role || 'admin' },
    });
    console.log(`管理员已保存: ${user.username} (role=${user.role})`);
    console.log('现在可以用该账号在 #/admin/login 登录后台。');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('执行失败:', e.message);
  process.exit(1);
});
