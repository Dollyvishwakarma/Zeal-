-- ============================================================================
-- ENABLE REALTIME FOR AI CONSULTANTS
-- ============================================================================
-- Run this in Supabase SQL Editor to enable live updates.
-- ============================================================================

-- 1. Add AIConsultant to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'AIConsultant'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "AIConsultant";
    RAISE NOTICE 'Added AIConsultant to supabase_realtime';
  ELSE
    RAISE NOTICE 'AIConsultant already in supabase_realtime';
  END IF;
END$$;

-- 2. Full row data on updates (so RLS filtering works)
ALTER TABLE "AIConsultant" REPLICA IDENTITY FULL;

-- 3. Ensure RLS allows public reads
DROP POLICY IF EXISTS "Anyone reads active AI consultants" ON "AIConsultant";
CREATE POLICY "Anyone reads active AI consultants"
  ON "AIConsultant" FOR SELECT
  USING ("isActive" = true);

-- 4. Grant to anon + authenticated
GRANT SELECT ON "AIConsultant" TO anon;
GRANT SELECT ON "AIConsultant" TO authenticated;

-- 5. Verify
SELECT 'AIConsultant realtime enabled' AS status,
       COUNT(*)::text AS rows
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'AIConsultant';
