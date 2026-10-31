/* eslint-disable */
/**
 * 临时脚本：把当前数据库数据导出为 prisma/seed.ts（数据快照版）。
 * 用法：node prisma/_export-seed.js
 * 完成后可删除本文件。
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 需要导出的表：key = 生成的变量名，model = Prisma delegate，mode = 幂等写入策略
const TABLES = [
  { key: 'adminUsers', model: 'adminUser', mode: 'upsert', where: 'username' },
  { key: 'categories', model: 'category', mode: 'upsert', where: 'key' },
  { key: 'blogCategories', model: 'blogCategory', mode: 'upsert', where: 'key' },
  { key: 'blogs', model: 'blog', mode: 'upsert', where: 'slug' },
  { key: 'articles', model: 'article', mode: 'upsert', where: 'slug' },
  { key: 'homePage', model: 'homePage', mode: 'upsert', where: 'id' },
  { key: 'aboutProfile', model: 'aboutProfile', mode: 'upsert', where: 'id' },
  { key: 'resume', model: 'resume', mode: 'ifEmpty' },
  { key: 'aboutFootprints', model: 'aboutFootprint', mode: 'ifEmpty' },
  { key: 'aboutTravels', model: 'aboutTravel', mode: 'ifEmpty' },
  { key: 'aboutEvents', model: 'aboutEvent', mode: 'ifEmpty' },
  { key: 'footerLinks', model: 'footerLink', mode: 'ifEmpty' },
  { key: 'footerConfig', model: 'footerConfig', mode: 'upsert', where: 'id' },
  { key: 'friendLinks', model: 'friendLink', mode: 'ifEmpty' },
  { key: 'friendApplications', model: 'friendApplication', mode: 'ifEmpty' },
  { key: 'contactMessages', model: 'contactMessage', mode: 'ifEmpty' },
  { key: 'dlModels', model: 'dlModel', mode: 'ifEmpty' },
  { key: 'dlPersonas', model: 'dlPersona', mode: 'ifEmpty' },
  { key: 'wechatUsers', model: 'wechatUser', mode: 'upsert', where: 'openid' },
  { key: 'chatMessages', model: 'chatMessage', mode: 'ifEmpty' },
  { key: 'files', model: 'file', mode: 'upsert', where: 'url' },
  { key: 'siteVisits', model: 'siteVisit', mode: 'upsert', where: 'day' },
  { key: 'contentViews', model: 'contentView', mode: 'upsert', where: 'composite' },
];

// ---------- 序列化 ----------
function escStr(s) {
  return JSON.stringify(s).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function lit(v) {
  if (v === null || v === undefined) return 'null';
  if (v instanceof Date) return `new Date(${JSON.stringify(v.toISOString())})`;
  if (typeof v === 'string') return escStr(v);
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'bigint') return `${v.toString()}n`;
  return escStr(String(v));
}

const ID_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
function keyLit(k) {
  return ID_RE.test(k) ? k : escStr(k);
}

function rowLit(row) {
  const body = Object.keys(row)
    .map((k) => `      ${keyLit(k)}: ${lit(row[k])},`)
    .join('\n');
  return `    {\n${body}\n    },`;
}

function arrLit(rows) {
  return `[\n${rows.map(rowLit).join('\n')}\n  ]`;
}

// ---------- 生成写入逻辑 ----------
function emitUpsert(t) {
  if (t.where === 'composite') {
    return `  for (const row of DATA.${t.key}) {
    await prisma.${t.model}.upsert({
      where: {
        targetType_targetId_ip_day: {
          targetType: row.targetType,
          targetId: row.targetId,
          ip: row.ip,
          day: row.day,
        },
      },
      update: {},
      create: row,
    });
  }`;
  }
  return `  for (const row of DATA.${t.key}) {
    await prisma.${t.model}.upsert({
      where: { ${t.where}: row.${t.where} },
      update: {},
      create: row,
    });
  }`;
}

function emitIfEmpty(t) {
  return `  if ((await prisma.${t.model}.count()) === 0) {
    await prisma.${t.model}.createMany({ data: DATA.${t.key} });
  }`;
}

async function main() {
  const data = {};
  const counts = {};
  for (const t of TABLES) {
    const rows = await prisma[t.model].findMany();
    data[t.key] = rows;
    counts[t.key] = rows.length;
  }

  const blocks = TABLES.filter((t) => counts[t.key] > 0).map((t) => {
    const header = `  // ${t.key} (${counts[t.key]} 条)`;
    return `${header}\n${t.mode === 'upsert' ? emitUpsert(t) : emitIfEmpty(t)}`;
  });

  const dataDecls = TABLES.filter((t) => counts[t.key] > 0)
    .map((t) => `  ${t.key}: ${arrLit(data[t.key])},`)
    .join('\n\n');

  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);

  const ts = `/**
 * Prisma seed —— 由当前线上数据库导出生成（数据快照）。
 *
 * 生成时间：${new Date().toISOString()}
 * 数据来源：personal_profile（共 ${totalRows} 行 / ${TABLES.filter((t) => counts[t.key] > 0).length} 张表）
 *
 * 幂等策略（重复执行安全，不会清空或覆盖已存在的数据）：
 *   - 有唯一键的表：按唯一键 upsert，已存在则跳过（update: {}）
 *   - 无唯一键的表：仅当表为空时 createMany 写入
 *
 * 说明：dl_vectors（pgvector 向量表）由 prisma/pgvector-init.ts 建表、业务侧写入，不在此导出。
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DATA = {
${dataDecls}
};

async function main() {
${blocks.join('\n\n')}

  console.log('Seed done: ${totalRows} rows from snapshot');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

  const outPath = path.join(__dirname, 'seed.ts');
  fs.writeFileSync(outPath, ts, 'utf8');
  console.log('[export] seed.ts written:', outPath);
  console.log('[export] counts:', JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
