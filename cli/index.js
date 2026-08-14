#!/usr/bin/env node
// inkheap-cli —— 直接调用 INKHEAP 后端接口的命令行工具。
// 零依赖，基于 Node 内置 fetch，Node 18+ 可直接运行：
//   node cli/index.js <command> [options]

import { parseArgs } from './lib/args.js';
import { ApiClient, hintIfUnauthorized } from './lib/client.js';
import { print, fail } from './lib/output.js';

import * as auth from './commands/auth.js';
import * as article from './commands/article.js';
import * as category from './commands/category.js';
import * as homepage from './commands/homepage.js';
import * as upload from './commands/upload.js';

const VERSION = '0.1.0';

const COMMANDS = {
  login: auth,
  whoami: auth,
  me: auth,
  logout: auth,
  articles: article,
  article: article,
  categories: category,
  category: category,
  homepage: homepage,
  'home-page': homepage,
  upload: upload,
  file: upload,
};

const HELP = `inkheap-cli ${VERSION} —— INKHEAP 后端接口命令行工具

用法:
  node cli/index.js <命令> [子命令] [选项]

全局选项:
  --base-url <url>   后端接口基地址（默认 http://localhost:3000/api，可用环境变量 INKHEAP_BASE_URL 覆盖）
  --token <jwt>      临时指定令牌（优先于本地保存的令牌）
  --json             紧凑 JSON 输出（便于管道处理）
  -h, --help         查看帮助
  -v, --version      查看版本

登录相关:
  login <用户名> <密码>   登录并保存令牌（默认管理员 admin / admin123）
  whoami                  查看当前登录用户
  logout                  清除本地令牌

文章（articles）:
  articles list [--search S] [--category-key K] [--status published|draft|all]
                [--page N] [--page-size N] [--all]
       --all 走管理接口（需登录，含草稿）；默认公开接口（仅已发布）
  articles get <id>
  articles create --title T --content C --category-key K --author A
                [--slug S] [--summary S] [--cover-image U] [--tags a,b,c]
                [--published] [--featured]
  articles update <id> [字段选项...]
  articles delete <id>

分类（categories）:
  categories list            公开列表
  categories tree            公开分类树
  categories get <id>
  categories create --key K --name N [--parent-key P] [--sort-order N] [--icon I]
  categories update <id> [字段选项...]
  categories delete <id>

首页配置（homepage）:
  homepage get [--admin]     默认公开接口，--admin 走管理接口
  homepage update [--site-name S] [--person-title T] [--code-content C] [--avatar U]

文件上传（upload）:
  upload <文件路径>          上传图片（png/jpeg/gif/webp，≤5MB）
  upload delete <id>         删除已上传文件

示例:
  node cli/index.js login admin admin123
  node cli/index.js categories tree --json
  node cli/index.js articles list --search vue
  node cli/index.js articles create --title "Hello" --content "正文" --category-key frontend --author 墨堆
  node cli/index.js upload ./avatar.png
`;

function showHelp() {
  process.stdout.write(HELP);
}

async function main() {
  const argv = process.argv.slice(2);
  const { positional, options } = parseArgs(argv);

  if (options.version) {
    process.stdout.write(`inkheap-cli ${VERSION}\n`);
    return;
  }

  const [command, ...rest] = positional;

  if (!command || options.help || command === 'help') {
    if (command === 'help') {
      // help <command> 暂时只打印完整帮助
      showHelp();
    } else if (options.help && command) {
      showHelp();
    } else {
      showHelp();
    }
    return;
  }

  const mod = COMMANDS[command];
  if (!mod) {
    fail(`未知命令: ${command}（运行 \`node cli/index.js --help\` 查看用法）`);
  }

  const client = new ApiClient({
    baseUrl: typeof options['base-url'] === 'string' ? options['base-url'] : undefined,
    token: typeof options.token === 'string' ? options.token : null,
  });

  // 动词型命令（login / whoami / me / logout）把命令本身作为子命令传入，
  // 其余名词型命令（articles / categories / ...）以第一个位置参数作为子命令。
  const verbCommands = new Set(['login', 'whoami', 'me', 'logout']);

  const ctx = {
    args: verbCommands.has(command) ? [command, ...rest] : rest,
    options,
    compact: Boolean(options.json),
  };

  try {
    await mod.run(client, ctx);
  } catch (err) {
    fail(hintIfUnauthorized(err));
  }
}

main();
