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

  // Seed sample published articles
  const articles = [
    {
      title: 'Vue 3 组合式 API 实战指南',
      summary: '从 setup 到响应式系统，深入讲解 Composition API 的核心理念与最佳实践。',
      content: 'Vue 3 带来的 Composition API 彻底改变了组件的书写方式……',
      coverImage: 'https://picsum.photos/seed/vue3/600/400',
      categoryKey: 'frontend/vue',
      tags: ['Vue', '前端', '教程'],
      author: '墨堆',
      published: true,
      featured: true,
    },
    {
      title: 'React Hooks 常见陷阱与优化',
      summary: 'useEffect 依赖、闭包陷阱、重渲染优化，一篇讲透 React Hooks 的注意事项。',
      content: 'Hooks 让函数组件拥有状态，但也带来新的心智负担……',
      coverImage: 'https://picsum.photos/seed/react/600/400',
      categoryKey: 'frontend/react',
      tags: ['React', '前端'],
      author: '墨堆',
      published: true,
      featured: false,
    },
    {
      title: '用 Node.js 构建高性能 API 服务',
      summary: '从事件循环到连接池，聊聊如何用 Node.js 写出稳定可扩展的后端服务。',
      content: 'Node.js 的单线程事件循环模型适合 I/O 密集型场景……',
      coverImage: 'https://picsum.photos/seed/nodejs/600/400',
      categoryKey: 'backend/node',
      tags: ['Node.js', '后端'],
      author: '墨堆',
      published: true,
      featured: false,
    },
    {
      title: 'Java 后端工程化实践',
      summary: 'Spring Boot、容器化与 CI/CD，梳理一套现代 Java 服务项目结构。',
      content: 'Java 在企业级后端依然占据主导地位……',
      coverImage: 'https://picsum.photos/seed/java/600/400',
      categoryKey: 'backend/java',
      tags: ['Java', '后端'],
      author: '墨堆',
      published: true,
      featured: false,
    },
    {
      title: '区块链基础：从哈希到共识',
      summary: '用通俗语言拆解区块链的底层结构，理解去中心化是如何实现的。',
      content: '区块链本质上是一个 append-only 的分布式账本……',
      coverImage: 'https://picsum.photos/seed/blockchain/600/400',
      categoryKey: 'blockchain',
      tags: ['区块链', '科普'],
      author: '墨堆',
      published: true,
      featured: false,
    },
    {
      title: '大模型应用入门：RAG 检索增强生成',
      summary: '把私有知识库接入大模型，RAG 是当前最落地的 AI 应用范式之一。',
      content: 'RAG 通过检索外部知识来补充模型的参数化记忆……',
      coverImage: 'https://picsum.photos/seed/ai/600/400',
      categoryKey: 'ai',
      tags: ['AI', 'LLM'],
      author: '墨堆',
      published: true,
      featured: true,
    },
  ];

  for (const a of articles) {
    const slug = a.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-|-$/g, '');
    await prisma.article.upsert({
      where: { slug },
      update: { published: true },
      create: {
        ...a,
        slug,
        tags: JSON.stringify(a.tags),
        viewCount: Math.floor(Math.random() * 2000) + 200,
      },
    });
  }

  console.log(`Articles seeded: ${articles.length} published articles`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
