-- ═══════════════════════════════════════════════════════════════════════════
-- 004 · REALTIME PUBLICATION
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE tbl TEXT;
DECLARE tables_to_publish TEXT[] := ARRAY[
  'AIConsultant','Consultant','Booking','CallSession',
  'Wallet','Transaction','Notification','Post',
  'ChatMessage','Conversation'
];
BEGIN
  FOREACH tbl IN ARRAY tables_to_publish LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    END IF;
    EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', tbl);
  END LOOP;
END $$;
