// 登录 / 当前用户 / 登出。

import { setToken, clearToken, configPath } from '../lib/client.js';
import { print, fail } from '../lib/output.js';

export const summary = '登录、查看当前用户、登出';

/**
 * @param {import('../lib/client.js').ApiClient} client
 * @param {{ args: string[], options: Record<string, string | boolean>, compact: boolean }} ctx
 */
export async function run(client, ctx) {
  const [sub, ...rest] = ctx.args;

  switch (sub) {
    case 'login': {
      const [username, password] = rest;
      if (!username || !password) {
        fail('用法: inkheap login <用户名> <密码>');
      }
      const data = await client.request('POST', '/admin/auth/login', {
        body: { username, password },
      });
      if (data && data.accessToken) {
        setToken(data.accessToken);
        print({ ok: true, user: data.user, tokenSavedTo: configPath() }, ctx.compact);
      } else {
        print(data, ctx.compact);
      }
      return;
    }

    case 'whoami':
    case 'me': {
      print(await client.request('GET', '/admin/auth/me'), ctx.compact);
      return;
    }

    case 'logout': {
      clearToken();
      print({ ok: true, message: '已清除本地令牌' }, ctx.compact);
      return;
    }

    default:
      fail('未知子命令，可用: login | whoami | logout');
  }
}
