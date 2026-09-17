-- ═══════════════════════════════════════════════════════════════════════════
-- 005 · RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "AIConsultant" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_ai_consultants" ON "AIConsultant";
CREATE POLICY "public_read_ai_consultants" ON "AIConsultant"
  FOR SELECT USING ("isActive" = true);
GRANT SELECT ON "AIConsultant" TO anon;
GRANT SELECT ON "AIConsultant" TO authenticated;

ALTER TABLE "Consultant" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_verified_consultants" ON "Consultant";
CREATE POLICY "public_read_verified_consultants" ON "Consultant"
  FOR SELECT USING (status = 'VERIFIED' AND "isActive" = true);
GRANT SELECT ON "Consultant" TO anon;
GRANT SELECT ON "Consultant" TO authenticated;

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_own_notifications" ON "Notification";
CREATE POLICY "users_read_own_notifications" ON "Notification"
  FOR SELECT USING (auth.uid()::text = "userId");
DROP POLICY IF EXISTS "users_update_own_notifications" ON "Notification";
CREATE POLICY "users_update_own_notifications" ON "Notification"
  FOR UPDATE USING (auth.uid()::text = "userId");

ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "participants_read_messages" ON "ChatMessage";
CREATE POLICY "participants_read_messages" ON "ChatMessage"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Conversation" c
      WHERE c.id = "ChatMessage"."conversationId"
        AND (c."userAId" = auth.uid()::text OR c."userBId" = auth.uid()::text)
    )
  );
DROP POLICY IF EXISTS "sender_insert_messages" ON "ChatMessage";
CREATE POLICY "sender_insert_messages" ON "ChatMessage"
  FOR INSERT WITH CHECK (auth.uid()::text = "senderId");

ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "participants_read_conversations" ON "Conversation";
CREATE POLICY "participants_read_conversations" ON "Conversation"
  FOR SELECT USING ("userAId" = auth.uid()::text OR "userBId" = auth.uid()::text);
