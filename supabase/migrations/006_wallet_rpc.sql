-- Migration: 006_wallet_rpc.sql
-- Description: Financial procedures for atomic balance mutations with row-level locks

-- 1. Atomic Wallet Deduction (Debit)
CREATE OR REPLACE FUNCTION process_wallet_deduction(
  p_user_id TEXT,
  p_amount DOUBLE PRECISION,
  p_description TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_transaction_type "TransactionType" DEFAULT 'PAYMENT',
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet "Wallet"%ROWTYPE;
  v_new_balance DOUBLE PRECISION;
  v_txn "Transaction"%ROWTYPE;
BEGIN
  -- Lock the user's wallet record for update
  SELECT * INTO v_wallet
  FROM "Wallet"
  WHERE "userId" = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet record not found for user %', p_user_id;
  END IF;

  IF v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: available %, requested %', v_wallet.balance, p_amount;
  END IF;

  v_new_balance := v_wallet.balance - p_amount;

  UPDATE "Wallet"
  SET balance = v_new_balance,
      "updatedAt" = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO "Transaction" (
    id, "walletId", type, amount, balance, description, "referenceId", metadata, "createdAt"
  ) VALUES (
    gen_random_uuid()::text,
    v_wallet.id,
    p_transaction_type,
    p_amount,
    v_new_balance,
    p_description,
    p_reference_id,
    p_metadata,
    NOW()
  ) RETURNING * INTO v_txn;

  RETURN jsonb_build_object(
    'success', true,
    'walletId', v_wallet.id,
    'balance', v_new_balance,
    'transactionId', v_txn.id
  );
END;
$$;

-- 2. Atomic Wallet Top-up (Credit)
CREATE OR REPLACE FUNCTION process_wallet_topup(
  p_user_id TEXT,
  p_amount DOUBLE PRECISION,
  p_description TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet "Wallet"%ROWTYPE;
  v_new_balance DOUBLE PRECISION;
  v_txn "Transaction"%ROWTYPE;
BEGIN
  SELECT * INTO v_wallet
  FROM "Wallet"
  WHERE "userId" = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Auto-initialize wallet if missing
    INSERT INTO "Wallet" (id, "userId", balance, escrow, "pendingIn", "pendingOut", blocked, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, p_user_id, p_amount, 0, 0, 0, 0, NOW(), NOW())
    RETURNING * INTO v_wallet;
    v_new_balance := p_amount;
  ELSE
    v_new_balance := v_wallet.balance + p_amount;
    UPDATE "Wallet"
    SET balance = v_new_balance,
        "updatedAt" = NOW()
    WHERE id = v_wallet.id;
  END IF;

  INSERT INTO "Transaction" (
    id, "walletId", type, amount, balance, description, "referenceId", metadata, "createdAt"
  ) VALUES (
    gen_random_uuid()::text,
    v_wallet.id,
    'TOPUP',
    p_amount,
    v_new_balance,
    p_description,
    p_reference_id,
    p_metadata,
    NOW()
  ) RETURNING * INTO v_txn;

  RETURN jsonb_build_object(
    'success', true,
    'walletId', v_wallet.id,
    'balance', v_new_balance,
    'transactionId', v_txn.id
  );
END;
$$;

-- 3. Release Escrow / Split Earnings on Call Completion
CREATE OR REPLACE FUNCTION process_escrow_release(
  p_booking_id TEXT,
  p_consultant_id TEXT,
  p_consultant_earning DOUBLE PRECISION,
  p_platform_fee DOUBLE PRECISION
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_consultant "Consultant"%ROWTYPE;
  v_wallet "Wallet"%ROWTYPE;
  v_new_balance DOUBLE PRECISION;
BEGIN
  -- Fetch and lock consultant
  SELECT * INTO v_consultant
  FROM "Consultant"
  WHERE id = p_consultant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consultant not found: %', p_consultant_id;
  END IF;

  -- Lock consultant wallet
  SELECT * INTO v_wallet
  FROM "Wallet"
  WHERE "userId" = v_consultant."userId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consultant wallet not found for user %', v_consultant."userId";
  END IF;

  v_new_balance := v_wallet.balance + p_consultant_earning;

  -- Update wallet
  UPDATE "Wallet"
  SET balance = v_new_balance,
      "updatedAt" = NOW()
  WHERE id = v_wallet.id;

  -- Update consultant earnings metric
  UPDATE "Consultant"
  SET earnings = earnings + p_consultant_earning,
      "totalConsultations" = "totalConsultations" + 1,
      "updatedAt" = NOW()
  WHERE id = p_consultant_id;

  -- Ledger entries
  INSERT INTO "Transaction" (
    id, "walletId", type, amount, balance, description, "referenceId", "createdAt"
  ) VALUES (
    gen_random_uuid()::text,
    v_wallet.id,
    'PAYOUT',
    p_consultant_earning,
    v_new_balance,
    CONCAT('Payout for Booking ', p_booking_id),
    p_booking_id,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'consultantEarning', p_consultant_earning,
    'platformFee', p_platform_fee,
    'newBalance', v_new_balance
  );
END;
$$;
