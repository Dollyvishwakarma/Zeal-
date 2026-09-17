-- ═══════════════════════════════════════════════════════════════════════════
-- 001 · RECONCILE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
-- Fixes enum drift, adds AIConsultant table, white-label columns.
-- Idempotent — safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsultantStatus') THEN
    CREATE TYPE "ConsultantStatus" AS ENUM ('PENDING','VERIFIED','REJECTED','SUSPENDED');
  END IF;
END $$;

DO $$ BEGIN
  BEGIN ALTER TYPE "ConsultantCategory" ADD VALUE IF NOT EXISTS 'MOTIVATIONAL_SPEAKER'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE "ConsultantCategory" ADD VALUE IF NOT EXISTS 'SPIRITUAL_GUIDE';      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE "ConsultantCategory" ADD VALUE IF NOT EXISTS 'YOGA_INSTRUCTOR';      EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

DO $$ BEGIN
  BEGIN ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CLIENT_ADMIN'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN';        EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPPORT';      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VIEWER';       EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

UPDATE "User" SET role = 'CLIENT_ADMIN' WHERE role::text = 'HEALER';
UPDATE "User" SET role = 'SUPER_ADMIN'  WHERE role::text = 'ADMIN';

CREATE TABLE IF NOT EXISTS "AIConsultant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "avatar" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "isPaid" BOOLEAN NOT NULL DEFAULT false,
  "perMinuteRate" INTEGER NOT NULL DEFAULT 0,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.7,
  "experience" INTEGER NOT NULL DEFAULT 100,
  "totalConsultations" INTEGER NOT NULL DEFAULT 0,
  "sparks" INTEGER NOT NULL DEFAULT 50000,
  "bio" TEXT NOT NULL,
  "specialties" TEXT[],
  "languages" TEXT[],
  "model" TEXT NOT NULL,
  "responseTime" INTEGER NOT NULL DEFAULT 200,
  "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "gender" TEXT DEFAULT 'neutral',
  "persona" TEXT,
  "voiceStyle" TEXT,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AIConsultant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AIConsultant_username_key" ON "AIConsultant"("username");
CREATE INDEX IF NOT EXISTS "AIConsultant_isActive_idx" ON "AIConsultant"("isActive","category");

ALTER TABLE "Consultant" ADD COLUMN IF NOT EXISTS "status"            "ConsultantStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Consultant" ADD COLUMN IF NOT EXISTS "verificationDocs"  JSONB;
ALTER TABLE "Consultant" ADD COLUMN IF NOT EXISTS "rejectionReason"   TEXT;
ALTER TABLE "Consultant" ADD COLUMN IF NOT EXISTS "approvedBy"        TEXT;
ALTER TABLE "Consultant" ADD COLUMN IF NOT EXISTS "approvedAt"        TIMESTAMP(3);
ALTER TABLE "Consultant" ADD COLUMN IF NOT EXISTS "subdomain"         TEXT;
ALTER TABLE "Consultant" ADD COLUMN IF NOT EXISTS "subdomainActive"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Consultant" ADD COLUMN IF NOT EXISTS "whiteLabelEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Consultant" ADD COLUMN IF NOT EXISTS "theme"             JSONB;
ALTER TABLE "Consultant" ADD COLUMN IF NOT EXISTS "chatRate"          DOUBLE PRECISION DEFAULT 50;
ALTER TABLE "Consultant" ADD COLUMN IF NOT EXISTS "audioRate"         DOUBLE PRECISION DEFAULT 75;
ALTER TABLE "Consultant" ADD COLUMN IF NOT EXISTS "videoRate"         DOUBLE PRECISION DEFAULT 100;
ALTER TABLE "Consultant" ADD COLUMN IF NOT EXISTS "physicalRate"      DOUBLE PRECISION DEFAULT 150;
ALTER TABLE "Consultant" ADD COLUMN IF NOT EXISTS "bufferMinutes"     INTEGER NOT NULL DEFAULT 10;
CREATE UNIQUE INDEX IF NOT EXISTS "Consultant_subdomain_key" ON "Consultant"("subdomain") WHERE "subdomain" IS NOT NULL;

ALTER TABLE "CallSession" ALTER COLUMN "consultantId" DROP NOT NULL;
