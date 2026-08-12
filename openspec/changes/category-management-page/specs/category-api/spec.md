## MODIFIED Requirements

### Requirement: 分类列表返回文章数
`GET /admin/categories` 接口 SHALL 在返回的每个分类对象中附带 `articleCount` 字段，表示该分类下直接归属的文章数量（不含子孙分类的文章）。

#### Scenario: 列表包含文章数
- **WHEN** 客户端请求 `GET /admin/categories`
- **THEN** 响应数组中每个分类对象包含 `articleCount` 数字字段，值与 `DELETE` 时用于校验的文章计数口径一致（仅直接归属）

#### Scenario: 向后兼容
- **WHEN** 现有调用方（如无需文章数的场景）请求该接口
- **THEN** 接口原有字段与行为不变，仅新增 `articleCount` 附加字段，不破坏现有 `/tree` 与文章列表页逻辑
