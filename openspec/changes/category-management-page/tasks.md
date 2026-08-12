## 1. 后端：分类列表附带文章数

- [ ] 1.1 在 `CategoryService.findAll` 中为每个分类统计直接归属的文章数，附加 `articleCount` 字段返回
- [ ] 1.2 验证现有 `/tree` 与文章列表页调用 `findAll` 不受破坏（仅附加字段，向后兼容）

## 2. 前端：侧边栏与路由

- [ ] 2.1 在 `AdminShell.vue` 将"内容"分组 label 改为"知识库"
- [ ] 2.2 在 `AdminShell.vue` 的"知识库"分组下新增"分类管理"菜单项，路由 `/admin/categories`，位于"文章管理"之上
- [ ] 2.3 在 `router/index.js` 注册 `/admin/categories` 路由指向新建的 `CategoryManageView`

## 3. 前端：分类管理页面

- [ ] 3.1 新建 `CategoryManageView.vue`，调用 `GET /admin/categories` 获取含 `articleCount` 的列表并构建树
- [ ] 3.2 实现可折叠树形列表渲染，每个节点显示名称、key、文章数 `(N)`
- [ ] 3.3 实现 Modal 弹窗新建分类（字段：名称、key 自动生成可改、父级下拉、排序、图标），提交 `POST /admin/categories`
- [ ] 3.4 实现 Modal 弹窗编辑分类（名称、父级、排序、图标可改；key 只读），提交 `PUT /admin/categories/:id`
- [ ] 3.5 第 3 层节点禁用"添加子级"按钮（前端软约束三级深度）
- [ ] 3.6 实现删除：有文章（`articleCount > 0`）禁用删除并提示；否则弹确认框后 `DELETE /admin/categories/:id`
- [ ] 3.7 处理后端返回的校验/约束错误（包括越级创建被后端拦截时）为友好提示

## 4. 验证

- [ ] 4.1 访问 `/admin/categories` 可创建并展示最多三级分类树
- [ ] 4.2 第 3 层无法添加子级；有文章的分类无法删除
- [ ] 4.3 树节点正确显示各分类文章数
- [ ] 4.4 侧边栏分组显示"知识库"且顺序为分类管理在上、文章管理在下
