// 文章：list / get / create / update / delete。

import { print, fail } from '../lib/output.js';
import { opt, parseBool } from '../lib/args.js';

export const summary = '文章管理（列表、详情、创建、更新、删除）';

/**
 * 从命令行选项构建文章查询串（列表接口共用）。
 */
function buildQuery(options) {
  const query = {};
  if (opt(options, 'search') !== null) query.search = opt(options, 'search');
  if (opt(options, 'category-key') !== null) query.categoryKey = opt(options, 'category-key');
  if (opt(options, 'status') !== null) query.status = opt(options, 'status');
  if (opt(options, 'page') !== null) query.page = opt(options, 'page');
  if (opt(options, 'page-size') !== null) query.pageSize = opt(options, 'page-size');
  return query;
}

/**
 * 从命令行选项构建文章创建/更新体。
 */
function buildBody(options) {
  const body = {};
  const pick = (key, field = key) => {
    const v = opt(options, key);
    if (v !== null) body[field] = v;
  };

  pick('title');
  pick('slug');
  pick('summary');
  pick('content');
  pick('cover-image', 'coverImage');
  pick('category-key', 'categoryKey');
  pick('author');

  const tags = opt(options, 'tags');
  if (tags !== null) body.tags = String(tags).split(',').map((t) => t.trim()).filter(Boolean);

  if (options.published !== undefined) body.published = parseBool(options.published, 'published');
  if (options.featured !== undefined) body.featured = parseBool(options.featured, 'featured');

  return body;
}

/**
 * @param {import('../lib/client.js').ApiClient} client
 * @param {{ args: string[], options: Record<string, string | boolean>, compact: boolean }} ctx
 */
export async function run(client, ctx) {
  const [sub, ...rest] = ctx.args;

  switch (sub) {
    case 'list': {
      // 默认走公开接口（仅已发布）；加 --all 走管理接口（需登录，含草稿）
      const path = ctx.options.all ? '/admin/articles' : '/articles';
      print(await client.request('GET', path, { query: buildQuery(ctx.options) }), ctx.compact);
      return;
    }

    case 'get': {
      const id = rest[0];
      if (!id) fail('用法: inkheap articles get <id>');
      print(await client.request('GET', `/admin/articles/${id}`), ctx.compact);
      return;
    }

    case 'create': {
      const body = buildBody(ctx.options);
      const required = ['title', 'content', 'categoryKey', 'author'];
      const missing = required.filter((k) => body[k] === undefined);
      if (missing.length) {
        fail(`缺少必填字段: ${missing.join(', ')}（--title --content --category-key --author）`);
      }
      print(await client.request('POST', '/admin/articles', { body }), ctx.compact);
      return;
    }

    case 'update': {
      const id = rest[0];
      if (!id) fail('用法: inkheap articles update <id> [字段选项...]');
      const body = buildBody(ctx.options);
      if (Object.keys(body).length === 0) {
        fail('至少提供一个要更新的字段选项');
      }
      print(await client.request('PUT', `/admin/articles/${id}`, { body }), ctx.compact);
      return;
    }

    case 'delete':
    case 'remove': {
      const id = rest[0];
      if (!id) fail('用法: inkheap articles delete <id>');
      print(await client.request('DELETE', `/admin/articles/${id}`), ctx.compact);
      return;
    }

    default:
      fail('未知子命令，可用: list | get | create | update | delete');
  }
}
