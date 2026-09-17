-- ═══════════════════════════════════════════════════════════════════════════════
-- ZEAL — RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['User','UserPreferences','UserActivity','Wallet','Transaction','Consultant','AIConsultant','Booking','CallSession','Post','Comment','Cheer','Notification','Conversation','ChatMessage','AdminAuditLog','AdminInvite','AdminLoginAttempt','DebugLog'])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END$$;

DROP POLICY IF EXISTS "users_select_self" ON "User";
CREATE POLICY "users_select_self" ON "User" FOR SELECT USING (auth.uid()::text = id);
DROP POLICY IF EXISTS "users_update_self" ON "User";
CREATE POLICY "users_update_self" ON "User" FOR UPDATE USING (auth.uid()::text = id);
DROP POLICY IF EXISTS "users_insert_self" ON "User";
CREATE POLICY "users_insert_self" ON "User" FOR INSERT WITH CHECK (auth.uid()::text = id);

DROP POLICY IF EXISTS "consultants_public_read" ON "Consultant";
CREATE POLICY "consultants_public_read" ON "Consultant"
  FOR SELECT USING (status = 'VERIFIED' AND "isActive" = true);

DROP POLICY IF EXISTS "ai_consultants_public_read" ON "AIConsultant";
CREATE POLICY "ai_consultants_public_read" ON "AIConsultant"
  FOR SELECT USING ("isActive" = true);

DROP POLICY IF EXISTS "posts_public_read" ON "Post";
CREATE POLICY "posts_public_read" ON "Post" FOR SELECT USING ("isFlagged" = false);
DROP POLICY IF EXISTS "posts_author_insert" ON "Post";
CREATE POLICY "posts_author_insert" ON "Post" FOR INSERT WITH CHECK (auth.uid()::text = "authorId");
DROP POLICY IF EXISTS "posts_author_update" ON "Post";
CREATE POLICY "posts_author_update" ON "Post" FOR UPDATE USING (auth.uid()::text = "authorId");
DROP POLICY IF EXISTS "posts_author_delete" ON "Post";
CREATE POLICY "posts_author_delete" ON "Post" FOR DELETE USING (auth.uid()::text = "authorId");

DROP POLICY IF EXISTS "comments_public_read" ON "Comment";
CREATE POLICY "comments_public_read" ON "Comment" FOR SELECT USING (true);
DROP POLICY IF EXISTS "comments_author_insert" ON "Comment";
CREATE POLICY "comments_author_insert" ON "Comment" FOR INSERT WITH CHECK (auth.uid()::text = "authorId");

DROP POLICY IF EXISTS "cheers_public_read" ON "Cheer";
CREATE POLICY "cheers_public_read" ON "Cheer" FOR SELECT USING (true);
DROP POLICY IF EXISTS "cheers_self_write" ON "Cheer";
CREATE POLICY "cheers_self_write" ON "Cheer" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
DROP POLICY IF EXISTS "cheers_self_delete" ON "Cheer";
CREATE POLICY "cheers_self_delete" ON "Cheer" FOR DELETE USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "wallet_owner_all" ON "Wallet";
CREATE POLICY "wallet_owner_all" ON "Wallet" FOR ALL USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "tx_owner_read" ON "Transaction";
CREATE POLICY "tx_owner_read" ON "Transaction" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Wallet" w WHERE w.id = "walletId" AND w."userId" = auth.uid()::text)
);

DROP POLICY IF EXISTS "booking_participants_read" ON "Booking";
CREATE POLICY "booking_participants_read" ON "Booking" FOR SELECT USING (
  auth.uid()::text = "userId"
  OR EXISTS (SELECT 1 FROM "Consultant" c WHERE c.id = "consultantId" AND c."userId" = auth.uid()::text)
);
DROP POLICY IF EXISTS "booking_user_insert" ON "Booking";
CREATE POLICY "booking_user_insert" ON "Booking" FOR INSERT WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "callsession_participants_read" ON "CallSession";
CREATE POLICY "callsession_participants_read" ON "CallSession" FOR SELECT USING (
  auth.uid()::text = "userId"
  OR EXISTS (SELECT 1 FROM "Consultant" c WHERE c.id = "consultantId" AND c."userId" = auth.uid()::text)
);

DROP POLICY IF EXISTS "notif_owner_read" ON "Notification";
CREATE POLICY "notif_owner_read" ON "Notification" FOR SELECT USING (auth.uid()::text = "userId");
DROP POLICY IF EXISTS "notif_owner_update" ON "Notification";
CREATE POLICY "notif_owner_update" ON "Notification" FOR UPDATE USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "conversation_participants_read" ON "Conversation";
CREATE POLICY "conversation_participants_read" ON "Conversation" FOR SELECT USING (
  auth.uid()::text = "userAId" OR auth.uid()::text = "userBId"
);
DROP POLICY IF EXISTS "conversation_participants_insert" ON "Conversation";
CREATE POLICY "conversation_participants_insert" ON "Conversation" FOR INSERT WITH CHECK (
  auth.uid()::text = "userAId" OR auth.uid()::text = "userBId"
);

DROP POLICY IF EXISTS "chatmessage_participants_read" ON "ChatMessage";
CREATE POLICY "chatmessage_participants_read" ON "ChatMessage" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Conversation" c
          WHERE c.id = "conversationId"
            AND (c."userAId" = auth.uid()::text OR c."userBId" = auth.uid()::text))
);
DROP POLICY IF EXISTS "chatmessage_sender_insert" ON "ChatMessage";
CREATE POLICY "chatmessage_sender_insert" ON "ChatMessage" FOR INSERT WITH CHECK (auth.uid()::text = "senderId");

DROP POLICY IF EXISTS "prefs_owner_all" ON "UserPreferences";
CREATE POLICY "prefs_owner_all" ON "UserPreferences" FOR ALL USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "activity_owner_all" ON "UserActivity";
CREATE POLICY "activity_owner_all" ON "UserActivity" FOR ALL USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "debuglog_public_insert" ON "DebugLog";
CREATE POLICY "debuglog_public_insert" ON "DebugLog" FOR INSERT WITH CHECK (true);
