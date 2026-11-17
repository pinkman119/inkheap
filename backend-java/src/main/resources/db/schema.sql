-- =====================================================================
-- INKHEAP 数据库结构（与 backend-node/prisma/schema.prisma 一一对应）
-- 用途：
--   1) 本地/新环境建库时执行（生产沿用已有库，不执行）
--   2) 作为 Java 实体与 Prisma 模型的字段对照文档，避免两边漂移
-- 说明：
--   - 无物理外键，全部逻辑关联（与 Prisma 保持一致）
--   - created_at / updated_at 均为应用层维护，不加数据库 ON UPDATE 触发器
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------- 管理端用户 -------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT NOT NULL UNIQUE,
    password      TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'admin',
    avatar        TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    remark        TEXT,
    status        TEXT NOT NULL DEFAULT 'active'
);

-- ------------------------- 文章 -------------------------
CREATE TABLE IF NOT EXISTS articles (
    id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    slug               TEXT NOT NULL UNIQUE,
    title              TEXT NOT NULL,
    summary            TEXT,
    content            TEXT NOT NULL,
    cover_image        TEXT,
    category_key       TEXT NOT NULL,
    tags               TEXT NOT NULL DEFAULT '[]',
    author             TEXT NOT NULL,
    author_url         TEXT,
    published          BOOLEAN NOT NULL DEFAULT FALSE,
    featured           BOOLEAN NOT NULL DEFAULT FALSE,
    view_count         INTEGER NOT NULL DEFAULT 0,
    virtual_view_count INTEGER,
    type               TEXT NOT NULL DEFAULT 'article',
    sort_order         INTEGER NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    train_type         INTEGER NOT NULL DEFAULT 0
);

-- ------------------------- 首页配置（单例） -------------------------
CREATE TABLE IF NOT EXISTS home_page (
    id                 TEXT PRIMARY KEY DEFAULT 'home',
    site_name          TEXT NOT NULL DEFAULT 'INKHEAP',
    person_title       TEXT NOT NULL DEFAULT 'Digital Gardener & Lifelong Learner',
    code_content       TEXT NOT NULL DEFAULT '',
    work_person_title  TEXT NOT NULL DEFAULT '',
    work_code_content  TEXT NOT NULL DEFAULT '',
    life_person_title  TEXT NOT NULL DEFAULT '',
    life_code_content  TEXT NOT NULL DEFAULT '',
    avatar             TEXT,
    social_links       TEXT NOT NULL DEFAULT '[]',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------- 上传文件 -------------------------
CREATE TABLE IF NOT EXISTS files (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    filename      TEXT NOT NULL,
    original_name TEXT,
    url           TEXT NOT NULL UNIQUE,
    mime_type     TEXT,
    size          INTEGER NOT NULL,
    relative_path TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------- 简历版本 -------------------------
CREATE TABLE IF NOT EXISTS resume (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL DEFAULT '默认版本',
    content    TEXT NOT NULL DEFAULT '{}',
    -- 注意：Prisma 模型中 isActive 未声明 @map，库内列名就是驼峰 "isActive"
    "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    train_type INTEGER NOT NULL DEFAULT 0
);

-- ------------------------- 文章分类 -------------------------
CREATE TABLE IF NOT EXISTS categories (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    key        TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    parent_key TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    icon       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------- 小记 -------------------------
CREATE TABLE IF NOT EXISTS blogs (
    id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    slug               TEXT NOT NULL UNIQUE,
    title              TEXT NOT NULL,
    type               TEXT NOT NULL DEFAULT 'album',
    tags               TEXT NOT NULL DEFAULT '[]',
    content            TEXT NOT NULL DEFAULT '',
    summary            TEXT,
    quote              TEXT,
    location           TEXT,
    "date"             TEXT,
    photos             TEXT NOT NULL DEFAULT '[]',
    published          BOOLEAN NOT NULL DEFAULT FALSE,
    view_count         INTEGER NOT NULL DEFAULT 0,
    virtual_view_count INTEGER,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    train_type         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS blog_categories (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    key        TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------- 关于我 -------------------------
CREATE TABLE IF NOT EXISTS about_profile (
    id               TEXT PRIMARY KEY DEFAULT 'about',
    kicker           TEXT NOT NULL DEFAULT 'About Me',
    lede             TEXT NOT NULL DEFAULT '',
    evaluation_quote TEXT NOT NULL DEFAULT '',
    evaluation_by    TEXT NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    train_type       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS about_footprints (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    province   TEXT NOT NULL,
    place      TEXT NOT NULL,
    "time"     TEXT NOT NULL,
    location   TEXT NOT NULL,
    note       TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    train_type INTEGER NOT NULL DEFAULT 0,
    elevation  TEXT NOT NULL DEFAULT '—',
    blog_id    TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS about_travels (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    glyph      TEXT NOT NULL,
    place      TEXT NOT NULL,
    meta       TEXT NOT NULL,
    note       TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    train_type INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS about_events (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "date"     TIMESTAMPTZ NOT NULL,
    title      TEXT NOT NULL,
    "desc"     TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    train_type INTEGER NOT NULL DEFAULT 0,
    is_ring    BOOLEAN NOT NULL DEFAULT FALSE
);

-- ------------------------- 访问统计 -------------------------
CREATE TABLE IF NOT EXISTS site_visits (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    day        TIMESTAMPTZ NOT NULL UNIQUE,
    count      INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visit_logs (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    day        TIMESTAMPTZ NOT NULL,
    ip         TEXT NOT NULL,
    region     TEXT NOT NULL DEFAULT '未知',
    path       TEXT NOT NULL DEFAULT '/',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visit_logs_created_at_idx ON visit_logs (created_at);
CREATE INDEX IF NOT EXISTS visit_logs_ip_idx ON visit_logs (ip);

CREATE TABLE IF NOT EXISTS content_views (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL,
    target_id   TEXT NOT NULL,
    ip          TEXT NOT NULL,
    day         TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (target_type, target_id, ip, day)
);
CREATE INDEX IF NOT EXISTS content_views_target_type_day_idx ON content_views (target_type, day);
CREATE INDEX IF NOT EXISTS content_views_created_at_idx ON content_views (created_at);

-- ------------------------- 联系我 -------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT,
    email      TEXT,
    phone      TEXT,
    subject    TEXT,
    message    TEXT NOT NULL,
    "read"     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    contact    TEXT
);
CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON contact_messages (created_at);

-- ------------------------- 微信用户 -------------------------
CREATE TABLE IF NOT EXISTS wechat_users (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    openid     TEXT NOT NULL UNIQUE,
    nickname   TEXT NOT NULL DEFAULT '微信用户',
    avatar     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------- 数字生命：会话消息 -------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    TEXT NOT NULL,
    session_id TEXT,
    role       TEXT NOT NULL,
    content    TEXT NOT NULL,
    ip         TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_session_id_created_at_idx ON chat_messages (user_id, session_id, created_at);

-- ------------------------- 数字生命：模型配置 -------------------------
CREATE TABLE IF NOT EXISTS dl_models (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    provider    TEXT NOT NULL,
    model_id    TEXT NOT NULL,
    enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    api_key_enc TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    "type"      TEXT NOT NULL DEFAULT 'general'
);

-- ------------------------- 数字生命：人格 -------------------------
CREATE TABLE IF NOT EXISTS dl_personas (
    id               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    greeting         TEXT NOT NULL DEFAULT '',
    description      TEXT NOT NULL DEFAULT '',
    basic_info       TEXT NOT NULL DEFAULT '',
    style_hint       TEXT NOT NULL DEFAULT '',
    accent_color     TEXT NOT NULL DEFAULT '#2d8264',
    avatar_emoji     TEXT NOT NULL DEFAULT '',
    personality_type TEXT NOT NULL DEFAULT '',
    sort_order       INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------- 数字生命：向量 -------------------------
CREATE TABLE IF NOT EXISTS dl_vectors (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref_type    TEXT NOT NULL,
    ref_id      TEXT NOT NULL,
    chunk_index INT NOT NULL,
    content     TEXT NOT NULL,
    embedding   VECTOR(1024) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ref_type, ref_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS dl_vectors_embedding_idx ON dl_vectors USING hnsw (embedding vector_cosine_ops);

-- ------------------------- 页脚 -------------------------
CREATE TABLE IF NOT EXISTS footer_links (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "type"     TEXT NOT NULL,
    mode       INTEGER NOT NULL DEFAULT 0,
    label      TEXT NOT NULL,
    url        TEXT NOT NULL,
    icon       TEXT,
    svg        TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS footer_links_type_sort_order_idx ON footer_links ("type", sort_order);

CREATE TABLE IF NOT EXISTS footer_config (
    id         TEXT PRIMARY KEY DEFAULT 'footer',
    icp_no     TEXT NOT NULL DEFAULT '',
    icp_url    TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------- 友链 -------------------------
CREATE TABLE IF NOT EXISTS friend_links (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL,
    url            TEXT NOT NULL,
    avatar         TEXT,
    "desc"         TEXT,
    tag            TEXT,
    "group"        TEXT,
    message        TEXT,
    mode           INTEGER NOT NULL DEFAULT 0,
    status         TEXT NOT NULL DEFAULT 'active',
    is_self        BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    application_id TEXT UNIQUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS friend_links_sort_order_created_at_idx ON friend_links (sort_order, created_at);

CREATE TABLE IF NOT EXISTS friend_applications (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    url        TEXT NOT NULL,
    avatar     TEXT,
    "type"     TEXT NOT NULL DEFAULT '其他',
    message    TEXT,
    status     TEXT NOT NULL DEFAULT 'pending',
    remark     TEXT,
    link_id    TEXT,
    handled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS friend_applications_status_created_at_idx ON friend_applications (status, created_at);

-- ------------------------- 访客账号（邮箱注册） -------------------------
CREATE TABLE IF NOT EXISTS email_users (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    email        TEXT NOT NULL UNIQUE,
    password     TEXT NOT NULL,
    nickname     TEXT NOT NULL,
    homepage_url TEXT,
    avatar_url   TEXT,
    status       TEXT NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------- 评论 -------------------------
CREATE TABLE IF NOT EXISTS comments (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type    TEXT NOT NULL,
    target_id      TEXT NOT NULL,
    user_id        TEXT NOT NULL,
    content        TEXT NOT NULL,
    parent_id      TEXT,
    reply_to_user_id TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_target_type_target_id_created_at_idx ON comments (target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON comments (parent_id);

-- ------------------------- 站点配置（单例） -------------------------
CREATE TABLE IF NOT EXISTS site_config (
    id               TEXT PRIMARY KEY DEFAULT 'site',
    site_url         TEXT NOT NULL DEFAULT '',
    site_title       TEXT NOT NULL DEFAULT '',
    site_description TEXT NOT NULL DEFAULT '',
    author           TEXT NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------- 迁移标记（非 Prisma 管理） -------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
