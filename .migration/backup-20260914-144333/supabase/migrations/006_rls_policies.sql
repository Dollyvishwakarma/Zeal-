-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Post" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cheer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consultant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIConsultant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPreferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserActivity" ENABLE ROW LEVEL SECURITY;

-- User: own record only
DROP POLICY IF EXISTS "users_read_own" ON "User";
CREATE POLICY "users_read_own" ON "User" FOR SELECT USING ((SELECT auth.uid())::text = id);
DROP POLICY IF EXISTS "users_update_own" ON "User";
CREATE POLICY "users_update_own" ON "User" FOR UPDATE USING ((SELECT auth.uid())::text = id);
DROP POLICY IF EXISTS "users_insert_own" ON "User";
CREATE POLICY "users_insert_own" ON "User" FOR INSERT WITH CHECK ((SELECT auth.uid())::text = id);

-- Wallet: owner only
DROP POLICY IF EXISTS "wallet_owner_all" ON "Wallet";
CREATE POLICY "wallet_owner_all" ON "Wallet" FOR ALL USING ((SELECT auth.uid())::text = "userId");

-- Transaction: owner via wallet
DROP POLICY IF EXISTS "tx_owner_read" ON "Transaction";
CREATE POLICY "tx_owner_read" ON "Transaction" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Wallet" WHERE "Wallet".id = "Transaction"."walletId" AND "Wallet"."userId" = (SELECT auth.uid())::text)
);

-- Booking: participants
DROP POLICY IF EXISTS "booking_participants" ON "Booking";
CREATE POLICY "booking_participants" ON "Booking" FOR SELECT USING (
  (SELECT auth.uid())::text = "userId"
  OR EXISTS (SELECT 1 FROM "Consultant" WHERE "Consultant".id = "Booking"."consultantId" AND "Consultant"."userId" = (SELECT auth.uid())::text)
);
DROP POLICY IF EXISTS "booking_user_insert" ON "Booking";
CREATE POLICY "booking_user_insert" ON "Booking" FOR INSERT WITH CHECK ((SELECT auth.uid())::text = "userId");

-- Post: public read, author write
DROP POLICY IF EXISTS "posts_public_read" ON "Post";
CREATE POLICY "posts_public_read" ON "Post" FOR SELECT USING ("isFlagged" = false);
DROP POLICY IF EXISTS "posts_author_write" ON "Post";
CREATE POLICY "posts_author_write" ON "Post" FOR INSERT WITH CHECK ((SELECT auth.uid())::text = "authorId");
DROP POLICY IF EXISTS "posts_author_update" ON "Post";
CREATE POLICY "posts_author_update" ON "Post" FOR UPDATE USING ((SELECT auth.uid())::text = "authorId");
DROP POLICY IF EXISTS "posts_author_delete" ON "Post";
CREATE POLICY "posts_author_delete" ON "Post" FOR DELETE USING ((SELECT auth.uid())::text = "authorId");

-- Comment: public read, author write
DROP POLICY IF EXISTS "comments_public_read" ON "Comment";
CREATE POLICY "comments_public_read" ON "Comment" FOR SELECT USING (true);
DROP POLICY IF EXISTS "comments_author_write" ON "Comment";
CREATE POLICY "comments_author_write" ON "Comment" FOR INSERT WITH CHECK ((SELECT auth.uid())::text = "authorId");

-- Cheer: public read, user own
DROP POLICY IF EXISTS "cheers_public_read" ON "Cheer";
CREATE POLICY "cheers_public_read" ON "Cheer" FOR SELECT USING (true);
DROP POLICY IF EXISTS "cheers_own_write" ON "Cheer";
CREATE POLICY "cheers_own_write" ON "Cheer" FOR INSERT WITH CHECK ((SELECT auth.uid())::text = "userId");
DROP POLICY IF EXISTS "cheers_own_delete" ON "Cheer";
CREATE POLICY "cheers_own_delete" ON "Cheer" FOR DELETE USING ((SELECT auth.uid())::text = "userId");

-- Notification: recipient only
DROP POLICY IF EXISTS "notif_own_read" ON "Notification";
CREATE POLICY "notif_own_read" ON "Notification" FOR SELECT USING ((SELECT auth.uid())::text = "userId");
DROP POLICY IF EXISTS "notif_own_update" ON "Notification";
CREATE POLICY "notif_own_update" ON "Notification" FOR UPDATE USING ((SELECT auth.uid())::text = "userId");

-- Consultant: public read verified
DROP POLICY IF EXISTS "consultant_public_read" ON "Consultant";
CREATE POLICY "consultant_public_read" ON "Consultant" FOR SELECT USING (status = VERIFIED AND "isActive" = true);

-- AI Consultant: public read active
DROP POLICY IF EXISTS "ai_consultant_public_read" ON "AIConsultant";
CREATE POLICY "ai_consultant_public_read" ON "AIConsultant" FOR SELECT USING ("isActive" = true);

-- Conversation: participants only
DROP POLICY IF EXISTS "conv_participants" ON "Conversation";
CREATE POLICY "conv_participants" ON "Conversation" FOR SELECT USING (
  (SELECT auth.uid())::text = "userAId" OR (SELECT auth.uid())::text = "userBId"
);
DROP POLICY IF EXISTS "conv_participants_insert" ON "Conversation";
CREATE POLICY "conv_participants_insert" ON "Conversation" FOR INSERT WITH CHECK (
  (SELECT auth.uid())::text = "userAId" OR (SELECT auth.uid())::text = "userBId"
);

-- ChatMessage: participants
DROP POLICY IF EXISTS "msg_participants" ON "ChatMessage";
CREATE POLICY "msg_participants" ON "ChatMessage" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Conversation" c WHERE c.id = "ChatMessage"."conversationId" AND (c."userAId" = (SELECT auth.uid())::text OR c."userBId" = (SELECT auth.uid())::text))
);
DROP POLICY IF EXISTS "msg_sender_insert" ON "ChatMessage";
CREATE POLICY "msg_sender_insert" ON "ChatMessage" FOR INSERT WITH CHECK ((SELECT auth.uid())::text = "senderId");

-- UserPreferences: owner
DROP POLICY IF EXISTS "prefs_owner" ON "UserPreferences";
CREATE POLICY "prefs_owner" ON "UserPreferences" FOR ALL USING ((SELECT auth.uid())::text = "userId");

-- UserActivity: owner
DROP POLICY IF EXISTS "activity_owner" ON "UserActivity";
CREATE POLICY "activity_owner" ON "UserActivity" FOR ALL USING ((SELECT auth.uid())::text = "userId");

-- CallSession: participants
DROP POLICY IF EXISTS "callsession_participants" ON "CallSession";
CREATE POLICY "callsession_participants" ON "CallSession" FOR SELECT USING (
  (SELECT auth.uid())::text = "userId"
  OR EXISTS (SELECT 1 FROM "Consultant" WHERE "Consultant".id = "CallSession"."consultantId" AND "Consultant"."userId" = (SELECT auth.uid())::text)
);
