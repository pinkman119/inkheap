## ADDED Requirements

### Requirement: 后台分类管理页面入口
系统 SHALL 在 admin 侧边栏"知识库"分组下提供"分类管理"菜单项，路由为 `/admin/categories`，且位于"文章管理"菜单项上方。原"内容"分组名称 SHALL 改为"知识库"。

#### Scenario: 访问分类管理页面
- **WHEN** 管理员登录后点击侧边栏"知识库 › 分类管理"
- **THEN** 系统打开分类管理页面，展示分类树形列表

#### Scenario: 侧边栏分组改名
- **WHEN** 管理员查看侧边栏
- **THEN** 原"内容"分组显示为"知识库"，其下顺序为：分类管理（上）、文章管理（下）

### Requirement: 分类树形列表展示
分类管理页面 SHALL 以可折叠树形列表展示所有分类（最多三级），每个节点显示：名称、key、该分类下文章数、以及操作按钮（添加子级、编辑、删除）。

#### Scenario: 展示分类树与文章数
- **WHEN** 分类管理页面加载
- **THEN** 系统展示从 `/admin/categories`（含 `articleCount`）构建的树，每个节点右侧显示文章数 `(N)`

#### Scenario: 折叠与展开
- **WHEN** 管理员点击含子级的节点折叠图标
- **THEN** 其子级隐藏；再次点击展开

### Requirement: 新建分类
系统 SHALL 提供 Modal 弹窗用于新建分类，字段包含：名称、key（自动从名称生成且可手改）、父级（下拉选择，可不选表示一级）、排序、图标。

#### Scenario: 新建一级分类
- **WHEN** 管理员点击"新建一级分类"并填写名称后提交
- **THEN** 系统调用 `POST /admin/categories` 创建分类，树形列表刷新出现新节点

#### Scenario: 新建子分类
- **WHEN** 管理员在某一节点点击"添加子级"并填写表单提交
- **THEN** 系统以该节点 key 作为 `parentKey` 创建子分类，新节点出现在父级下

### Requirement: 编辑分类
系统 SHALL 提供 Modal 弹窗编辑选中分类的名称、父级、排序、图标；key 字段 SHALL 在创建后不可修改。

#### Scenario: 编辑非 key 字段
- **WHEN** 管理员点击某节点"编辑"并修改名称后保存
- **THEN** 系统调用 `PUT /admin/categories/:id` 更新，列表对应节点名称更新，key 不变

#### Scenario: key 不可修改
- **WHEN** 管理员打开编辑弹窗
- **THEN** key 输入框为禁用/只读状态

### Requirement: 三级深度软约束
系统 SHALL 在第 3 层（最深）分类节点的"添加子级"按钮上禁用，防止 UI 创建第 4 级；后端 `depth <= 3` 约束继续作为兜底。

#### Scenario: 第三层禁用添加子级
- **WHEN** 某分类已处于第三层
- **THEN** 该节点的"添加子级"按钮禁用且不可点击

### Requirement: 删除分类保护
系统 SHALL 在分类下存在文章时禁用其"删除"按钮；其余情况点击删除后弹确认框，确认后调用 `DELETE /admin/categories/:id`。

#### Scenario: 有文章时禁用删除
- **WHEN** 某分类 `articleCount > 0`
- **THEN** 该节点"删除"按钮禁用，提示"该分类下存在文章，无法删除"

#### Scenario: 无文章时删除成功
- **WHEN** 管理员对 `articleCount = 0` 的分类点击删除并确认
- **THEN** 系统删除分类，树形列表移除该节点
