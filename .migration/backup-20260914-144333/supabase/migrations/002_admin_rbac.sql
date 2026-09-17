-- ═══════════════════════════════════════════════════════════════════════════
-- 002 · ADMIN RBAC
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "userId" TEXT,
  "email" TEXT,
  action TEXT NOT NULL,
  "targetType" TEXT,
  "targetId" TEXT,
  metadata JSONB,
  ip TEXT,
  "userAgent" TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AdminAuditLog_userId_idx" ON "AdminAuditLog"("userId");

CREATE TABLE IF NOT EXISTS "AdminInvite" (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  email TEXT NOT NULL,
  role "Role" NOT NULL DEFAULT 'VIEWER',
  "tokenHash" TEXT NOT NULL UNIQUE,
  "invitedBy" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "acceptedAt" TIMESTAMPTZ,
  "revokedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "AdminInvite_email_idx" ON "AdminInvite"(email);

CREATE TABLE IF NOT EXISTS "AdminLoginAttempt" (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  email TEXT NOT NULL,
  ip TEXT,
  success BOOLEAN NOT NULL,
  reason TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "AdminLoginAttempt_email_created_idx" ON "AdminLoginAttempt"(email,"createdAt" DESC);

ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminLoginAttempt" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON "AdminAuditLog" TO service_role;
GRANT ALL ON "AdminInvite" TO service_role;
GRANT ALL ON "AdminLoginAttempt" TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_admin_logs()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM "AdminAuditLog" WHERE "createdAt" < NOW() - INTERVAL '90 days';
  DELETE FROM "AdminLoginAttempt" WHERE "createdAt" < NOW() - INTERVAL '90 days';
  DELETE FROM "AdminInvite" WHERE "expiresAt" < NOW() - INTERVAL '90 days' AND "acceptedAt" IS NULL;
END;
$$;
