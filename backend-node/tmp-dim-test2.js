require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { decryptSecret } = require('./dist/modules/digitallife/crypto.util');
const { OpenAIEmbeddings } = require('@langchain/openai');

const p = new PrismaClient();
const BASE = 'https://open.bigmodel.cn/api/paas/v4';

// 拦截 fetch 打印请求体
const origFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (typeof url === 'string' && url.includes('/embeddings')) {
    console.log('>>> REQUEST', url, 'BODY:', opts?.body?.slice(0, 400));
  }
  return origFetch(url, opts);
};

(async () => {
  const model = await p.dlModel.findFirst({ where: { modelType: 'embedding' } });
  const apiKey = decryptSecret(model.apiKeyEnc);
  const emb = new OpenAIEmbeddings({
    model: model.modelId,
    apiKey,
    configuration: { baseURL: BASE },
    dimensions: 1024,
  });
  const vec = await emb.embedQuery('你好');
  console.log('langchain dim:', vec.length);
  await p.$disconnect();
})();
