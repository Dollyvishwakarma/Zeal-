-- ═══════════════════════════════════════════════════════════════════════════════
-- ZEAL — CONSOLIDATED SCHEMA (replaces Prisma)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('USER','CLIENT_ADMIN','SUPER_ADMIN','ADMIN','SUPPORT','VIEWER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ConsultantStatus" AS ENUM ('PENDING','VERIFIED','REJECTED','SUSPENDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ConsultantCategory" AS ENUM ('ASTROLOGER','PSYCHOLOGIST','TAROT','NUMEROLOGIST','PALMIST','VASTU','REIKI','LIFE_COACH','MOTIVATIONAL_SPEAKER','SPIRITUAL_GUIDE','YOGA_INSTRUCTOR','HEALER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Faith" AS ENUM ('HINDU','ISLAM','CHRISTIAN','BUDDHIST','JEWISH','SIKH','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BookingStatus" AS ENUM ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','MISSED','DISPUTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CallStatus" AS ENUM ('INITIATED','CONNECTED','ENDED','RECORDING_READY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TransactionType" AS ENUM ('TOPUP','PAYMENT','REFUND','PAYOUT','FEE','COMMISSION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "username" TEXT NOT NULL UNIQUE,
  "name" TEXT, "avatar" TEXT, "role" "Role" NOT NULL DEFAULT 'USER',
  "sparks" INTEGER NOT NULL DEFAULT 0, "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

CREATE TABLE IF NOT EXISTS "UserPreferences" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "interests" TEXT[] NOT NULL DEFAULT '{}', "goals" TEXT[] NOT NULL DEFAULT '{}',
  "favoriteConsultants" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "UserActivity" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "consultantId" TEXT, "type" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "UserActivity_user_idx" ON "UserActivity"("userId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "Wallet" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "balance" DOUBLE PRECISION NOT NULL DEFAULT 0, "escrow" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pendingIn" DOUBLE PRECISION NOT NULL DEFAULT 0, "pendingOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "blocked" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "walletId" TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE CASCADE,
  "type" "TransactionType" NOT NULL, "amount" DOUBLE PRECISION NOT NULL,
  "balance" DOUBLE PRECISION NOT NULL, "description" TEXT NOT NULL,
  "referenceId" TEXT, "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Transaction_wallet_idx" ON "Transaction"("walletId", "createdAt" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_reference_unique" ON "Transaction"("referenceId") WHERE "referenceId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "Consultant" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "category" "ConsultantCategory" NOT NULL, "specialties" TEXT[] NOT NULL DEFAULT '{}',
  "languages" TEXT[] NOT NULL DEFAULT '{}', "bio" TEXT,
  "perMinuteRate" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "isVerified" BOOLEAN NOT NULL DEFAULT false, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "faith" "Faith" NOT NULL DEFAULT 'HINDU', "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalConsultations" INTEGER NOT NULL DEFAULT 0, "earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "availability" JSONB NOT NULL DEFAULT '{}',
  "status" "ConsultantStatus" NOT NULL DEFAULT 'PENDING', "verificationDocs" JSONB,
  "rejectionReason" TEXT, "approvedBy" TEXT, "approvedAt" TIMESTAMPTZ,
  "subdomain" TEXT UNIQUE, "subdomainActive" BOOLEAN NOT NULL DEFAULT false,
  "whiteLabelEnabled" BOOLEAN NOT NULL DEFAULT false, "theme" JSONB,
  "chatRate" DOUBLE PRECISION DEFAULT 50, "audioRate" DOUBLE PRECISION DEFAULT 75,
  "videoRate" DOUBLE PRECISION DEFAULT 100, "physicalRate" DOUBLE PRECISION DEFAULT 150,
  "bufferMinutes" INTEGER NOT NULL DEFAULT 10,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Consultant_status_idx" ON "Consultant"("status", "isActive");
CREATE INDEX IF NOT EXISTS "Consultant_category_idx" ON "Consultant"("category");

CREATE TABLE IF NOT EXISTS "AIConsultant" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "name" TEXT NOT NULL, "username" TEXT NOT NULL UNIQUE, "avatar" TEXT NOT NULL,
  "category" TEXT NOT NULL, "isPaid" BOOLEAN NOT NULL DEFAULT false,
  "perMinuteRate" INTEGER NOT NULL DEFAULT 0, "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.7,
  "experience" INTEGER NOT NULL DEFAULT 100, "totalConsultations" INTEGER NOT NULL DEFAULT 0,
  "sparks" INTEGER NOT NULL DEFAULT 50000, "bio" TEXT NOT NULL,
  "specialties" TEXT[] NOT NULL DEFAULT '{}', "languages" TEXT[] NOT NULL DEFAULT '{}',
  "model" TEXT NOT NULL, "responseTime" INTEGER NOT NULL DEFAULT 200,
  "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0.95, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "gender" TEXT DEFAULT 'neutral', "persona" TEXT, "voiceStyle" TEXT,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "AIConsultant_active_idx" ON "AIConsultant"("isActive", "category");

CREATE TABLE IF NOT EXISTS "Booking" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "consultantId" TEXT NOT NULL REFERENCES "Consultant"("id") ON DELETE RESTRICT,
  "scheduledAt" TIMESTAMPTZ NOT NULL, "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "status" "BookingStatus" NOT NULL DEFAULT 'PENDING', "meetingLink" TEXT,
  "externalEmail" TEXT, "paymentId" TEXT, "amount" DOUBLE PRECISION NOT NULL,
  "platformFee" DOUBLE PRECISION NOT NULL, "consultantEarning" DOUBLE PRECISION NOT NULL,
  "rating" INTEGER, "review" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Booking_user_idx" ON "Booking"("userId", "scheduledAt" DESC);
CREATE INDEX IF NOT EXISTS "Booking_consultant_idx" ON "Booking"("consultantId", "scheduledAt" DESC);
CREATE INDEX IF NOT EXISTS "Booking_status_idx" ON "Booking"("status");

CREATE TABLE IF NOT EXISTS "CallSession" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "bookingId" TEXT UNIQUE REFERENCES "Booking"("id") ON DELETE SET NULL,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "consultantId" TEXT REFERENCES "Consultant"("id") ON DELETE SET NULL,
  "isAI" BOOLEAN NOT NULL DEFAULT false,
  "aiConsultantId" TEXT REFERENCES "AIConsultant"("id") ON DELETE SET NULL,
  "startTime" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "endTime" TIMESTAMPTZ,
  "durationSeconds" INTEGER NOT NULL DEFAULT 0, "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" "CallStatus" NOT NULL DEFAULT 'INITIATED', "recordingUrl" TEXT,
  "recordingReady" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "CallSession_target_check" CHECK (
    ("isAI" = true AND "aiConsultantId" IS NOT NULL) OR
    ("isAI" = false AND "consultantId" IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS "CallSession_user_idx" ON "CallSession"("userId");
CREATE INDEX IF NOT EXISTS "CallSession_consultant_idx" ON "CallSession"("consultantId");

CREATE TABLE IF NOT EXISTS "Post" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "content" TEXT NOT NULL, "mediaUrls" TEXT[] NOT NULL DEFAULT '{}',
  "authorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "cheerCount" INTEGER NOT NULL DEFAULT 0, "commentCount" INTEGER NOT NULL DEFAULT 0,
  "shareCount" INTEGER NOT NULL DEFAULT 0, "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "isFlagged" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Post_author_idx" ON "Post"("authorId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Post_feed_idx" ON "Post"("createdAt" DESC) WHERE "isFlagged" = false;

CREATE TABLE IF NOT EXISTS "Comment" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "content" TEXT NOT NULL,
  "authorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "postId" TEXT NOT NULL REFERENCES "Post"("id") ON DELETE CASCADE,
  "parentId" TEXT REFERENCES "Comment"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Comment_post_idx" ON "Comment"("postId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "Cheer" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "postId" TEXT NOT NULL REFERENCES "Post"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE ("userId", "postId")
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL, "message" TEXT NOT NULL, "redirectUrl" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Notification_user_idx" ON "Notification"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Notification_unread_idx" ON "Notification"("userId") WHERE "read" = false;

CREATE TABLE IF NOT EXISTS "Conversation" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "userAId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "userBId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "lastMessageAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "lastMessageText" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("userAId", "userBId")
);
CREATE INDEX IF NOT EXISTS "Conversation_userA_idx" ON "Conversation"("userAId", "lastMessageAt" DESC);
CREATE INDEX IF NOT EXISTS "Conversation_userB_idx" ON "Conversation"("userBId", "lastMessageAt" DESC);

CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL, "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "ChatMessage_conv_idx" ON "ChatMessage"("conversationId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "userId" TEXT, "email" TEXT, "action" TEXT NOT NULL,
  "targetType" TEXT, "targetId" TEXT, "metadata" JSONB, "ip" TEXT, "userAgent" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "AdminAuditLog_created_idx" ON "AdminAuditLog"("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "AdminInvite" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "email" TEXT NOT NULL, "role" "Role" NOT NULL DEFAULT 'VIEWER',
  "tokenHash" TEXT NOT NULL UNIQUE, "invitedBy" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL, "acceptedAt" TIMESTAMPTZ, "revokedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "AdminInvite_email_idx" ON "AdminInvite"("email");

CREATE TABLE IF NOT EXISTS "AdminLoginAttempt" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "email" TEXT NOT NULL, "ip" TEXT, "success" BOOLEAN NOT NULL,
  "reason" TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "DebugLog" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "level" TEXT NOT NULL, "channel" TEXT NOT NULL, "event" TEXT NOT NULL,
  "message" TEXT, "data" JSONB, "durationMs" INTEGER, "requestId" TEXT,
  "userId" TEXT, "route" TEXT
);
CREATE INDEX IF NOT EXISTS "DebugLog_created_idx" ON "DebugLog"("createdAt" DESC);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW."updatedAt" = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['User','UserPreferences','Wallet','Consultant','AIConsultant','Booking','CallSession','Post','Comment','Notification','Conversation'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()', t);
  END LOOP;
END$$;
