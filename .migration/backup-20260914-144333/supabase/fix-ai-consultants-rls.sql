-- ============================================================================
-- FIX AI CONSULTANTS: RLS, GRANTS, REALTIME
-- ============================================================================
-- Run this in Supabase SQL Editor. Idempotent – safe to run multiple times.
-- ============================================================================

-- ─── STEP 1: Diagnose ──────────────────────────────────────────────────
SELECT 'Row count' AS metric, COUNT(*)::text AS value FROM "AIConsultant"
UNION ALL
SELECT 'Active rows', COUNT(*)::text FROM "AIConsultant" WHERE "isActive" = true
UNION ALL
SELECT 'RLS enabled', CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'AIConsultant') THEN 'YES' ELSE 'NO' END
UNION ALL
SELECT 'Realtime enabled', CASE WHEN EXISTS (
  SELECT 1 FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND tablename = 'AIConsultant'
) THEN 'YES' ELSE 'NO' END;

-- ─── STEP 2: Ensure RLS is enabled ─────────────────────────────────────
ALTER TABLE "AIConsultant" ENABLE ROW LEVEL SECURITY;

-- ─── STEP 3: Drop old policies (idempotent) ────────────────────────────
DROP POLICY IF EXISTS "Anyone reads active AI consultants" ON "AIConsultant";
DROP POLICY IF EXISTS "public_read_ai_consultants" ON "AIConsultant";
DROP POLICY IF EXISTS "ai_consultants_public_read" ON "AIConsultant";

-- ─── STEP 4: Create public read policy for active consultants ──────────
CREATE POLICY "public_read_ai_consultants"
  ON "AIConsultant"
  FOR SELECT
  USING ("isActive" = true);

-- ─── STEP 5: Grant SELECT to anon + authenticated roles ────────────────
GRANT SELECT ON "AIConsultant" TO anon;
GRANT SELECT ON "AIConsultant" TO authenticated;
GRANT SELECT ON "AIConsultant" TO service_role;

-- ─── STEP 6: Enable Realtime on AIConsultant ───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'AIConsultant'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "AIConsultant";
    RAISE NOTICE 'AIConsultant added to realtime publication';
  ELSE
    RAISE NOTICE 'AIConsultant already in realtime publication';
  END IF;
END$$;

-- Full row data on updates
ALTER TABLE "AIConsultant" REPLICA IDENTITY FULL;

-- ─── STEP 7: Verify ────────────────────────────────────────────────────
SELECT 'RLS enabled' AS check_name, relrowsecurity::text AS result
FROM pg_class WHERE relname = 'AIConsultant'
UNION ALL
SELECT 'Realtime table', EXISTS (
  SELECT 1 FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND tablename = 'AIConsultant'
)::text
UNION ALL
SELECT 'Anon can SELECT', has_table_privilege('anon', 'AIConsultant', 'SELECT')::text;

-- ─── STEP 8: Sample data (insert if empty) ─────────────────────────────
INSERT INTO "AIConsultant" (
  id, name, username, avatar, category, "isPaid", "perMinuteRate",
  rating, experience, "totalConsultations", sparks, bio,
  specialties, languages, model, "responseTime", accuracy,
  "isActive", gender, persona, "isFeatured", "createdAt", "updatedAt"
) VALUES
  ('ai-astro-jyoti', 'Jyoti AI', 'jyoti_ai',
   'https://ui-avatars.com/api/?name=Jyoti+AI&background=9D7DC5&color=fff&size=200',
   'ASTROLOGER', false, 0, 4.8, 100, 5000, 50000,
   'Compassionate Vedic astrologer AI with 20+ years knowledge.',
   ARRAY['Vedic Astrology', 'Horoscopes', 'Birth Chart'],
   ARRAY['English', 'Hindi'], 'groq', 200, 0.95,
   true, 'female', 'compassionate', true, NOW(), NOW()),

  ('ai-astro-acharya', 'Acharya AI', 'acharya_ai',
   'https://ui-avatars.com/api/?name=Acharya+AI&background=533AFD&color=fff&size=200',
   'ASTROLOGER', false, 0, 4.7, 100, 4000, 50000,
   'Analytical Nadi astrologer AI, expert in predictive techniques.',
   ARRAY['Nadi Astrology', 'Vedic Astrology', 'KP'],
   ARRAY['English'], 'groq', 200, 0.93,
   true, 'male', 'analytical', false, NOW(), NOW()),

  ('ai-astro-tara', 'Tara AI', 'tara_ai',
   'https://ui-avatars.com/api/?name=Tara+AI&background=7A5A9E&color=fff&size=200',
   'ASTROLOGER', false, 0, 4.9, 100, 6000, 50000,
   'Empathetic Western astrologer AI focused on relationships.',
   ARRAY['Western Astrology', 'Compatibility'],
   ARRAY['English', 'Hindi'], 'groq', 180, 0.96,
   true, 'female', 'empathetic', true, NOW(), NOW()),

  ('ai-psych-mind', 'Mind AI', 'mind_ai',
   'https://ui-avatars.com/api/?name=Mind+AI&background=9D7DC5&color=fff&size=200',
   'PSYCHOLOGIST', false, 0, 4.7, 100, 3500, 50000,
   'CBT-trained AI assistant for anxiety and stress.',
   ARRAY['CBT', 'Anxiety', 'Stress'],
   ARRAY['English', 'Hindi'], 'groq', 200, 0.94,
   true, 'neutral', 'empathetic', false, NOW(), NOW()),

  ('ai-tarot-mystic', 'Mystic AI', 'mystic_ai',
   'https://ui-avatars.com/api/?name=Mystic+AI&background=533AFD&color=fff&size=200',
   'TAROT', false, 0, 4.8, 100, 4500, 50000,
   'Intuitive AI tarot reader for daily guidance.',
   ARRAY['Rider-Waite', 'Oracle Cards'],
   ARRAY['English', 'Hindi'], 'groq', 200, 0.95,
   true, 'female', 'intuitive', true, NOW(), NOW())

ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  "isActive" = EXCLUDED."isActive",
  "isPaid" = EXCLUDED."isPaid",
  "updatedAt" = NOW();

-- Final count
SELECT 'Total AI consultants' AS metric, COUNT(*)::text AS value FROM "AIConsultant";
