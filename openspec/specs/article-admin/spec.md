# article-admin Specification

## Purpose
TBD - created by archiving change article-admin-left-category-filter. Update Purpose after archive.
## Requirements
### Requirement: 左侧分类管理侧栏
文章管理页 MUST 移除上方的分类标签栏（"全部、12、AI工程化…"），改为页面左侧的分类管理侧栏，展示分类树（含"全部"节点），点击分类节点即筛选右侧文章列表。

#### Scenario: 移除顶部分类标签栏
- **WHEN** 用户打开后台文章管理页
- **THEN** 页面顶部不再显示分类 Tab 标签栏，仅保留左侧分类管理侧栏与右侧列表区

#### Scenario: 点击分类切换右侧列表
- **WHEN** 用户点击左侧分类侧栏中的某个分类节点（如"AI工程化"）
- **THEN** 右侧文章列表刷新为该分类下的文章，且当前节点高亮为选中态

#### Scenario: 点击"全部"恢复全量
- **WHEN** 用户点击左侧"全部"节点
- **THEN** 右侧列表恢复为不按分类过滤的全部文章（等价于不传 `categoryKey`）

### Requirement: 分类/搜索/状态共用同一列表接口
分类筛选、搜索与状态筛选 MUST 统一通过同一个后端列表接口 `GET /admin/articles` 生效，分别使用 `categoryKey`、`search`、`status` 查询参数；分类筛选 MUST 真实传入后端（而非前端本地过滤）。任一筛选变化 MUST 重置分页并从第一页重新拉取。

#### Scenario: 分类作为 categoryKey 传入后端
- **WHEN** 用户在左侧选择了某分类并触发列表刷新
- **THEN** 请求为 `GET /admin/articles?categoryKey=<该分类key>`，返回数据由后端按分类过滤

#### Scenario: 搜索与状态沿用同一接口
- **WHEN** 用户输入搜索词或切换状态（已发布/草稿/全部）
- **THEN** 请求仍为 `GET /admin/articles`，并携带对应 `search`/`status` 参数，与分类参数可组合

#### Scenario: 筛选变化重置分页
- **WHEN** 分类、搜索或状态中任一条件发生变化
- **THEN** 列表重置为第一页（`page=1`）并清空已加载内容后重新请求

### Requirement: 滚动加载分页（50 条/页）
文章列表 MUST 采用滚动加载分页：每页 `pageSize=50`，首屏加载第一页；当用户滚动至列表底部且仍有更多数据时，自动加载下一页并追加到列表；到达末页后展示"没有更多了"。

#### Scenario: 首屏加载 50 条
- **WHEN** 用户进入文章管理页（或重置筛选后）
- **THEN** 发起 `GET /admin/articles?pageSize=50&page=1`，列表渲染返回的前 50 条

#### Scenario: 滚动到底自动加载更多
- **WHEN** 用户滚动列表至底部且 `page < totalPages`
- **THEN** `page` 自增并请求下一页，返回 `items` 追加到现有列表末尾，总数不变

#### Scenario: 到底显示结束态
- **WHEN** 当前 `page` 已达到 `totalPages`
- **THEN** 不再发起请求，列表底部显示"没有更多了"

#### Scenario: 加载与错误状态
- **WHEN** 正在加载下一页或请求失败
- **THEN** 分别显示"加载中…"提示或提供重试入口，且不重复发起并发请求

### Requirement: 写操作保持接入后端
文章的新建、编辑、删除、发布/草稿切换 MUST 继续调用既有后端接口（`POST/PUT/DELETE /admin/articles/...`），操作后列表与后端保持一致。

#### Scenario: 删除后刷新列表
- **WHEN** 用户删除某篇文章
- **THEN** 调用 `DELETE /admin/articles/:id` 成功后，当前筛选条件下的列表同步更新（移除该项或重新拉取首页）

