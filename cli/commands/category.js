// 分类：list / tree / get / create / update / delete。

import { print, fail } from '../lib/output.js';
import { opt } from '../lib/args.js';

export const summary = '分类管理（列表、树、详情、创建、更新、删除）';

/**
 * 从命令行选项构建分类创建/更新体。
 */
function buildBody(options) {
  const body = {};
  const pick = (key, field = key) => {
    const v = opt(options, key);
    if (v !== null) body[field] = v;
  };

  pick('key');
  pick('name');
  pick('parent-key', 'parentKey');
  pick('icon');

  const sortOrder = opt(options, 'sort-order');
  if (sortOrder !== null) body.sortOrder = Number(sortOrder);

  return body;
}

/**
 * @param {import('../lib/client.js').ApiClient} client
 * @param {{ args: string[], options: Record<string, string | boolean>, compact: boolean }} ctx
 */
export async function run(client, ctx) {
  const [sub, ...rest] = ctx.args;

  switch (sub) {
    case 'list':
      // 公开接口，无需登录
      print(await client.request('GET', '/categories'), ctx.compact);
      return;

    case 'tree':
      print(await client.request('GET', '/categories/tree'), ctx.compact);
      return;

    case 'get': {
      const id = rest[0];
      if (!id) fail('用法: inkheap categories get <id>');
      print(await client.request('GET', `/admin/categories/${id}`), ctx.compact);
      return;
    }

    case 'create': {
      const body = buildBody(ctx.options);
      if (!body.key || !body.name) fail('缺少必填字段: key, name（--key --name）');
      print(await client.request('POST', '/admin/categories', { body }), ctx.compact);
      return;
    }

    case 'update': {
      const id = rest[0];
      if (!id) fail('用法: inkheap categories update <id> [字段选项...]');
      const body = buildBody(ctx.options);
      if (Object.keys(body).length === 0) fail('至少提供一个要更新的字段选项');
      print(await client.request('PUT', `/admin/categories/${id}`, { body }), ctx.compact);
      return;
    }

    case 'delete':
    case 'remove': {
      const id = rest[0];
      if (!id) fail('用法: inkheap categories delete <id>');
      print(await client.request('DELETE', `/admin/categories/${id}`), ctx.compact);
      return;
    }

    default:
      fail('未知子命令，可用: list | tree | get | create | update | delete');
  }
}
