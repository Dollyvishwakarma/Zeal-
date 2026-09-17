-- ============================================================================
-- DEBUG LOG TABLE + TRIGGERS
-- ============================================================================
-- Run in Supabase SQL Editor. Idempotent.
-- ============================================================================

-- ─── 1. Create DebugLog table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DebugLog" (
  id TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT NOT NULL,
  channel TEXT NOT NULL,
  event TEXT NOT NULL,
  message TEXT,
  data JSONB,
  "durationMs" INTEGER,
  "requestId" TEXT,
  "userId" TEXT,
  route TEXT,
  CONSTRAINT "DebugLog_pkey" PRIMARY KEY (id)
);

-- ─── 2. Index for queries ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "DebugLog_createdAt_idx" ON "DebugLog"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "DebugLog_channel_idx" ON "DebugLog"(channel);
CREATE INDEX IF NOT EXISTS "DebugLog_level_idx" ON "DebugLog"(level);

-- ─── 3. Add to realtime publication ───────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'DebugLog'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "DebugLog";
    RAISE NOTICE 'Added DebugLog to realtime publication';
  END IF;
END$$;

ALTER TABLE "DebugLog" REPLICA IDENTITY FULL;

-- ─── 4. RLS: public read for debug (remove in production) ─────────────────
ALTER TABLE "DebugLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_debug_logs" ON "DebugLog";
CREATE POLICY "public_read_debug_logs"
  ON "DebugLog" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "public_insert_debug_logs" ON "DebugLog";
-- DISABLED by fix-all: CREATE POLICY "public_insert_debug_logs"
  ON "DebugLog" FOR INSERT
  WITH CHECK (true);

GRANT SELECT, INSERT ON "DebugLog" TO anon;
GRANT SELECT, INSERT ON "DebugLog" TO authenticated;

-- ─── 5. Trigger function: log INSERT/UPDATE/DELETE ────────────────────────
CREATE OR REPLACE FUNCTION public.log_table_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  row_id TEXT;
  changes JSONB;
BEGIN
  -- Get row id (works for all our tables)
  IF TG_OP = 'DELETE' THEN
    row_id := OLD.id;
  ELSE
    row_id := NEW.id;
  END IF;

  -- Build change summary
  changes := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'rowId', row_id
  );

  -- Insert log entry
  INSERT INTO "DebugLog" (level, channel, event, message, data)
  VALUES (
    'info',
    'db',
    'trigger:' || LOWER(TG_OP),
    TG_OP || ' on ' || TG_TABLE_NAME || ' (' || row_id || ')',
    changes
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 6. Attach triggers to critical tables ────────────────────────────────
DO $$
DECLARE
  tbl text;
  tables_to_log text[] := ARRAY[
    'AIConsultant',
    'Consultant',
    'Booking',
    'CallSession',
    'Wallet',
    'Transaction',
    'Notification',
    'Post'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_log
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS log_changes ON %I', tbl);
    EXECUTE format(
      'CREATE TRIGGER log_changes
       AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION public.log_table_change()',
      tbl
    );
    RAISE NOTICE '✅ Attached log trigger to %', tbl;
  END LOOP;
END$$;

-- ─── 7. Cleanup old logs (keep last 7 days) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM "DebugLog" WHERE "createdAt" < NOW() - INTERVAL '7 days';
END;
$$;

-- ─── 8. Verify ────────────────────────────────────────────────────────────
SELECT 'DebugLog table' AS check_name, COUNT(*)::text AS count FROM "DebugLog"
UNION ALL
SELECT 'Log triggers', COUNT(*)::text
FROM pg_trigger
WHERE tgname = 'log_changes' AND NOT tgisinternal;

