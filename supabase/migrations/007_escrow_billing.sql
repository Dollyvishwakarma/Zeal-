-- Migration: 007_escrow_billing.sql
-- Escrow locks for fixed consultations and micro-deductions for live WebRTC calls

-- 1. Hold Funds in Escrow (Fixed Bookings)
CREATE OR REPLACE FUNCTION process_escrow_hold(
  p_user_id TEXT,
  p_amount DOUBLE PRECISION,
  p_booking_id TEXT,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet "Wallet"%ROWTYPE;
BEGIN
  SELECT * INTO v_wallet FROM "Wallet" WHERE "userId" = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF v_wallet.balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE "Wallet"
  SET balance = balance - p_amount,
      escrow = escrow + p_amount,
      "updatedAt" = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO "Transaction" (
    id, "walletId", type, amount, balance, description, "referenceId", "createdAt"
  ) VALUES (
    gen_random_uuid()::text, v_wallet.id, 'PAYMENT', p_amount, v_wallet.balance - p_amount, p_description, p_booking_id, NOW()
  );

  RETURN jsonb_build_object('success', true, 'walletId', v_wallet.id);
END;
$$;

-- 2. Deduct Per-Minute Micro-Transaction (Live Calls/Chats)
CREATE OR REPLACE FUNCTION process_per_minute_deduction(
  p_user_id TEXT,
  p_consultant_id TEXT,
  p_amount DOUBLE PRECISION,
  p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_wallet "Wallet"%ROWTYPE;
  v_consultant "Consultant"%ROWTYPE;
  v_consultant_wallet "Wallet"%ROWTYPE;
  v_platform_fee DOUBLE PRECISION;
  v_consultant_earning DOUBLE PRECISION;
BEGIN
  -- Lock User Wallet
  SELECT * INTO v_user_wallet FROM "Wallet" WHERE "userId" = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_user_wallet.balance < p_amount THEN 
    RETURN jsonb_build_object('success', false, 'reason', 'Insufficient funds'); 
  END IF;

  -- Fee Logic (e.g., 20% platform fee)
  v_platform_fee := p_amount * 0.20;
  v_consultant_earning := p_amount - v_platform_fee;

  -- Lock Consultant & Consultant Wallet
  SELECT * INTO v_consultant FROM "Consultant" WHERE id = p_consultant_id FOR UPDATE;
  SELECT * INTO v_consultant_wallet FROM "Wallet" WHERE "userId" = v_consultant."userId" FOR UPDATE;

  -- 1. Deduct from User
  UPDATE "Wallet" SET balance = balance - p_amount, "updatedAt" = NOW() WHERE id = v_user_wallet.id;
  
  -- 2. Credit to Consultant
  UPDATE "Wallet" SET balance = balance + v_consultant_earning, "updatedAt" = NOW() WHERE id = v_consultant_wallet.id;
  UPDATE "Consultant" SET earnings = earnings + v_consultant_earning, "updatedAt" = NOW() WHERE id = p_consultant_id;

  -- 3. Write Transactions
  INSERT INTO "Transaction" (id, "walletId", type, amount, balance, description, "referenceId", "createdAt") 
  VALUES (gen_random_uuid()::text, v_user_wallet.id, 'PAYMENT', p_amount, v_user_wallet.balance - p_amount, 'Per-minute billing', p_session_id, NOW());

  INSERT INTO "Transaction" (id, "walletId", type, amount, balance, description, "referenceId", "createdAt") 
  VALUES (gen_random_uuid()::text, v_consultant_wallet.id, 'PAYOUT', v_consultant_earning, v_consultant_wallet.balance + v_consultant_earning, 'Per-minute earning', p_session_id, NOW());

  RETURN jsonb_build_object('success', true, 'remainingBalance', v_user_wallet.balance - p_amount);
END;
$$;
