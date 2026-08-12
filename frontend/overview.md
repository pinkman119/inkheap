# 墨堆 · Vue 3 迁移总览

将工作空间内 7 个 HTML 高保真原型初始化为 Vue 3 + Vite 工程，每个页面对应一个 view，样式逐像素还原。

## 技术栈

- **Vue 3** `<script setup>` + **Vite 6** + **Vue Router 4**（hash 模式）
- 无 UI 库、无 CSS 框架——全部 `<style scoped>`，原样保留原型 CSS
- 路由级懒加载，每页独立 chunk

## 目录结构

```
index.html              # Vite 入口（含主题前置注入，防 FOUC）
vite.config.js
jsconfig.json            # @ 别名
public/logo.png
src/
├── main.js
├── App.vue              # 按 route.meta.layout 切换 #app 布局类
├── router/index.js      # 7 条路由
├── assets/styles/
│   ├── tokens.css       # 全站 :root / [data-theme="dark"] 变量（含 --hm-* 热力图色阶）
│   └── base.css         # reset + html/body + ::selection + 100dvh + reduced-motion
├── composables/
│   └── useTheme.js      # 主题单例（系统偏好 + localStorage）
├── components/
│   ├── AppHeader.vue    # 品牌 + 日夜双套导航 + 滑动下划线 + 主题切换
│   └── AppFooter.vue   # 可配 padding/margin 的页脚
├── data/                # 抽离的静态数据
│   ├── articles.js  resume.js  digitalLife.js  about.js  notes.js
└── views/
    ├── HomeView.vue          # /            首页（终端打字机）
    ├── ArticleListView.vue   # /articles    知识库列表（多级分类树+动态栏）
    ├── ArticleDetailView.vue # /articles/:slug  文章详情（三级目录 scroll-spy）
    ├── ResumeView.vue        # /resume      简历（进度条+打印导出）
    ├── DigitalLifeView.vue   # /digital-life  数字生命（满屏 AI 聊天）
    ├── AboutMeView.vue       # /about       关于我（滚动入场）
    └── XiaojiView.vue        # /xiaoji      小记（标签筛选）
prototypes/              # 原 7 个 HTML 原型 + 设计说明，保留作对照
```

## 还原的关键交互

- **顶栏**：日间/夜间两套导航自动切换、滑动下划线（鼠标悬浮预览、字体加载后重测）、主题按钮旋转
- **首页**：终端逐字打字机 + 闪烁光标
- **知识库列表**：三级分类树展开折叠、面包屑联动、搜索实时筛选、动态栏折叠 + 刷新 360° 旋转重排
- **文章详情**：正文标题动态生成三级目录、IntersectionObserver scroll-spy + 祖先链高亮、阅读进度条
- **简历**：阅读进度条、打印导出（`@media print` 完整还原）
- **数字生命**：满屏不滚动布局、流式逐字回复、贴底跟随 + 新消息浮标、Enter 发送/Shift+Enter 换行、textarea 自适应
- **关于我**：IntersectionObserver 滚动入场（含 reduced-motion 降级）
- **小记**：标签筛选 + 计数联动 + fadeUp 重放

## 样式保真校验

对 7 个 view 做了字符级 CSS 比对（剥注释、压空白、去标点两侧空格后整段 diff）：

| 页面 | 原型规则数 | Vue 规则数 | 非预期偏差 |
|------|-----------|-----------|-----------|
| home | 28 | 28 | 0 |
| articles | 74 | 74 | 0 |
| detail | 69 | 69 | 0 |
| resume | 66 | 66 | 0 |
| digital | 60 | 60 | 0 |
| about | 49 | 49 | 0 |
| xiaoji | 26 | 26 | 0 |

所有"差异"均为有意抽取到共享资产：
- `.header*` / `.nav*` / `.brand*` / `.theme-toggle` → `AppHeader.vue`
- `.footer` → `AppFooter.vue`
- `:root` / `[data-theme="dark"]` 变量 → `tokens.css`
- `*` / `html` / `body` / `::selection` / `@supports 100dvh` → `base.css`
- digital-life 深色 `--bg-sidebar: #161616` 例外，按页覆盖保留在 view 内

## 布局还原

原型把页面布局写在 `body` 上，SPA 统一落到 `#app` + `<html>`，按路由 `meta.layout` 切换：

| layout 类 | 对应原型 body 规则 | 页面 |
|-----------|-------------------|------|
| `layout-flow` | 默认文档流 | articles / detail / resume |
| `layout-column` | `min-height:100vh; display:flex; flex-direction:column` | home / about / xiaoji |
| `layout-fixed` | `height:100vh; overflow:hidden; display:flex; flex-direction:column` + `html{height:100%}` | digital-life |

## 运行

```bash
npm install      # 已完成
npm run dev      # 开发：http://localhost:5174
npm run build    # 生产构建 → dist/
npm run preview  # 预览构建产物
```

## 已知限制

1. 数字生命页移动端 `100dvh` 已在 `base.css` 全局支持（原型 `@supports` 规则上提）。
2. 简历页打印样式中 `body{background:#fff;color:#000}` 用 `:global(body)` 穿透 scoped，仅打印时全局生效。
3. 文章详情正文采用模板 HTML（非 `v-html`）以确保 scoped 样式作用到代码块/引用等元素。
4. 外链图片（picsum.photos）在离线/无网环境下显示为占位框。
