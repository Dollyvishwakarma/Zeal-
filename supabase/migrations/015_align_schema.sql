-- =============================================================================
-- 015_align_schema.sql
-- Aligns live Supabase schema (profiles, session_messages, sparks, etc.) with
-- the Zeal codebase expectations (User, Wallet, Consultant, Booking, Transaction,
-- Conversation, Message, Post).
--
-- Safe: idempotent, preserves data, creates compat views.
-- =============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. USER TABLE — rename profiles, add compat view
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='profiles')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                     WHERE table_schema='public' AND table_name='User') THEN
    ALTER TABLE public.profiles RENAME TO "User";
    RAISE NOTICE 'Renamed profiles → User';
  END IF;
END $$;

-- Add missing columns (safe if already present)
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "sparkScore" BIGINT DEFAULT 0;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS name TEXT;

-- Populate derived columns
UPDATE public."User" SET username = SPLIT_PART(email, '@', 1)
  WHERE username IS NULL AND email IS NOT NULL;
UPDATE public."User" SET name = full_name
  WHERE name IS NULL AND full_name IS NOT NULL;
UPDATE public."User" SET "sparkScore" = COALESCE(sparks, 0)
  WHERE "sparkScore" = 0 AND sparks IS NOT NULL;

-- Compat view for legacy code
DROP VIEW IF EXISTS public.profiles CASCADE;
CREATE OR REPLACE VIEW public.profiles AS
SELECT
  id, email, full_name, avatar_url, role, sparks, created_at, updated_at,
  wallet_balance, date_of_birth, gender, zodiac_sign, onboarding_completed,
  cover_url, is_ai, system_prompt, is_online
FROM public."User";

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. WALLET TABLE — extract wallet_balance from User
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public."Wallet" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE REFERENCES public."User"(id) ON DELETE CASCADE,
  balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  escrow DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pendingIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pendingOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
  blocked DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_userid ON public."Wallet"("userId");

INSERT INTO public."Wallet" ("userId", balance)
SELECT id, COALESCE(wallet_balance, 0) FROM public."User"
WHERE id IS NOT NULL
ON CONFLICT ("userId") DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. CONSULTANT TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public."Consultant" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE REFERENCES public."User"(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'ASTROLOGER',
  specialties TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  bio TEXT,
  "perMinuteRate" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "isVerified" BOOLEAN DEFAULT false,
  "isActive" BOOLEAN DEFAULT true,
  faith TEXT DEFAULT 'HINDU',
  rating DOUBLE PRECISION DEFAULT 0,
  "totalConsultations" INTEGER DEFAULT 0,
  earnings DOUBLE PRECISION DEFAULT 0,
  availability JSONB DEFAULT '{}',
  status TEXT DEFAULT 'PENDING',
  "verificationDocs" JSONB,
  "rejectionReason" TEXT,
  "approvedBy" UUID,
  "approvedAt" TIMESTAMPTZ,
  subdomain TEXT UNIQUE,
  "subdomainActive" BOOLEAN DEFAULT false,
  "whiteLabelEnabled" BOOLEAN DEFAULT false,
  theme JSONB,
  "chatRate" DOUBLE PRECISION DEFAULT 50,
  "audioRate" DOUBLE PRECISION DEFAULT 75,
  "videoRate" DOUBLE PRECISION DEFAULT 100,
  "physicalRate" DOUBLE PRECISION DEFAULT 150,
  "bufferMinutes" INTEGER DEFAULT 10,
  "sparkScore" BIGINT DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultant_status ON public."Consultant"(status, "isActive");
CREATE INDEX IF NOT EXISTS idx_consultant_category ON public."Consultant"(category);
CREATE INDEX IF NOT EXISTS idx_consultant_spark_score ON public."Consultant"("sparkScore" DESC);

-- Migrate from consultant_applications
INSERT INTO public."Consultant" ("userId", category, bio, "isVerified", "isActive", status, "createdAt")
SELECT
  ca.user_id,
  'ASTROLOGER',
  ca.bio,
  CASE WHEN ca.status = 'approved' THEN true ELSE false END,
  CASE WHEN ca.status = 'approved' THEN true ELSE false END,
  CASE
    WHEN ca.status = 'approved' THEN 'VERIFIED'
    WHEN ca.status = 'rejected' THEN 'REJECTED'
    ELSE 'PENDING'
  END,
  COALESCE(ca.created_at, NOW())
FROM public.consultant_applications ca
WHERE ca.user_id IS NOT NULL
ON CONFLICT ("userId") DO NOTHING;

-- Sync sparkScore from User.sparks
UPDATE public."Consultant" c
SET "sparkScore" = COALESCE(u."sparkScore", u.sparks, 0)
FROM public."User" u
WHERE c."userId" = u.id;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. BOOKING TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public."Booking" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES public."User"(id) ON DELETE SET NULL,
  "consultantId" UUID REFERENCES public."Consultant"(id) ON DELETE RESTRICT,
  "scheduledAt" TIMESTAMPTZ NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'PENDING',
  "meetingLink" TEXT,
  "externalEmail" TEXT,
  "paymentId" TEXT,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "consultantEarning" DOUBLE PRECISION NOT NULL DEFAULT 0,
  rating INTEGER,
  review TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_user ON public."Booking"("userId", "scheduledAt" DESC);
CREATE INDEX IF NOT EXISTS idx_booking_consultant ON public."Booking"("consultantId", "scheduledAt" DESC);
CREATE INDEX IF NOT EXISTS idx_booking_status ON public."Booking"(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. TRANSACTION TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public."Transaction" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "walletId" UUID NOT NULL REFERENCES public."Wallet"(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'PAYMENT',
  amount DOUBLE PRECISION NOT NULL,
  balance DOUBLE PRECISION NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  "referenceId" TEXT UNIQUE,
  metadata JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_wallet ON public."Transaction"("walletId", "createdAt" DESC);

-- Migrate wallet_ledger → Transaction
INSERT INTO public."Transaction" (id, "walletId", type, amount, balance, description, "referenceId", "createdAt")
SELECT
  wl.id,
  w.id,
  CASE
    WHEN wl.transaction_type = 'CREDIT' THEN 'TOPUP'
    WHEN wl.transaction_type = 'DEBIT' THEN 'PAYMENT'
    WHEN wl.transaction_type = 'REFUND' THEN 'REFUND'
    WHEN wl.transaction_type = 'HOLD' THEN 'PAYMENT'
    ELSE 'PAYMENT'
  END,
  wl.amount,
  w.balance,
  COALESCE(wl.gateway, 'Ledger') || ' — ' || wl.transaction_type,
  wl.reference_id,
  COALESCE(wl.created_at, NOW())
FROM public.wallet_ledger wl
JOIN public."Wallet" w ON w."userId" = wl.user_id
ON CONFLICT ("referenceId") DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. CONVERSATION + MESSAGE — migrate from session_requests + session_messages
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public."Conversation" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "lastMessageAt" TIMESTAMPTZ DEFAULT NOW(),
  "lastMessageText" TEXT,
  "isGroup" BOOLEAN DEFAULT false,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_conversation_last_message
  ON public."Conversation"("lastMessageAt" DESC);

CREATE TABLE IF NOT EXISTS public."ConversationParticipant" (
  "conversationId" UUID REFERENCES public."Conversation"(id) ON DELETE CASCADE,
  "userId" UUID REFERENCES public."User"(id) ON DELETE CASCADE,
  "joinedAt" TIMESTAMPTZ DEFAULT NOW(),
  "lastReadAt" TIMESTAMPTZ,
  role TEXT DEFAULT 'member',
  PRIMARY KEY ("conversationId", "userId")
);

CREATE INDEX IF NOT EXISTS idx_participant_user ON public."ConversationParticipant"("userId");
CREATE INDEX IF NOT EXISTS idx_participant_conv ON public."ConversationParticipant"("conversationId");

CREATE TABLE IF NOT EXISTS public."Message" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" UUID REFERENCES public."Conversation"(id) ON DELETE CASCADE,
  "senderId" UUID REFERENCES public."User"(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  metadata JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "editedAt" TIMESTAMPTZ,
  "deletedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_message_conv_created
  ON public."Message"("conversationId", "createdAt" DESC);

-- Migrate session_requests → Conversation + ConversationParticipant
DO $$
DECLARE
  sr RECORD;
BEGIN
  FOR sr IN SELECT * FROM public.session_requests
            WHERE seeker_id IS NOT NULL AND consultant_id IS NOT NULL
  LOOP
    INSERT INTO public."Conversation" (id, "createdAt", "lastMessageAt")
    VALUES (sr.id, COALESCE(sr.created_at, NOW()), COALESCE(sr.created_at, NOW()))
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public."ConversationParticipant" ("conversationId", "userId")
    VALUES (sr.id, sr.seeker_id), (sr.id, sr.consultant_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Migrate session_messages → Message
INSERT INTO public."Message" (id, "conversationId", "senderId", content, "createdAt")
SELECT
  sm.id,
  sm.session_id,
  sm.sender_id,
  sm.content,
  COALESCE(sm.created_at, NOW())
FROM public.session_messages sm
WHERE sm.session_id IN (SELECT id FROM public."Conversation")
ON CONFLICT (id) DO NOTHING;

-- Migrate `messages` (consultation chat) → Message (via consultations → conversation)
-- Skip: `messages.consultation_id` is TEXT, so we need a mapping
-- (This can be a later phase if needed — the schema is at least consistent now.)

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. POST — rename consultant_posts + add columns
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='consultant_posts')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                     WHERE table_schema='public' AND table_name='Post') THEN
    ALTER TABLE public.consultant_posts RENAME TO "Post";
    ALTER TABLE public."Post" RENAME COLUMN consultant_id TO "authorId";
    RAISE NOTICE 'Renamed consultant_posts → Post';
  END IF;
END $$;

ALTER TABLE public."Post" ADD COLUMN IF NOT EXISTS "mediaUrls" TEXT[] DEFAULT '{}';
ALTER TABLE public."Post" ADD COLUMN IF NOT EXISTS "cheerCount" INTEGER DEFAULT 0;
ALTER TABLE public."Post" ADD COLUMN IF NOT EXISTS "commentCount" INTEGER DEFAULT 0;
ALTER TABLE public."Post" ADD COLUMN IF NOT EXISTS "shareCount" INTEGER DEFAULT 0;
ALTER TABLE public."Post" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN DEFAULT false;
ALTER TABLE public."Post" ADD COLUMN IF NOT EXISTS "isFlagged" BOOLEAN DEFAULT false;
ALTER TABLE public."Post" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. NOTIFICATIONS — align columns
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS "userId" UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'system';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS "redirectUrl" TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS "actorId" UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();

UPDATE public.notifications SET "userId" = target_user_id
  WHERE "userId" IS NULL AND target_user_id IS NOT NULL;
UPDATE public.notifications SET read = is_read
  WHERE read = false AND is_read = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. AUDIT LOGS — rename + align
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='audit_logs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                     WHERE table_schema='public' AND table_name='AdminAuditLog') THEN
    ALTER TABLE public.audit_logs RENAME TO "AdminAuditLog";
  END IF;
END $$;

ALTER TABLE public."AdminAuditLog" ADD COLUMN IF NOT EXISTS "userId" UUID;
ALTER TABLE public."AdminAuditLog" ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public."AdminAuditLog" ADD COLUMN IF NOT EXISTS "targetType" TEXT;
ALTER TABLE public."AdminAuditLog" ADD COLUMN IF NOT EXISTS "targetId" TEXT;
ALTER TABLE public."AdminAuditLog" ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public."AdminAuditLog" ADD COLUMN IF NOT EXISTS ip TEXT;
ALTER TABLE public."AdminAuditLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE public."AdminAuditLog" ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true;

UPDATE public."AdminAuditLog" SET "targetType" = table_name WHERE "targetType" IS NULL;
UPDATE public."AdminAuditLog" SET "targetId" = record_id::TEXT WHERE "targetId" IS NULL;
UPDATE public."AdminAuditLog" SET metadata = jsonb_build_object('old', old_data, 'new', new_data)
  WHERE metadata IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. RLS — enable + policies
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Consultant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ConversationParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Post" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- User policies
DROP POLICY IF EXISTS "user_self_select" ON public."User";
CREATE POLICY "user_self_select" ON public."User"
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "user_self_update" ON public."User";
CREATE POLICY "user_self_update" ON public."User"
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "user_self_insert" ON public."User";
CREATE POLICY "user_self_insert" ON public."User"
  FOR INSERT WITH CHECK (id = auth.uid());

-- Wallet policies
DROP POLICY IF EXISTS "wallet_owner_all" ON public."Wallet";
CREATE POLICY "wallet_owner_all" ON public."Wallet"
  FOR ALL USING ("userId" = auth.uid());

-- Transaction policies
DROP POLICY IF EXISTS "tx_owner_read" ON public."Transaction";
CREATE POLICY "tx_owner_read" ON public."Transaction"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public."Wallet" w
            WHERE w.id = "walletId" AND w."userId" = auth.uid())
  );

-- Consultant policies
DROP POLICY IF EXISTS "consultant_public_read" ON public."Consultant";
CREATE POLICY "consultant_public_read" ON public."Consultant"
  FOR SELECT USING (status = 'VERIFIED' AND "isActive" = true);

DROP POLICY IF EXISTS "consultant_self_manage" ON public."Consultant";
CREATE POLICY "consultant_self_manage" ON public."Consultant"
  FOR ALL USING ("userId" = auth.uid());

-- Booking policies
DROP POLICY IF EXISTS "booking_participants_read" ON public."Booking";
CREATE POLICY "booking_participants_read" ON public."Booking"
  FOR SELECT USING (
    "userId" = auth.uid()
    OR EXISTS (SELECT 1 FROM public."Consultant" c
               WHERE c.id = "consultantId" AND c."userId" = auth.uid())
  );

DROP POLICY IF EXISTS "booking_user_insert" ON public."Booking";
CREATE POLICY "booking_user_insert" ON public."Booking"
  FOR INSERT WITH CHECK ("userId" = auth.uid());

-- Conversation policies
DROP POLICY IF EXISTS "conversation_participant_read" ON public."Conversation";
CREATE POLICY "conversation_participant_read" ON public."Conversation"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public."ConversationParticipant" cp
            WHERE cp."conversationId" = "Conversation".id
              AND cp."userId" = auth.uid())
  );

DROP POLICY IF EXISTS "participant_self_read" ON public."ConversationParticipant";
CREATE POLICY "participant_self_read" ON public."ConversationParticipant"
  FOR SELECT USING (
    "userId" = auth.uid()
    OR EXISTS (SELECT 1 FROM public."ConversationParticipant" cp2
               WHERE cp2."conversationId" = "ConversationParticipant"."conversationId"
                 AND cp2."userId" = auth.uid())
  );

-- Message policies
DROP POLICY IF EXISTS "message_participant_read" ON public."Message";
CREATE POLICY "message_participant_read" ON public."Message"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public."ConversationParticipant" cp
            WHERE cp."conversationId" = "Message"."conversationId"
              AND cp."userId" = auth.uid())
  );

DROP POLICY IF EXISTS "message_participant_send" ON public."Message";
CREATE POLICY "message_participant_send" ON public."Message"
  FOR INSERT WITH CHECK (
    "senderId" = auth.uid()
    AND EXISTS (SELECT 1 FROM public."ConversationParticipant" cp
                WHERE cp."conversationId" = "Message"."conversationId"
                  AND cp."userId" = auth.uid())
  );

-- Post policies
DROP POLICY IF EXISTS "post_public_read" ON public."Post";
CREATE POLICY "post_public_read" ON public."Post"
  FOR SELECT USING ("isFlagged" = false);

DROP POLICY IF EXISTS "post_author_write" ON public."Post";
CREATE POLICY "post_author_write" ON public."Post"
  FOR INSERT WITH CHECK ("authorId" = auth.uid());

-- Notification policies
DROP POLICY IF EXISTS "notification_owner_read" ON public.notifications;
CREATE POLICY "notification_owner_read" ON public.notifications
  FOR SELECT USING ("userId" = auth.uid());

DROP POLICY IF EXISTS "notification_owner_update" ON public.notifications;
CREATE POLICY "notification_owner_update" ON public.notifications
  FOR UPDATE USING ("userId" = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. SPARKS → CONSULTANT AGGREGATE TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION sync_spark_aggregate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.sparks IS DISTINCT FROM OLD.sparks THEN
    UPDATE public."User"
    SET "sparkScore" = NEW.sparks, "updatedAt" = NOW()
    WHERE id = NEW.id;

    UPDATE public."Consultant"
    SET "sparkScore" = NEW.sparks, "updatedAt" = NOW()
    WHERE "userId" = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_spark_aggregate ON public."User";
CREATE TRIGGER trg_sync_spark_aggregate
  AFTER UPDATE OF sparks ON public."User"
  FOR EACH ROW EXECUTE FUNCTION sync_spark_aggregate();

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. REALTIME BROADCAST TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION broadcast_message_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW."conversationId" IS NOT NULL THEN
    PERFORM realtime.broadcast_changes(
      'room:' || NEW."conversationId" || ':messages',
      TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_message ON public."Message";
CREATE TRIGGER trg_broadcast_message
  AFTER INSERT OR UPDATE OR DELETE ON public."Message"
  FOR EACH ROW EXECUTE FUNCTION broadcast_message_change();

CREATE OR REPLACE FUNCTION broadcast_wallet_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'user:' || NEW."userId" || ':wallet',
    TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_wallet ON public."Wallet";
CREATE TRIGGER trg_broadcast_wallet
  AFTER UPDATE ON public."Wallet"
  FOR EACH ROW EXECUTE FUNCTION broadcast_wallet_change();

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. REALTIME PUBLICATION
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  t TEXT;
  tables_to_publish TEXT[] := ARRAY[
    'Message', 'Conversation', 'ConversationParticipant',
    'Wallet', 'Transaction', 'Consultant', 'Booking',
    'Notification', 'Post', 'User'
  ];
BEGIN
  FOREACH t IN ARRAY tables_to_publish LOOP
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped realtime for %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 14. HELPER RPC — get_or_create_conversation
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_user_a UUID, p_user_b UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  SELECT cp1."conversationId" INTO v_conv_id
  FROM public."ConversationParticipant" cp1
  JOIN public."ConversationParticipant" cp2
    ON cp1."conversationId" = cp2."conversationId"
  WHERE cp1."userId" = p_user_a
    AND cp2."userId" = p_user_b
    AND (SELECT COUNT(*) FROM public."ConversationParticipant"
         WHERE "conversationId" = cp1."conversationId") = 2
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  INSERT INTO public."Conversation" DEFAULT VALUES RETURNING id INTO v_conv_id;
  INSERT INTO public."ConversationParticipant" ("conversationId", "userId")
  VALUES (v_conv_id, p_user_a), (v_conv_id, p_user_b);

  RETURN v_conv_id;
END;
$$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- POST-MIGRATION VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this query to verify:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' ORDER BY table_name;
--
-- Expected tables:
--   AdminAuditLog, AIConsultant (if created), Booking, Conversation,
--   ConversationParticipant, Consultant, Message, Post, Transaction, User,
--   Wallet, ai_profiles, ai_services, consultant_bookings, consultations,
--   consultant_applications, notifications, session_messages, session_requests, sparks
--
-- Compat views:
--   profiles (maps to User)
