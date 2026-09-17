-- ═══════════════════════════════════════════════════════════════════════════════
-- ZEAL — Inbox Broadcast (Migration 013)
-- Broadcasts new messages to each participant's personal inbox channel
-- Enables real-time inbox preview updates without postgres_changes
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION broadcast_message_to_inboxes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participant RECORD;
BEGIN
  FOR participant IN
    SELECT "userId"
    FROM "ConversationParticipant"
    WHERE "conversationId" = NEW."conversationId"
  LOOP
    PERFORM realtime.broadcast_changes(
      'user:' || participant."userId" || ':inbox',
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_message_to_inboxes ON "Message";
CREATE TRIGGER trg_broadcast_message_to_inboxes
  AFTER INSERT ON "Message"
  FOR EACH ROW EXECUTE FUNCTION broadcast_message_to_inboxes();