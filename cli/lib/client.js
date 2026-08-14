// API 客户端：封装对后端接口的 HTTP 调用，并负责 JWT 令牌的本地持久化。
// 令牌默认保存在用户主目录的 .inkheap-cli/config.json 中。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_BASE_URL = 'http://localhost:3000/api';
const CONFIG_DIR = join(homedir(), '.inkheap-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function readConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

export function getToken() {
  return readConfig().token || null;
}

export function setToken(token) {
  const config = readConfig();
  config.token = token;
  writeConfig(config);
}

export function clearToken() {
  const config = readConfig();
  delete config.token;
  writeConfig(config);
}

export function configPath() {
  return CONFIG_FILE;
}

export class ApiClient {
  /**
   * @param {{ baseUrl?: string, token?: string | null }} [opts]
   */
  constructor(opts = {}) {
    this.baseUrl = (
      opts.baseUrl ||
      process.env.INKHEAP_BASE_URL ||
      DEFAULT_BASE_URL
    ).replace(/\/+$/, '');
    this.token = opts.token || getToken();
  }

  /**
   * 发起一次请求，自动附加 Authorization、拼接查询串、序列化 JSON 体。
   * 非 2xx 响应抛出带 status / data 的 Error。
   * @param {string} method
   * @param {string} path 以 / 开头的路径（相对 baseUrl）
   * @param {{ query?: object, body?: object, form?: FormData }} [opts]
   */
  async request(method, path, opts = {}) {
    let url = this.baseUrl + path;

    if (opts.query) {
      const qs = new URLSearchParams();
      for (const [key, value] of Object.entries(opts.query)) {
        if (value !== undefined && value !== null && value !== '') {
          qs.append(key, String(value));
        }
      }
      const query = qs.toString();
      if (query) url += '?' + query;
    }

    const headers = {};
    let payload;

    if (opts.form) {
      payload = opts.form; // FormData：fetch 会自动设置 multipart 边界
    } else if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(opts.body);
    }

    if (this.token) {
      headers.Authorization = 'Bearer ' + this.token;
    }

    const res = await fetch(url, { method, headers, body: payload });
    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok) {
      const message =
        (data && typeof data === 'object' && (data.message || data.error)) ||
        (typeof data === 'string' && data) ||
        res.statusText;
      const err = new Error(`${res.status} ${message}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }
}

/** 需要登录才能访问的接口出错时的统一提示。 */
export function hintIfUnauthorized(err) {
  if (err && err.status === 401) {
    return `${err.message}\n提示：请先运行 \`inkheap login <用户名> <密码>\` 登录。`;
  }
  return err.message;
}
