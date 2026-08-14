# inkheap-cli

直接调用 INKHEAP 后端接口的命令行工具。零依赖，基于 Node 内置 `fetch`，Node 18+ 即可运行。

## 快速开始

```bash
# 后端需已启动（默认 http://localhost:3000）
cd backend-node && npm run start:dev

# 另开终端，登录（默认管理员 admin / admin123）
node cli/index.js login admin admin123

# 查看公开分类树
node cli/index.js categories tree

# 列出文章（公开接口，仅已发布）
node cli/index.js articles list --search vue
```

也可安装为全局命令：

```bash
cd cli && npm link
inkheap login admin admin123
```

## 认证方式

- `login` 成功后，JWT 令牌保存在 `~/.inkheap-cli/config.json`（`logout` 清除）。
- 需要登录的接口会自动附加 `Authorization: Bearer <token>`。
- 可用 `--token <jwt>` 临时覆盖，或通过 `--base-url` / 环境变量 `INKHEAP_BASE_URL` 指定其它后端地址。

## 命令总览

| 命令 | 说明 |
| --- | --- |
| `login <用户名> <密码>` | 登录并保存令牌 |
| `whoami` | 查看当前登录用户 |
| `logout` | 清除本地令牌 |
| `articles list / get / create / update / delete` | 文章管理 |
| `categories list / tree / get / create / update / delete` | 分类管理 |
| `homepage get / update` | 首页配置 |
| `upload <文件> / delete <id>` | 图片上传/删除 |

运行 `node cli/index.js --help` 查看完整用法与所有选项。

## 接口对照

| CLI | 后端接口 | 鉴权 |
| --- | --- | --- |
| `login` | `POST /api/admin/auth/login` | 无 |
| `whoami` | `GET /api/admin/auth/me` | JWT |
| `articles list` | `GET /api/articles`（`--all` 时 `GET /api/admin/articles`） | 公开 / JWT |
| `articles get/create/update/delete` | `/api/admin/articles/*` | JWT |
| `categories list/tree` | `GET /api/categories[/tree]` | 无 |
| `categories get/create/update/delete` | `/api/admin/categories/*` | JWT |
| `homepage get` | `GET /api/public/home-page`（`--admin` 时 `/api/admin/home-page`） | 无 / JWT |
| `homepage update` | `PUT /api/admin/home-page` | JWT |
| `upload` | `POST /api/admin/upload` | JWT |
| `upload delete` | `DELETE /api/admin/upload/:id` | JWT |

## 示例

```bash
# 创建分类
node cli/index.js categories create --key tools --name 工具

# 创建文章
node cli/index.js articles create \
  --title "我的第一篇 CLI 文章" \
  --content "正文内容……" \
  --category-key tools \
  --author 墨堆 \
  --tags CLI,教程 \
  --published

# 更新首页站点名
node cli/index.js homepage update --site-name "INKHEAP"

# 上传头像
node cli/index.js upload ./avatar.png

# 管道友好（紧凑 JSON）
node cli/index.js articles list --json | head -c 200
```

## 结构

```
cli/
  index.js           入口：命令分发 + 帮助
  lib/args.js        参数解析
  lib/client.js      HTTP 客户端 + 令牌持久化
  lib/output.js      输出与错误处理
  commands/
    auth.js          登录/当前用户/登出
    article.js       文章
    category.js      分类
    homepage.js      首页配置
    upload.js        文件上传
```
