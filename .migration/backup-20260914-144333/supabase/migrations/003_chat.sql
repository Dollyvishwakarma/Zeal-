-- ═══════════════════════════════════════════════════════════════════════════
-- 003 · CHAT
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "Conversation" (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "userAId" TEXT NOT NULL,
  "userBId" TEXT NOT NULL,
  "lastMessageAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastMessageText" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("userAId","userBId")
);
CREATE INDEX IF NOT EXISTS "Conversation_userA_idx" ON "Conversation"("userAId","lastMessageAt" DESC);
CREATE INDEX IF NOT EXISTS "Conversation_userB_idx" ON "Conversation"("userBId","lastMessageAt" DESC);

CREATE TABLE IF NOT EXISTS "ChatMessage" (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"(id) ON DELETE CASCADE,
  "senderId" TEXT NOT NULL,
  content TEXT NOT NULL,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "ChatMessage_conv_created_idx" ON "ChatMessage"("conversationId","createdAt" DESC);
