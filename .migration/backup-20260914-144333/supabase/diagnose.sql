-- ============================================================================
-- DIAGNOSTIC SCRIPT – run in Supabase SQL Editor FIRST
-- ============================================================================

-- 1. Check Role enum values
SELECT '=== ROLE ENUM VALUES ===' AS info;
SELECT enumlabel AS role_value
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
ORDER BY enumsortorder;

-- 2. Check ConsultantStatus enum values
SELECT '=== CONSULTANT STATUS ENUM ===' AS info;
SELECT enumlabel AS status_value
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultantStatus')
ORDER BY enumsortorder;

-- 3. Check if any SUPER_ADMIN exists
SELECT '=== SUPER ADMINS ===' AS info;
SELECT id, email, username, role
FROM "User"
WHERE role = 'SUPER_ADMIN';

-- 4. Check AIConsultant row count and realtime status
SELECT '=== AI CONSULTANTS ===' AS info;
SELECT
  'Total rows' AS metric,
  COUNT(*)::text AS value
FROM "AIConsultant"
UNION ALL
SELECT 'Active rows', COUNT(*)::text FROM "AIConsultant" WHERE "isActive" = true
UNION ALL
SELECT 'In realtime pub', CASE WHEN EXISTS (
  SELECT 1 FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND tablename = 'AIConsultant'
) THEN 'YES' ELSE 'NO' END
UNION ALL
SELECT 'RLS enabled', CASE WHEN (
  SELECT relrowsecurity FROM pg_class WHERE relname = 'AIConsultant'
) THEN 'YES' ELSE 'NO' END
UNION ALL
SELECT 'Anon can SELECT', has_table_privilege('anon', 'AIConsultant', 'SELECT')::text;

-- 5. Check RLS policies on AIConsultant
SELECT '=== RLS POLICIES ON AIConsultant ===' AS info;
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'AIConsultant';

-- 6. Check Consultant status distribution
SELECT '=== CONSULTANT STATUS ===' AS info;
SELECT status, COUNT(*) AS count
FROM "Consultant"
GROUP BY status;

-- 7. Check subdomain uniqueness constraint
SELECT '=== SUBDOMAIN CONSTRAINTS ===' AS info;
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Consultant' AND indexdef LIKE '%subdomain%';

