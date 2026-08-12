import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create default admin user
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

  // Seed categories
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
