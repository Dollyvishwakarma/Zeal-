-- ═══════════════════════════════════════════════════════════════════════════════
-- ATOMIC POSTGRES FUNCTIONS (called via supabase.rpc)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Toggle cheer (unique per user+post)
CREATE OR REPLACE FUNCTION toggle_cheer(p_user_id TEXT, p_post_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_exists BOOLEAN;
  v_count INT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM "Cheer" WHERE "userId" = p_user_id AND "postId" = p_post_id) INTO v_exists;
  IF v_exists THEN
    DELETE FROM "Cheer" WHERE "userId" = p_user_id AND "postId" = p_post_id;
    UPDATE "Post" SET "cheerCount" = GREATEST(0, "cheerCount" - 1) WHERE id = p_post_id RETURNING "cheerCount" INTO v_count;
    RETURN jsonb_build_object(cheered, false, cheers, v_count);
  ELSE
    INSERT INTO "Cheer" (id, "userId", "postId", "createdAt") VALUES (gen_random_uuid()::text, p_user_id, p_post_id, NOW());
    UPDATE "Post" SET "cheerCount" = "cheerCount" + 1 WHERE id = p_post_id RETURNING "cheerCount" INTO v_count;
    RETURN jsonb_build_object(cheered, true, cheers, v_count);
  END IF;
END;
$$;

-- 2. Claim quest reward (idempotent)
CREATE OR REPLACE FUNCTION claim_quest(p_user_id TEXT, p_quest_id TEXT, p_reward INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ref TEXT := quest-claim: || p_user_id || : || p_quest_id;
  v_exists BOOLEAN;
  v_sparks INT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM "Transaction" WHERE "referenceId" = v_ref) INTO v_exists;
  IF v_exists THEN RETURN jsonb_build_object(alreadyClaimed, true); END IF;
  UPDATE "User" SET sparks = sparks + p_reward WHERE id = p_user_id RETURNING sparks INTO v_sparks;
  INSERT INTO "Transaction" (id, "walletId", type, amount, balance, description, "referenceId", metadata)
    SELECT gen_random_uuid()::text, w.id, TOPUP, 0, w.balance, Quest reward: + || p_reward ||  Sparks, v_ref,
           jsonb_build_object(questId, p_quest_id, reward, p_reward, kind, sparks)
    FROM "Wallet" w WHERE w."userId" = p_user_id;
  RETURN jsonb_build_object(success, true, sparks, v_sparks);
END;
$$;

-- 3. Cancel booking + refund
CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id TEXT, p_actor_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_booking RECORD;
  v_wallet RECORD;
BEGIN
  SELECT * INTO v_booking FROM "Booking" WHERE id = p_booking_id;
  IF NOT FOUND THEN RETURN jsonb_build_object(error, not_found); END IF;
  IF v_booking.status = CANCELLED THEN RETURN jsonb_build_object(alreadyCancelled, true); END IF;
  IF v_booking.status = COMPLETED THEN RETURN jsonb_build_object(error, completed); END IF;

  IF v_booking.status = CONFIRMED AND v_booking."userId" IS NOT NULL THEN
    SELECT * INTO v_wallet FROM "Wallet" WHERE "userId" = v_booking."userId";
    IF FOUND THEN
      UPDATE "Wallet" SET balance = balance + v_booking.amount WHERE id = v_wallet.id;
      INSERT INTO "Transaction" (id, "walletId", type, amount, balance, description, "referenceId")
        VALUES (gen_random_uuid()::text, v_wallet.id, REFUND, v_booking.amount, v_wallet.balance + v_booking.amount,
                Refund for cancelled booking  || p_booking_id, p_booking_id);
    END IF;
  END IF;

  UPDATE "Booking" SET status = CANCELLED, "updatedAt" = NOW() WHERE id = p_booking_id;
  RETURN jsonb_build_object(success, true);
END;
$$;

-- 4. End call session + charge
CREATE OR REPLACE FUNCTION end_call_session(p_session_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_session RECORD;
  v_duration INT;
  v_rate NUMERIC;
  v_amount NUMERIC;
  v_fee NUMERIC;
  v_earning NUMERIC;
  v_wallet RECORD;
BEGIN
  SELECT * INTO v_session FROM "CallSession" WHERE id = p_session_id;
  IF NOT FOUND THEN RETURN jsonb_build_object(error, not_found); END IF;
  IF v_session.status = ENDED THEN RETURN jsonb_build_object(alreadyEnded, true); END IF;

  v_duration := EXTRACT(EPOCH FROM (NOW() - v_session."startTime"))::int;
  IF v_duration < 1 THEN RETURN jsonb_build_object(error, too_short); END IF;

  IF v_session."isAI" AND v_session."aiConsultantId" IS NOT NULL THEN
    SELECT "perMinuteRate" INTO v_rate FROM "AIConsultant" WHERE id = v_session."aiConsultantId";
  ELSE
    SELECT "perMinuteRate" INTO v_rate FROM "Consultant" WHERE id = v_session."consultantId";
  END IF;
  v_rate := COALESCE(v_rate, 50);
  v_amount := (v_duration::numeric / 60) * v_rate;
  v_fee := v_amount * 0.10;
  v_earning := v_amount - v_fee;

  UPDATE "CallSession" SET "endTime" = NOW(), "durationSeconds" = v_duration, amount = v_amount, status = ENDED
    WHERE id = p_session_id;

  IF v_amount > 0 AND v_session."userId" IS NOT NULL THEN
    SELECT * INTO v_wallet FROM "Wallet" WHERE "userId" = v_session."userId";
    IF FOUND THEN
      UPDATE "Wallet" SET balance = balance - v_amount WHERE id = v_wallet.id;
      INSERT INTO "Transaction" (id, "walletId", type, amount, balance, description, "referenceId")
        VALUES (gen_random_uuid()::text, v_wallet.id, PAYMENT, -v_amount, v_wallet.balance - v_amount,
                Call charge, p_session_id);
    END IF;
  END IF;

  IF v_earning > 0 AND NOT v_session."isAI" AND v_session."consultantId" IS NOT NULL THEN
    DECLARE v_cw RECORD;
    BEGIN
      SELECT w.* INTO v_cw FROM "Wallet" w JOIN "Consultant" c ON c."userId" = w."userId" WHERE c.id = v_session."consultantId";
      IF FOUND THEN
        UPDATE "Wallet" SET balance = balance + v_earning WHERE id = v_cw.id;
        INSERT INTO "Transaction" (id, "walletId", type, amount, balance, description, "referenceId")
          VALUES (gen_random_uuid()::text, v_cw.id, COMMISSION, v_earning, v_cw.balance + v_earning,
                  Call earning, p_session_id || :earnings);
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(success, true, durationSeconds, v_duration, amount, v_amount);
END;
$$;

-- 5. Request withdrawal
CREATE OR REPLACE FUNCTION request_withdrawal(p_user_id TEXT, p_amount NUMERIC, p_upi TEXT, p_bank TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_wallet RECORD; v_tx_id TEXT;
BEGIN
  SELECT * INTO v_wallet FROM "Wallet" WHERE "userId" = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object(error, wallet_not_found); END IF;
  IF v_wallet.balance < p_amount THEN RETURN jsonb_build_object(error, insufficient); END IF;

  v_tx_id := gen_random_uuid()::text;
  UPDATE "Wallet" SET balance = balance - p_amount, "pendingOut" = "pendingOut" + p_amount WHERE id = v_wallet.id;
  INSERT INTO "Transaction" (id, "walletId", type, amount, balance, description, "referenceId", metadata)
    VALUES (v_tx_id, v_wallet.id, PAYOUT, -p_amount, v_wallet.balance - p_amount,
            Withdrawal request, v_tx_id,
            jsonb_build_object(pending, true, upiId, p_upi, bankAccount, p_bank, requestedAt, NOW()::text));

  RETURN jsonb_build_object(success, true, transactionId, v_tx_id);
END;
$$;

-- 6. Approve/reject withdrawal
CREATE OR REPLACE FUNCTION process_withdrawal(p_tx_id TEXT, p_action TEXT, p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_tx RECORD; v_meta JSONB;
BEGIN
  SELECT * INTO v_tx FROM "Transaction" WHERE id = p_tx_id;
  IF NOT FOUND THEN RETURN jsonb_build_object(error, not_found); END IF;
  v_meta := v_tx.metadata;
  IF (v_meta->>pending)::boolean IS NOT TRUE THEN RETURN jsonb_build_object(error, not_pending); END IF;

  IF p_action = APPROVE THEN
    UPDATE "Transaction" SET metadata = v_meta || jsonb_build_object(pending, false, approvedAt, NOW()::text) WHERE id = p_tx_id;
    UPDATE "Wallet" SET "pendingOut" = GREATEST(0, "pendingOut" - ABS(v_tx.amount)) WHERE id = v_tx."walletId";
  ELSE
    UPDATE "Transaction" SET metadata = v_meta || jsonb_build_object(pending, false, rejectedAt, NOW()::text, reason, COALESCE(p_reason, Not specified)) WHERE id = p_tx_id;
    UPDATE "Wallet" SET balance = balance + ABS(v_tx.amount), "pendingOut" = GREATEST(0, "pendingOut" - ABS(v_tx.amount)) WHERE id = v_tx."walletId";
  END IF;

  RETURN jsonb_build_object(success, true, action, p_action);
END;
$$;

-- 7. Verify consultant + update role
CREATE OR REPLACE FUNCTION verify_consultant(p_consultant_id TEXT, p_admin_id TEXT, p_action TEXT, p_reason TEXT DEFAULT NULL, p_subdomain TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_consultant RECORD;
BEGIN
  SELECT * INTO v_consultant FROM "Consultant" WHERE id = p_consultant_id;
  IF NOT FOUND THEN RETURN jsonb_build_object(error, not_found); END IF;

  IF p_action = APPROVE THEN
    UPDATE "Consultant" SET status = VERIFIED, "isActive" = true, "isVerified" = true,
      "approvedBy" = p_admin_id, "approvedAt" = NOW(),
      subdomain = COALESCE(p_subdomain, subdomain), "subdomainActive" = true,
      "rejectionReason" = NULL
      WHERE id = p_consultant_id;
    UPDATE "User" SET role = CLIENT_ADMIN WHERE id = v_consultant."userId";
  ELSE
    UPDATE "Consultant" SET status = REJECTED, "isActive" = false, "isVerified" = false,
      "rejectionReason" = COALESCE(p_reason, Not specified),
      "approvedBy" = p_admin_id, "approvedAt" = NOW()
      WHERE id = p_consultant_id;
  END IF;

  RETURN jsonb_build_object(success, true, action, p_action);
END;
$$;
