-- Migration: 010_enterprise_ledger_extensions.sql
-- Description: Atomic transactions for Escrow Holds and Wallet Credits

-- ==========================================
-- 1. HOLD IN ESCROW (Atomic Transfer)
-- ==========================================
CREATE OR REPLACE FUNCTION hold_in_escrow_safe(
  p_user_id TEXT,
  p_amount DOUBLE PRECISION,
  p_reference_id TEXT,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet "Wallet"%ROWTYPE;
  v_txn_id TEXT;
BEGIN
  -- Lock row for concurrency safety
  SELECT * INTO v_wallet FROM "Wallet" WHERE "userId" = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance for escrow', 'code', 'INSUFFICIENT_FUNDS');
  END IF;

  -- Subtract from balance, add to escrow
  UPDATE "Wallet" 
  SET balance = balance - p_amount, escrow = escrow + p_amount, "updatedAt" = NOW() 
  WHERE id = v_wallet.id;

  v_txn_id := gen_random_uuid()::text;
  
  INSERT INTO "Transaction" (id, "walletId", type, amount, balance, description, "referenceId", "createdAt")
  VALUES (v_txn_id, v_wallet.id, 'PAYMENT'::"TransactionType", p_amount, v_wallet.balance - p_amount, p_description, p_reference_id, NOW());

  RETURN jsonb_build_object('success', true, 'transactionId', v_txn_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

-- ==========================================
-- 2. CREDIT FUNDS (Webhooks / Topups)
-- ==========================================
CREATE OR REPLACE FUNCTION credit_funds_safe(
  p_user_id TEXT,
  p_amount DOUBLE PRECISION,
  p_description TEXT,
  p_reference_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet "Wallet"%ROWTYPE;
  v_txn_id TEXT;
BEGIN
  -- Lock row
  SELECT * INTO v_wallet FROM "Wallet" WHERE "userId" = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found', 'code', 'NOT_FOUND');
  END IF;

  -- Add directly to balance
  UPDATE "Wallet" SET balance = balance + p_amount, "updatedAt" = NOW() WHERE id = v_wallet.id;

  v_txn_id := gen_random_uuid()::text;
  
  INSERT INTO "Transaction" (id, "walletId", type, amount, balance, description, "referenceId", "createdAt")
  VALUES (v_txn_id, v_wallet.id, 'PAYMENT'::"TransactionType", p_amount, v_wallet.balance + p_amount, p_description, p_reference_id, NOW());

  RETURN jsonb_build_object('success', true, 'transactionId', v_txn_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;
