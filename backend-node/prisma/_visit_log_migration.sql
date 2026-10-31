-- 新增访客明细表（与 schema.prisma 中 VisitLog 模型一致）
CREATE TABLE IF NOT EXISTS "visit_logs" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMPTZ(3) NOT NULL,
    "ip" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT '未知',
    "path" TEXT NOT NULL DEFAULT '/',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "visit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "visit_logs_created_at_idx" ON "visit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "visit_logs_ip_idx" ON "visit_logs"("ip");
