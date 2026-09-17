-- ============================================================================
-- CREATE SUPER ADMIN USER + ENSURE ENUM VALUES
-- ============================================================================
-- Run in Supabase SQL Editor.
-- IMPORTANT: You must FIRST create the user via Supabase Auth (email/password).
-- Then come back and run this SQL to promote them to SUPER_ADMIN.
-- ============================================================================

-- ─── Step 1: Ensure Role enum has SUPER_ADMIN and CLIENT_ADMIN ─────────────
DO $$
BEGIN
  -- Add CLIENT_ADMIN if missing
  BEGIN
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CLIENT_ADMIN';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  -- Add SUPER_ADMIN if missing
  BEGIN
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  -- Remove old HEALER/ADMIN if they exist and are unused
  -- (Only remove if no users have them)
  IF NOT EXISTS (SELECT 1 FROM "User" WHERE role::text = 'HEALER') THEN
    RAISE NOTICE 'HEALER role has no users – can be removed later';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "User" WHERE role::text = 'ADMIN') THEN
    RAISE NOTICE 'ADMIN role has no users – can be removed later';
  END IF;
END$$;

-- ─── Step 2: Verify enum values ────────────────────────────────────────────
SELECT '=== ROLE ENUM VALUES AFTER FIX ===' AS info;
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
ORDER BY enumsortorder;

-- ─── Step 3: Promote admin@zeal.com to SUPER_ADMIN ─────────────────────────
-- (Run this AFTER creating the user in Supabase Auth → Users → Invite)
UPDATE "User"
SET
  role = 'SUPER_ADMIN',
  "isVerified" = true,
  "updatedAt" = NOW()
WHERE email IN ('admin@zeal.com', 'superadmin@zeal.com');

-- ─── Step 4: Ensure wallet exists for admin ────────────────────────────────
INSERT INTO "Wallet" ("id", "userId", "balance", "escrow", "pendingIn", "pendingOut", "blocked", "createdAt", "updatedAt")
SELECT
  'wlt_' || REPLACE(gen_random_uuid()::text, '-', ''),
  u.id, 0, 0, 0, 0, 0, NOW(), NOW()
FROM "User" u
WHERE u.email IN ('admin@zeal.com', 'superadmin@zeal.com')
  AND NOT EXISTS (SELECT 1 FROM "Wallet" w WHERE w."userId" = u.id);

-- ─── Step 5: Verify ────────────────────────────────────────────────────────
SELECT '=== SUPER ADMIN USERS ===' AS info;
SELECT id, email, username, role, "isVerified"
FROM "User"
WHERE role = 'SUPER_ADMIN';

