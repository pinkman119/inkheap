import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_RESUME_CONTENT, DEFAULT_RESUME_NAME } from '../src/modules/resume/resume.defaults';
import { DEFAULT_PERSONA_CONTENT } from '../src/modules/digitallife/digital-life.defaults';
import { xiaojiSeeds } from './xiaoji-seed-data';

const prisma = new PrismaClient();

const UPLOAD_ROOT = join(process.cwd(), 'files');

/** 生成 slug（与后端 buildUniqueSlug 的清洗规则一致） */
function buildSlug(base: string): string {
  return String(base || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-|-$/g, '') || 'xiaoji';
}

/**
 * 将 picsum 占位图下载落盘到 files/<date>/<seed>.jpg，
 * 返回可访问 URL（/files/...）；下载失败时回退外链，保证 seed 幂等不中断。
 */
async function downloadToFile(seed: string, dateDir: string): Promise<string> {
  const filename = `${seed}.jpg`;
  const relativePath = `${dateDir}/${filename}`;
  const absPath = join(UPLOAD_ROOT, relativePath);
  if (existsSync(absPath)) {
    return `/files/${relativePath}`;
  }

  const url = `https://picsum.photos/seed/${seed}/800/600`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    mkdirSync(join(UPLOAD_ROOT, dateDir), { recursive: true });
    writeFileSync(absPath, buffer);
    return `/files/${relativePath}`;
  } catch {
    // 网络不可用等场景下回退外链，保证 seed 始终可跑
    return url;
  }
}

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

  // Seed xiaoji (Blog) categories: 按名称复用/新建分类
  for (const item of xiaojiSeeds) {
    for (const name of item.tags) {
      await prisma.blogCategory.upsert({
        where: { key: name },
        update: {},
        create: { key: name, name },
      });
    }
  }

  // Seed xiaoji (Blog) entries: 照片下载落盘，正文为 markdown
  for (const item of xiaojiSeeds) {
    const slug = buildSlug(item.title);
    const photos: { url: string; caption?: string }[] = [];
    for (const p of item.photos || []) {
      const url = await downloadToFile(p.s, item.date);
      photos.push({ url, caption: p.c });
    }

    await prisma.blog.upsert({
      where: { slug },
      update: { published: true },
      create: {
        slug,
        title: item.title,
        type: item.type,
        tags: JSON.stringify(item.tags),
        content: item.body,
        summary: item.excerpt,
        quote: item.quote ?? null,
        location: item.location || null,
        date: item.date,
        photos: JSON.stringify(photos),
        published: true,
        viewCount: Math.floor(Math.random() * 800) + 100,
      },
    });
  }

  console.log(`Xiaoji seeded: ${xiaojiSeeds.length} blogs`);

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

  // Seed default resume version (create only if none exists; keep existing records)
  const resumeCount = await prisma.resume.count();
  if (resumeCount === 0) {
    await prisma.resume.create({
      data: {
        name: DEFAULT_RESUME_NAME,
        content: JSON.stringify(DEFAULT_RESUME_CONTENT),
        isActive: true,
      },
    });
    console.log('Resume seeded: 1 active default version');
  } else {
    console.log(`Resume skipped: ${resumeCount} version(s) already exist`);
  }

  // ==================== 关于我 seed ====================
  // 个人资料（单条全局，id 固定 "about"）
  await prisma.aboutProfile.upsert({
    where: { id: 'about' },
    update: {},
    create: {
      id: 'about',
      kicker: 'About Me',
      lede: 'AI 全栈工程师 · 摄影师 · 登山者。在代码与山野之间，试着把生活过成可被检索、可被对话的样子。',
      evaluationQuote:
        '我不算聪明，只是比多数人更愿意把一件事做到底。代码、登山、摄影都一样——耐心比天赋更有用。我习惯把经历留下来，因为记忆会骗人，文字和影像不会。',
      evaluationBy: '—— 慕士塔格猫，写给自己',
    },
  });
  console.log('AboutProfile seeded');

  // 年轮
  const rings = [
    { year: '2015', title: '初遇代码', desc: '大学开始写 Python，做出第一个能跑的爬虫。那一刻发现：逻辑可以替人干活，挺迷人的。', sortOrder: 0 },
    { year: '2015', title: '参加竞赛', desc: '蓝桥杯拿到国奖，第一次知道"把想法跑成程序"能换来实实在在的认可。', sortOrder: 1 },
    { year: '2018', title: '转做 AI 全栈', desc: '进入一支做推荐系统的团队，从特征工程到线上服务一手包办，第一次理解"系统"二字的分量。', sortOrder: 2 },
    { year: '2020', title: '登山启蒙', desc: '第一次进高原，爬上四姑娘山。高原反应很诚实，银河也很诚实——城市里没有这种坦诚。', sortOrder: 3 },
    { year: '2022', title: '登顶慕士塔格', desc: '7546 米，雪线之上风把人吹得很轻。在海拔几千米的地方，人会重新想清楚什么重要。', sortOrder: 4 },
    { year: '2024', title: '墨堆 · 数字生命', desc: '开始把文章、笔记与作品沉淀成一个可对话的"数字我"——用设计记录思考，用检索留住经历。', sortOrder: 5 },
  ];
  for (const r of rings) {
    const existing = await prisma.aboutRing.findFirst({ where: { year: r.year, title: r.title } });
    if (existing) {
      await prisma.aboutRing.update({ where: { id: existing.id }, data: r });
    } else {
      await prisma.aboutRing.create({ data: r });
    }
  }
  console.log(`AboutRings seeded: ${rings.length} items`);

  // 足迹
  const footprints = [
    { province: '新疆维吾尔自治区', place: '慕士塔格峰', time: '2022', location: '新疆 · 喀什地区 · 阿克陶县', elevation: '7546 m', note: '雪线之上，风把人吹得很轻。下撤那天，我才真正学会“慢”。', sortOrder: 0 },
    { province: '四川省', place: '四姑娘山', time: '2020', location: '四川 · 阿坝州 · 小金县', elevation: '5025 m', note: '第一次高原反应，也第一次在帐篷外看见横贯天际的银河。', sortOrder: 1 },
    { province: '云南省', place: '雨崩', time: '2019', location: '云南 · 迪庆州 · 德钦县', elevation: '约 3000 m', note: '徒步进神瀑，走了很久。有些地方，开车到不了，只能走着靠近。', sortOrder: 2 },
    { province: '贵州省', place: '黔东南', time: '2021', location: '贵州 · 黔东南苗族侗族自治州', elevation: '—', note: '苗寨的酒和歌，比城市里的人诚实。一晚敬天地，一晚敬朋友。', sortOrder: 3 },
    { province: '广东省', place: '深圳·东西冲', time: '2026.8', location: '广东 · 深圳', elevation: '—', note: '海岸线徒步，一边是大鹏湾，一边是礁石与浪。', sortOrder: 4 },
  ];
  for (const f of footprints) {
    const existing = await prisma.aboutFootprint.findFirst({ where: { province: f.province, place: f.place } });
    if (existing) {
      await prisma.aboutFootprint.update({ where: { id: existing.id }, data: f });
    } else {
      await prisma.aboutFootprint.create({ data: f });
    }
  }
  console.log(`AboutFootprints seeded: ${footprints.length} items`);

  // 旅行卡片
  const travels = [
    { glyph: 'MT. Muztagh Ata', place: '慕士塔格峰', meta: '新疆 · 2022 · 7546m', note: '雪线之上，风把人吹得很轻。下撤那天，我才真正学会"慢"。', sortOrder: 0 },
    { glyph: 'Siguniang', place: '四姑娘山', meta: '四川 · 2020 · 5025m', note: '第一次高原反应，也第一次在帐篷外看见横贯天际的银河。', sortOrder: 1 },
    { glyph: 'Yubeng', place: '雨崩', meta: '云南 · 2019', note: '徒步进神瀑，走了很久。有些地方，开车到不了，只能走着靠近。', sortOrder: 2 },
    { glyph: 'Iceland', place: '冰岛', meta: '欧洲 · 2023', note: '极光下面泡温泉，世界安静得只剩风声和自己的呼吸。', sortOrder: 3 },
    { glyph: 'SE Guizhou', place: '黔东南', meta: '贵州 · 2021', note: '苗寨的酒和歌，比城市里的人诚实。一晚敬天地，一晚敬朋友。', sortOrder: 4 },
    { glyph: 'Coming Soon', place: '下一座山', meta: '未定 · 计划中', note: '想试试更长的线。先把身体和心态都准备好，再出发。', sortOrder: 5 },
  ];
  for (const t of travels) {
    const existing = await prisma.aboutTravel.findFirst({ where: { place: t.place } });
    if (existing) {
      await prisma.aboutTravel.update({ where: { id: existing.id }, data: t });
    } else {
      await prisma.aboutTravel.create({ data: t });
    }
  }
  console.log(`AboutTravels seeded: ${travels.length} items`);

  // 事件日历（date 存为 ISO，由本地日期解析）
  const events = [
    { date: '2015-06-30', title: '大学毕业', desc: '拿到学士学位，正式结束学生身份，开始在社会里写自己的程序。', sortOrder: 0 },
    { date: '2016-09-12', title: '学会开车', desc: '科目三一次过，第一次独自把车从驾校开回小区，手握方向盘的踏实感很上头。', sortOrder: 1 },
    { date: '2023-11-05', title: '英雄联盟打到大师段位', desc: '单排冲上大师，证明坚持和系统训练真的能把段位打上去。', sortOrder: 2 },
    { date: '2024-03-18', title: '炉石传说上了传说', desc: '天梯冲上传说，卡组理解与读牌节奏终于磨到位的那一刻很爽。', sortOrder: 3 },
    { date: '2026-08-11', title: '英雄联盟上钻石段位', desc: '新赛季定级后一路打到钻石，手感回来了。', sortOrder: 4 },
    { date: '2026-08-11', title: '开始健身满一年', desc: '坚持健身整一年，体脂和心态都肉眼可见地变好。', sortOrder: 5 },
    { date: '2026-08-11', title: '谈恋爱满一年', desc: '和 TA 在一起满一年，平凡日子里藏着最稳的幸福。', sortOrder: 6 },
  ];
  for (const e of events) {
    const [y, m, d] = e.date.split('-').map(Number);
    const isoDate = new Date(y, m - 1, d);
    const existing = await prisma.aboutEvent.findFirst({ where: { date: isoDate, title: e.title } });
    if (existing) {
      await prisma.aboutEvent.update({ where: { id: existing.id }, data: { ...e, date: isoDate } });
    } else {
      await prisma.aboutEvent.create({ data: { ...e, date: isoDate } });
    }
  }
  console.log(`AboutEvents seeded: ${events.length} items`);

  // ==================== 数字生命 seed ====================
  // 人格（单条全局，id 固定 "default"；初始值 = muztagh-cat skill 全文）
  const personaCount = await prisma.dlPersona.count();
  if (personaCount === 0) {
    await prisma.dlPersona.create({
      data: { id: 'default', content: DEFAULT_PERSONA_CONTENT },
    });
    console.log('DlPersona seeded: muztagh-cat persona (default)');
  } else {
    console.log('DlPersona skipped: already exists');
  }

  // 模型配置（单条全局，id 固定 "default"；默认 glm-4.6，无 Key）
  const modelConfigCount = await prisma.dlModelConfig.count();
  if (modelConfigCount === 0) {
    await prisma.dlModelConfig.create({
      data: {
        id: 'default',
        chatModel: 'glm-4.6',
        embeddingModel: 'embedding-3',
        apiKeyEnc: null,
      },
    });
    console.log('DlModelConfig seeded: glm-4.6 / embedding-3 (no api key)');
  } else {
    console.log('DlModelConfig skipped: already exists');
  }

  // ==================== 联系我 seed ====================
  // 仅在表为空时插入几条示例来信，方便后台收信箱演示
  const contactCount = await prisma.contactMessage.count();
  if (contactCount === 0) {
    const samples = [
      {
        name: '林小满',
        email: 'xiaoman@qq.com',
        phone: '138****1024',
        subject: '想聊聊一次登山装备选购',
        message: '你好！看到你登顶慕士塔格的记录，太厉害了。我准备去四姑娘山，想请教一下高海拔装备怎么选？',
        read: false,
      },
      {
        name: 'Aiden',
        email: 'aiden@example.com',
        subject: '合作 / 前端咨询',
        message: '我们在做一个设计类社区，想请你做一期关于「用设计记录思考」的分享，方便的话加个微信？',
        read: false,
      },
      {
        name: '匿名访客',
        phone: '139****8888',
        message: '数字生命这个想法很酷！期待上线，到时候来体验。',
        read: true,
      },
    ];
    for (const s of samples) {
      await prisma.contactMessage.create({ data: s });
    }
    console.log(`ContactMessages seeded: ${samples.length} sample messages`);
  } else {
    console.log(`ContactMessages skipped: ${contactCount} message(s) already exist`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
