-- ═══════════════════════════════════════════════════════════════════════════════
-- ZEAL — Unified Chat Schema (Migration 012)
-- Optimized for Supabase Realtime Broadcast (6ms median latency)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "Conversation" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastMessageAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastMessageText" TEXT,
  "isGroup"         BOOLEAN NOT NULL DEFAULT false,
  "metadata"        JSONB
);

CREATE TABLE IF NOT EXISTS "ConversationParticipant" (
  "conversationId" UUID REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "userId"         TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "joinedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastReadAt"     TIMESTAMPTZ,
  "role"           TEXT NOT NULL DEFAULT 'member',
  PRIMARY KEY ("conversationId", "userId")
);

CREATE TABLE IF NOT EXISTS "Message" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" UUID NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "senderId"       TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "content"        TEXT NOT NULL,
  "type"           TEXT NOT NULL DEFAULT 'text',
  "metadata"       JSONB,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "editedAt"       TIMESTAMPTZ,
  "deletedAt"      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_message_conv_created
  ON "Message"("conversationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_participant_user
  ON "ConversationParticipant"("userId");
CREATE INDEX IF NOT EXISTS idx_participant_conv
  ON "ConversationParticipant"("conversationId");
CREATE INDEX IF NOT EXISTS idx_conversation_last_message
  ON "Conversation"("lastMessageAt" DESC);

ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversation_participant_read" ON "Conversation";
DROP POLICY IF EXISTS "participant_self_read" ON "ConversationParticipant";
DROP POLICY IF EXISTS "message_participant_read" ON "Message";
DROP POLICY IF EXISTS "message_participant_send" ON "Message";

CREATE POLICY "conversation_participant_read" ON "Conversation"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "ConversationParticipant"
    WHERE "conversationId" = "Conversation"."id"
      AND "userId" = (SELECT auth.uid()::text)
  )
);

CREATE POLICY "participant_self_read" ON "ConversationParticipant"
FOR SELECT USING (
  "userId" = (SELECT auth.uid()::text)
  OR EXISTS (
    SELECT 1 FROM "ConversationParticipant" cp
    WHERE cp."conversationId" = "ConversationParticipant"."conversationId"
      AND cp."userId" = (SELECT auth.uid()::text)
  )
);

CREATE POLICY "message_participant_read" ON "Message"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "ConversationParticipant"
    WHERE "conversationId" = "Message"."conversationId"
      AND "userId" = (SELECT auth.uid()::text)
  )
);

CREATE POLICY "message_participant_send" ON "Message"
FOR INSERT WITH CHECK (
  "senderId" = (SELECT auth.uid()::text)
  AND EXISTS (
    SELECT 1 FROM "ConversationParticipant"
    WHERE "conversationId" = "Message"."conversationId"
      AND "userId" = (SELECT auth.uid()::text)
  )
);

ALTER TABLE "Message" REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION broadcast_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'room:' || NEW."conversationId" || ':messages',
    TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_message ON "Message";
CREATE TRIGGER trg_broadcast_message
  AFTER INSERT OR UPDATE OR DELETE ON "Message"
  FOR EACH ROW EXECUTE FUNCTION broadcast_new_message();

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "Conversation"
  SET "lastMessageAt" = NEW."createdAt",
      "lastMessageText" = LEFT(NEW.content, 100)
  WHERE id = NEW."conversationId";
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_conv_last_message ON "Message";
CREATE TRIGGER trg_update_conv_last_message
  AFTER INSERT ON "Message"
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_user_a TEXT,
  p_user_b TEXT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  IF p_user_a > p_user_b THEN
    SELECT cp1."conversationId" INTO v_conv_id
    FROM "ConversationParticipant" cp1
    JOIN "ConversationParticipant" cp2
      ON cp1."conversationId" = cp2."conversationId"
    WHERE cp1."userId" = p_user_b
      AND cp2."userId" = p_user_a
      AND (SELECT COUNT(*) FROM "ConversationParticipant"
           WHERE "conversationId" = cp1."conversationId") = 2
    LIMIT 1;
  ELSE
    SELECT cp1."conversationId" INTO v_conv_id
    FROM "ConversationParticipant" cp1
    JOIN "ConversationParticipant" cp2
      ON cp1."conversationId" = cp2."conversationId"
    WHERE cp1."userId" = p_user_a
      AND cp2."userId" = p_user_b
      AND (SELECT COUNT(*) FROM "ConversationParticipant"
           WHERE "conversationId" = cp1."conversationId") = 2
    LIMIT 1;
  END IF;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  INSERT INTO "Conversation" DEFAULT VALUES RETURNING id INTO v_conv_id;
  INSERT INTO "ConversationParticipant" ("conversationId", "userId")
  VALUES (v_conv_id, p_user_a), (v_conv_id, p_user_b);

  RETURN v_conv_id;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'Message'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
  END IF;
END;
$$;