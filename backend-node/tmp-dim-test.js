require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { decryptSecret } = require('./dist/modules/digitallife/crypto.util');
const { OpenAIEmbeddings } = require('@langchain/openai');

const p = new PrismaClient();
const BASE = 'https://open.bigmodel.cn/api/paas/v4';

(async () => {
  const model = await p.dlModel.findFirst({ where: { modelType: 'embedding' } });
  if (!model) {
    console.log('no embedding model');
    process.exit(1);
  }
  console.log(`model: ${model.name} | provider=${model.provider} | modelId=${model.modelId} | hasKey=${!!model.apiKeyEnc}`);
  if (!model.apiKeyEnc) process.exit(1);
  const apiKey = decryptSecret(model.apiKeyEnc);

  // 1) 原生 fetch 不带 dimensions
  const r1 = await fetch(`${BASE}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: model.modelId, input: '你好' }),
  });
  const j1 = await r1.json();
  console.log('native no-dim:', r1.status, j1.error ? JSON.stringify(j1.error).slice(0, 200) : `dim=${j1.data?.[0]?.embedding?.length}`);

  // 2) 原生 fetch 带 dimensions=1024
  const r2 = await fetch(`${BASE}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: model.modelId, input: '你好', dimensions: 1024 }),
  });
  const j2 = await r2.json();
  console.log('native dim=1024:', r2.status, j2.error ? JSON.stringify(j2.error).slice(0, 200) : `dim=${j2.data?.[0]?.embedding?.length}`);

  // 3) langchain 当前配置（同 buildEmbeddings）
  const emb = new OpenAIEmbeddings({
    model: model.modelId,
    apiKey,
    configuration: { baseURL: BASE },
    dimensions: 1024,
  });
  try {
    const vec = await emb.embedQuery('你好');
    console.log('langchain embedQuery:', `dim=${vec.length}`);
  } catch (e) {
    console.log('langchain error:', e.message);
  }

  await p.$disconnect();
})();
