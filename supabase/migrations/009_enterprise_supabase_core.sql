-- Migration: 009_enterprise_supabase_core.sql
-- Description: Composite Indexes, Replica Identity, and Safe JSON-Returning RPCs

-- ==========================================
-- 1. HIGH-PERFORMANCE COMPOSITE INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_booking_user_status ON "Booking"("userId", "status");
CREATE INDEX IF NOT EXISTS idx_booking_consultant_date ON "Booking"("consultantId", "scheduledAt");
CREATE INDEX IF NOT EXISTS idx_callsession_booking ON "CallSession"("bookingId", "status");
CREATE INDEX IF NOT EXISTS idx_chatmessage_conversation_time ON "ChatMessage"("conversationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_userid ON "Wallet"("userId");
CREATE INDEX IF NOT EXISTS idx_transaction_wallet_time ON "Transaction"("walletId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_post_author_time ON "Post"("authorId", "createdAt" DESC);

-- ==========================================
-- 2. ENTERPRISE REAL-TIME PUBLICATION
-- ==========================================
-- Drop existing publications if they exist to prevent duplication
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- Add critical tables to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE 
  "Wallet", "Consultant", "Booking", "CallSession", 
  "Conversation", "ChatMessage", "Notification", "User";

-- Force Full Replica Identity so WebSockets receive both OLD and NEW row states
ALTER TABLE "Wallet" REPLICA IDENTITY FULL;
ALTER TABLE "Consultant" REPLICA IDENTITY FULL;
ALTER TABLE "Booking" REPLICA IDENTITY FULL;
ALTER TABLE "CallSession" REPLICA IDENTITY FULL;

-- ==========================================
-- 3. ERROR-HANDLED SAFE RPCs
-- ==========================================
-- Upgrading the Wallet Deduction RPC to handle exceptions safely
CREATE OR REPLACE FUNCTION process_wallet_deduction_safe(
  p_user_id TEXT,
  p_amount DOUBLE PRECISION,
  p_description TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_transaction_type "TransactionType" DEFAULT 'PAYMENT'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet "Wallet"%ROWTYPE;
  v_new_balance DOUBLE PRECISION;
  v_txn_id TEXT;
BEGIN
  -- Row-level lock
  SELECT * INTO v_wallet FROM "Wallet" WHERE "userId" = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'code', 'INSUFFICIENT_FUNDS', 'currentBalance', v_wallet.balance);
  END IF;

  v_new_balance := v_wallet.balance - p_amount;

  UPDATE "Wallet" SET balance = v_new_balance, "updatedAt" = NOW() WHERE id = v_wallet.id;

  v_txn_id := gen_random_uuid()::text;
  INSERT INTO "Transaction" (id, "walletId", type, amount, balance, description, "referenceId", "createdAt") 
  VALUES (v_txn_id, v_wallet.id, p_transaction_type, p_amount, v_new_balance, p_description, p_reference_id, NOW());

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance, 'transactionId', v_txn_id);

EXCEPTION WHEN OTHERS THEN
  -- Catch all PostgreSQL errors and return them cleanly instead of crashing the API
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;
