// 首页配置：get / update。

import { print, fail } from '../lib/output.js';
import { opt } from '../lib/args.js';

export const summary = '首页配置查看与更新';

/**
 * @param {import('../lib/client.js').ApiClient} client
 * @param {{ args: string[], options: Record<string, string | boolean>, compact: boolean }} ctx
 */
export async function run(client, ctx) {
  const [sub] = ctx.args;

  switch (sub) {
    case 'get':
      // 默认公开接口；--admin 走管理接口（需登录）
      print(
        await client.request('GET', ctx.options.admin ? '/admin/home-page' : '/public/home-page'),
        ctx.compact,
      );
      return;

    case 'update': {
      const body = {};
      for (const [key, field] of [
        ['site-name', 'siteName'],
        ['person-title', 'personTitle'],
        ['code-content', 'codeContent'],
        ['avatar', 'avatar'],
      ]) {
        const v = opt(ctx.options, key);
        if (v !== null) body[field] = v;
      }
      if (Object.keys(body).length === 0) {
        fail('至少提供一个要更新的字段选项: --site-name --person-title --code-content --avatar');
      }
      print(await client.request('PUT', '/admin/home-page', { body }), ctx.compact);
      return;
    }

    default:
      fail('未知子命令，可用: get | update');
  }
}
