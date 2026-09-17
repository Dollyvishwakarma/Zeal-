-- =============================================================================
-- 016_unified.sql
-- Foundation for AI chat + realtime infrastructure
-- =============================================================================
-- Contents:
--   1. AI shadow users (role = 'AI')
--   2. Wallets for AI users
--   3. RLS on realtime.messages (private channels)
--   4. Broadcast triggers (message, wallet, consultant, booking)
--   5. Publication setup for realtime tables
-- =============================================================================

BEGIN;

-- ─── 1. AI SHADOW USERS ─────────────────────────────────────────────────────
-- AI consultants live in AIConsultant, but need to be conversation participants.
-- Solution: mirror each AIConsultant into "User" with role='AI'.
ALTER TABLE public."User" DROP CONSTRAINT IF EXISTS "User_role_check";
ALTER TABLE public."User" ADD CONSTRAINT "User_role_check"
  CHECK (role IN ('USER','CLIENT_ADMIN','SUPER_ADMIN','ADMIN','SUPPORT','VIEWER','AI'));

INSERT INTO public."User" (
  id, email, username, name, avatar, role, "isVerified", "is_online"
)
SELECT
  a.id,
  COALESCE(a.username, 'ai_' || LEFT(a.id::text, 8)) || '@ai.zeal.local',
  COALESCE(a.username, 'ai_' || LEFT(a.id::text, 8)),
  a.name,
  a.avatar,
  'AI',
  true,
  true
FROM public."AIConsultant" a
ON CONFLICT (id) DO NOTHING;

-- ─── 2. WALLETS FOR AI USERS ────────────────────────────────────────────────
INSERT INTO public."Wallet" ("userId", balance)
SELECT id, 0 FROM public."User" WHERE role = 'AI'
ON CONFLICT ("userId") DO NOTHING;

-- ─── 3. RLS ON realtime.messages ────────────────────────────────────────────
-- Required for private channels. Without this, private:true subscriptions fail.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realtime_user_channels" ON realtime.messages;
CREATE POLICY "realtime_user_channels" ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'user:' || auth.uid()::text || ':%'
  OR realtime.topic() LIKE 'room:%'
  OR realtime.topic() LIKE 'consultant:' || auth.uid()::text || ':%'
);

DROP POLICY IF EXISTS "realtime_admin_all" ON realtime.messages;
CREATE POLICY "realtime_admin_all" ON realtime.messages
FOR SELECT TO authenticated
USING (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'USER') IN
  ('ADMIN','SUPER_ADMIN','SUPPORT','VIEWER')
);

-- ─── 4. BROADCAST TRIGGERS ──────────────────────────────────────────────────

-- 4a. Message → room + participant inboxes
CREATE OR REPLACE FUNCTION broadcast_message_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE p RECORD;
BEGIN
  PERFORM realtime.broadcast_changes(
    'room:' || NEW."conversationId" || ':messages',
    TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
  );
  FOR p IN SELECT "userId" FROM public."ConversationParticipant"
           WHERE "conversationId" = NEW."conversationId" LOOP
    PERFORM realtime.broadcast_changes(
      'user:' || p."userId" || ':inbox',
      TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
    );
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_broadcast_message ON public."Message";
CREATE TRIGGER trg_broadcast_message
  AFTER INSERT ON public."Message"
  FOR EACH ROW EXECUTE FUNCTION broadcast_message_changes();

-- 4b. Wallet → user:{id}:wallet
CREATE OR REPLACE FUNCTION broadcast_wallet_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'user:' || NEW."userId" || ':wallet',
    TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_broadcast_wallet ON public."Wallet";
CREATE TRIGGER trg_broadcast_wallet
  AFTER UPDATE ON public."Wallet"
  FOR EACH ROW EXECUTE FUNCTION broadcast_wallet_changes();

-- 4c. Consultant → applicant notification + admin + spark updates
CREATE OR REPLACE FUNCTION broadcast_consultant_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM realtime.broadcast_changes(
      'admin:verification', TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
    );
    PERFORM realtime.broadcast_changes(
      'user:' || NEW."userId" || ':notifications',
      TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
    );
  END IF;
  IF NEW."sparkScore" IS DISTINCT FROM OLD."sparkScore" THEN
    PERFORM realtime.broadcast_changes(
      'consultant:' || NEW."userId" || ':sparks',
      TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_broadcast_consultant ON public."Consultant";
CREATE TRIGGER trg_broadcast_consultant
  AFTER UPDATE ON public."Consultant"
  FOR EACH ROW EXECUTE FUNCTION broadcast_consultant_changes();

-- 4d. Booking → admin feed + booking status
CREATE OR REPLACE FUNCTION broadcast_booking_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'admin:bookings', TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
  );
  PERFORM realtime.broadcast_changes(
    'booking:' || NEW.id || ':status',
    TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_broadcast_booking ON public."Booking";
CREATE TRIGGER trg_broadcast_booking
  AFTER INSERT OR UPDATE ON public."Booking"
  FOR EACH ROW EXECUTE FUNCTION broadcast_booking_changes();

-- ─── 5. PUBLICATION SETUP ───────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Message','Conversation','ConversationParticipant','Wallet','Transaction',
    'Consultant','AIConsultant','Booking','Notification','Post','User'
  ] LOOP
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
      RAISE NOTICE 'Realtime publication skip %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

COMMIT;