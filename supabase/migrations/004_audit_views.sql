CREATE OR REPLACE VIEW "v_wallet_health" AS
SELECT w.id, w."userId", w.balance,
  COALESCE(SUM(t.amount), 0) AS computed_balance,
  w.balance - COALESCE(SUM(t.amount), 0) AS drift
FROM "Wallet" w
LEFT JOIN "Transaction" t ON t."walletId" = w.id
GROUP BY w.id, w."userId", w.balance;

CREATE OR REPLACE FUNCTION cleanup_admin_logs() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM "AdminAuditLog"     WHERE "createdAt" < NOW() - INTERVAL '90 days';
  DELETE FROM "AdminLoginAttempt" WHERE "createdAt" < NOW() - INTERVAL '90 days';
  DELETE FROM "AdminInvite"       WHERE "expiresAt" < NOW() - INTERVAL '90 days' AND "acceptedAt" IS NULL;
  DELETE FROM "DebugLog"          WHERE "createdAt" < NOW() - INTERVAL '7 days';
END; $$;
