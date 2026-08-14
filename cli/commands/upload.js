// 文件上传：upload <file> / delete <id>。

import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { print, fail } from '../lib/output.js';

export const summary = '上传图片文件、删除已上传文件';

// 后端只接受 png/jpeg/gif/webp，按扩展名推断 MIME 类型以便 Blob 携带正确的 Content-Type。
const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/**
 * @param {import('../lib/client.js').ApiClient} client
 * @param {{ args: string[], options: Record<string, string | boolean>, compact: boolean }} ctx
 */
export async function run(client, ctx) {
  const [first, ...rest] = ctx.args;

  // upload <文件路径>   —— 第一个参数直接是文件路径
  // upload delete <id>  —— 第一个参数是 delete/remove
  if (first === 'delete' || first === 'remove') {
    const id = rest[0];
    if (!id) fail('用法: inkheap upload delete <id>');
    print(await client.request('DELETE', `/admin/upload/${id}`), ctx.compact);
    return;
  }

  const filePath = first === 'upload' || first === 'add' ? rest[0] : first;
  if (!filePath) fail('用法: inkheap upload <文件路径>');

  const buffer = readFileSync(filePath);
  const ext = extname(filePath).toLowerCase();
  const type = MIME_BY_EXT[ext];
  if (!type) {
    fail(`不支持的文件类型: ${ext || '(无扩展名)'}（仅支持 png/jpeg/gif/webp）`);
  }
  const form = new FormData();
  form.append('file', new Blob([buffer], { type }), basename(filePath));
  print(await client.request('POST', '/admin/upload', { form }), ctx.compact);
}
