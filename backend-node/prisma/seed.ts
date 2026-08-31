import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_RESUME_CONTENT, DEFAULT_RESUME_NAME } from '../src/modules/resume/resume.defaults';
import { DEFAULT_MODELS, DEFAULT_PERSONA } from '../src/modules/digitallife/digital-life.defaults';
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

  // ==================== 页脚链接 seed ====================
  // 预置当前默认导航 / 扩展（幂等：仅表为空时写入，不覆盖后台后续修改）
  const footerLinkCount = await prisma.footerLink.count();
  if (footerLinkCount === 0) {
    const footerLinks = [
      // 导航（站内路由）
      { type: 'nav', mode: 0, label: '联系我', url: '/contact', sortOrder: 0 },
      { type: 'nav', mode: 1, label: '关于我', url: '/about', sortOrder: 1 },
      { type: 'nav', mode: 1, label: '小记', url: '/xiaoji', sortOrder: 2 },
      { type: 'nav', mode: 2, label: '知识库', url: '/articles', sortOrder: 3 },
      { type: 'nav', mode: 2, label: '简历', url: '/resume', sortOrder: 4 },
      // 扩展（外链）
      { type: 'ext', mode: 0, label: '源码', url: 'https://github.com/pinkman119/inkheap.git', sortOrder: 0 },
    ];
    await prisma.footerLink.createMany({ data: footerLinks });
    console.log(`FooterLinks seeded: ${footerLinks.length} links`);
  } else {
    console.log(`FooterLinks skipped: ${footerLinkCount} link(s) already exist`);
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
  // isRing = 设为成就：成就事件沉淀到前台「这一年的年轮」时间线，其余事件仅通过热力块抽屉查看。
  // mock 数据覆盖 2020→2026：早年稀疏、2026 年密集（含本周数据），方便演示年份筛选与热力图层次。
  const events = [
    // ===== 2020：登山启蒙 + 远程办公 =====
    { date: '2020-01-11', title: '第一次进高原', desc: '四姑娘山大峰 5025m，高原反应很诚实，银河也很诚实——城市里没有这种坦诚。', isRing: true },
    { date: '2020-03-02', title: '开始远程办公', desc: '把书桌收拾成工位，猫蹲在显示器后面监工，效率意外地高。', isRing: false },
    { date: '2020-05-20', title: '换了台相机', desc: '入手中画幅，从此背包里多了一块砖，也多了一双眼睛。', isRing: false },
    { date: '2020-07-18', title: '第一次拍到银河', desc: '在海拔 4000 米的营地守到凌晨两点，快门按下那一刻手是抖的。', isRing: false },
    { date: '2020-11-11', title: '跑完第一个半马', desc: '2 小时 15 分，撞墙期在 18 公里，靠路边陌生人的加油声撑完。', isRing: false },
    { date: '2020-12-31', title: '跨年夜重构博客', desc: '用新框架把写了三年的老博客推倒重来，跨年钟声响的时候正在调样式。', isRing: false },

    // ===== 2021 =====
    { date: '2021-02-14', title: '学会做菜', desc: '第一次做出不糊锅的红烧排骨，从此周末的厨房归我。', isRing: false },
    { date: '2021-04-04', title: '黔东南苗寨', desc: '苗寨的酒和歌，比城市里的人诚实。一晚敬天地，一晚敬朋友。', isRing: false },
    { date: '2021-06-19', title: '独立部署 K8s 集群', desc: '从证书签发到灰度发布一手包办，凌晨三点看到 Pod 全绿才敢睡。', isRing: true },
    { date: '2021-08-08', title: '读完《数据库系统实现》', desc: 'B+ 树、WAL、MVCC，把平时含糊的概念一个个落回纸上。', isRing: false },
    { date: '2021-10-24', title: '开源第一个库', desc: '把内部用的图片处理工具整理开源，第一个 star 来自陌生人。', isRing: false },
    { date: '2021-12-11', title: '滑雪初体验', desc: '在崇礼摔了一下午，最后终于能连续转弯下初级道。', isRing: false },

    // ===== 2022：慕士塔格 =====
    { date: '2022-01-15', title: '制定登山训练计划', desc: '7546 米不是开玩笑，跑步、负重、深蹲，一切按表推进。', isRing: false },
    { date: '2022-03-26', title: '负重徒步拉练', desc: '背着 15 公斤走完 25 公里山路，肩膀勒出印子，心里反而踏实。', isRing: false },
    { date: '2022-05-01', title: '成都集结', desc: '和队友碰头检查装备，出发前的兴奋和忐忑各占一半。', isRing: false },
    { date: '2022-07-16', title: '登顶慕士塔格', desc: '7546 米，雪线之上风把人吹得很轻。在海拔几千米的地方，人会重新想清楚什么重要。', isRing: true },
    { date: '2022-08-20', title: '恢复训练', desc: '下山一个月后重新回到健身房，把掉下去的肌肉一点点捡回来。', isRing: false },
    { date: '2022-09-10', title: '中秋写家书', desc: '在山顶没信号欠下的话，用一封长信补给了爸妈。', isRing: false },
    { date: '2022-11-20', title: '摄影集整理', desc: '把三年的山野照片挑出 200 张，做成第一本个人摄影集。', isRing: false },

    // ===== 2023 =====
    { date: '2023-01-08', title: '冰岛追极光', desc: '极光下面泡温泉，世界安静得只剩风声和自己的呼吸。', isRing: true },
    { date: '2023-03-15', title: '开始写技术专栏', desc: '把踩过的坑写成文章，第一篇阅读量破了五位数。', isRing: false },
    { date: '2023-05-28', title: '5 公里跑进 25 分钟', desc: '配速练到 5 分内，跑步从煎熬变成了享受。', isRing: false },
    { date: '2023-08-12', title: '读完《失控》', desc: '蜂群思维与涌现，读完再看系统设计，很多事突然通了。', isRing: false },
    { date: '2023-11-05', title: '英雄联盟打到大师', desc: '单排冲上大师，证明坚持和系统训练真的能把段位打上去。', isRing: true },
    { date: '2023-12-24', title: '第一个被合并的开源 PR', desc: '给常用框架修了个文档 typo，被合并那天的快乐超出预期。', isRing: false },

    // ===== 2024：墨堆起步 =====
    { date: '2024-01-06', title: '年度复盘', desc: '写下「把经历沉淀成可对话的系统」这一年的主线目标。', isRing: false },
    { date: '2024-03-18', title: '炉石传说上传说', desc: '天梯冲上传说，卡组理解与读牌节奏终于磨到位的那一刻很爽。', isRing: true },
    { date: '2024-05-02', title: '墨堆立项', desc: '个人知识库 + 数字生命的想法落地成第一页 PRD，代号 inkheap。', isRing: true },
    { date: '2024-06-15', title: '第一版原型', desc: '画完首页与文章流的原型，凌晨的 Figma 文件名叫「就差亿点点」。', isRing: false },
    { date: '2024-08-08', title: '健身满半年', desc: '半年打卡 96 次，体检报告第一次全部飘绿。', isRing: false },
    { date: '2024-09-22', title: '数字生命 Demo 跑通', desc: 'RAG 检索 + 流式回复第一次在本地跑通，对着屏幕傻笑了十分钟。', isRing: true },
    { date: '2024-11-11', title: '单日骑行 100km', desc: '环湖骑行破百，最后十公里是靠意念和补给站的香蕉蹬完的。', isRing: false },
    { date: '2024-12-25', title: '墨堆内测上线', desc: '把链接发给五个朋友，收到第一句反馈：「这个数字生命有点东西」。', isRing: false },

    // ===== 2025 =====
    { date: '2025-01-18', title: '墨堆 v1.0 发布', desc: '正式对外发布，文章、小记、简历、关于我四个板块全部就位。', isRing: true },
    { date: '2025-03-30', title: '重访雨崩', desc: '时隔六年再走神瀑线，有些地方，开车到不了，只能走着靠近。', isRing: false },
    { date: '2025-05-04', title: '半马 PB 1:52', desc: '比第一次快了 23 分钟，配速表上的曲线终于好看了。', isRing: false },
    { date: '2025-07-20', title: '数字生命接入微信', desc: '扫码就能和「数字我」聊天，后台消息列表第一次热闹起来。', isRing: false },
    { date: '2025-08-11', title: '在一起的第一天', desc: '平凡日子开始有了新的坐标系。', isRing: false },
    { date: '2025-08-16', title: '318 川藏线出发', desc: '和两位老友自驾进藏，后备箱塞满氧气瓶和胶卷。', isRing: false },
    { date: '2025-08-28', title: '抵达拉萨', desc: '第 13 天，布达拉宫广场的风很大，功劳簿上写着「全程没高反」。', isRing: true },
    { date: '2025-10-01', title: '十一闭关重构', desc: '七天假期全给了墨堆的权限系统，假期结束，代码也清爽了。', isRing: false },
    { date: '2025-12-31', title: '年度复盘', desc: '连续第三年写年度复盘，今年的关键词是「留下痕迹」。', isRing: false },

    // ===== 2026：密集记录（含本周） =====
    { date: '2026-01-01', title: '新年第一天晨跑', desc: '零下三度的江边，呼出的白气比烟花先出现。', isRing: false },
    { date: '2026-02-17', title: '春节返乡', desc: '教爸妈用上了数字生命的微信入口，他们管它叫「电子儿子」。', isRing: false },
    { date: '2026-03-08', title: '数字生命加上长期记忆', desc: '向量库接入记忆压缩，它终于记得住上周聊过什么了。', isRing: false },
    { date: '2026-04-12', title: '首页改版定稿', desc: '第七版稿通过，设计稿上的绿色和山上的苔藓是同一个色号。', isRing: false },
    { date: '2026-05-01', title: '东西冲海岸线徒步', desc: '一边是大鹏湾，一边是礁石与浪，走完晒脱一层皮。', isRing: false },
    { date: '2026-06-06', title: '拿到潜水证 OW', desc: '在涠洲岛完成开放水域考核，水下 18 米的世界安静得像另一个宇宙。', isRing: false },
    { date: '2026-07-11', title: '咖啡拉花成功', desc: '第 31 杯，终于拉出一颗完整的心，虽然三秒后就散了。', isRing: false },
    { date: '2026-07-25', title: '深圳湾夜骑 30km', desc: '晚风、霓虹和轮组的嗡嗡声，夜骑是最好的解压方式。', isRing: false },
    { date: '2026-08-08', title: '健身第 11 个月', desc: '硬拉摸到 1.5 倍体重，教练说可以开始考虑打业余赛了。', isRing: false },
    { date: '2026-08-11', title: '英雄联盟上钻石', desc: '新赛季定级后一路打到钻石，手感回来了。', isRing: true },
    { date: '2026-08-11', title: '健身满一年', desc: '坚持健身整一年，体脂和心态都肉眼可见地变好。', isRing: true },
    { date: '2026-08-11', title: '恋爱满一年', desc: '和 TA 在一起满一年，平凡日子里藏着最稳的幸福。', isRing: true },
    { date: '2026-08-15', title: '读完《孤独六讲》', desc: '「孤独是生命圆满的开始」，抄进了墨堆的每日一句。', isRing: false },
    { date: '2026-08-23', title: '徒手攀岩体验课', desc: '在岩馆的抱石墙上挂了两个小时，指尖磨红了但上头。', isRing: false },
    { date: '2026-08-24', title: '全站 HTTPS 上线', desc: '证书续签脚本 + 反代配置全部自动化，从此锁头常绿。', isRing: false },
    { date: '2026-08-25', title: '重构年轮系统', desc: '把独立年轮表合并进事件日历，热力块抽屉上线，写下这条记录作纪念。', isRing: false },
  ];
  // 事件 mock 采用「清空重建」策略：旧数据（含旧年轮表时代的演示数据）全部移除
  await prisma.aboutEvent.deleteMany({});
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const [y, m, d] = e.date.split('-').map(Number);
    await prisma.aboutEvent.create({
      data: { ...e, date: new Date(y, m - 1, d), sortOrder: i },
    });
  }
  const ringCount = events.filter((e) => e.isRing).length;
  console.log(`AboutEvents seeded: ${events.length} items (${ringCount} rings)`);

  // ==================== 数字生命 seed ====================
  // 人格（多人格结构化；初始 = muztagh-cat 默认人格）
  const personaCount = await prisma.dlPersona.count();
  if (personaCount === 0) {
    await prisma.dlPersona.create({
      data: { ...DEFAULT_PERSONA, sortOrder: 0 },
    });
    console.log('DlPersona seeded: muztagh-cat persona (default)');
  } else {
    console.log('DlPersona skipped: already exists');
  }

  // 模型（多模型启停列表；仅 GLM-4.6 启用，其余停用供随时切换，均不配 Key）
  const modelCount = await prisma.dlModel.count();
  if (modelCount === 0) {
    await prisma.dlModel.createMany({ data: DEFAULT_MODELS });
    console.log(`DlModels seeded: ${DEFAULT_MODELS.length} models (glm-4.6 enabled, no api key)`);
  } else {
    console.log('DlModels skipped: already exist');
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
