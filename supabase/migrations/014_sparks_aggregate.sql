-- ═══════════════════════════════════════════════════════════════════════════════
-- ZEAL — Sparks Aggregate (Migration 014)
-- ─────────────────────────────────────────────────────────────────────────────
-- Sparks is social proof: cheers + comments + follows accrue to consultants.
-- This migration:
--   1. Adds a `sparkScore` column to Consultant (denormalized aggregate)
--   2. Adds triggers that keep it in sync with User.sparks
--   3. Broadcasts spark changes via Realtime to consultant channels
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Denormalized spark score on Consultant
ALTER TABLE "Consultant"
  ADD COLUMN IF NOT EXISTS "sparkScore" BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_consultant_spark_score
  ON "Consultant"("sparkScore" DESC) WHERE "status" = 'VERIFIED' AND "isActive" = true;

-- 2. Backfill from User.sparks
UPDATE "Consultant" c
SET "sparkScore" = COALESCE(u.sparks, 0)
FROM "User" u
WHERE c."userId" = u.id AND c."sparkScore" <> COALESCE(u.sparks, 0);

-- 3. Trigger: sync User.sparks → Consultant.sparkScore
CREATE OR REPLACE FUNCTION sync_consultant_spark_score()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.sparks IS DISTINCT FROM OLD.sparks THEN
    UPDATE "Consultant"
    SET "sparkScore" = NEW.sparks, "updatedAt" = NOW()
    WHERE "userId" = NEW.id;

    -- Broadcast to consultant realtime channel
    PERFORM realtime.broadcast_changes(
      'consultant:' || NEW.id || ':sparks',
      'UPDATE', 'UPDATE', 'Consultant', 'public',
      jsonb_build_object('consultantId', NEW.id, 'sparkScore', NEW.sparks),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_spark_score ON "User";
CREATE TRIGGER trg_sync_spark_score
  AFTER UPDATE OF sparks ON "User"
  FOR EACH ROW EXECUTE FUNCTION sync_consultant_spark_score();

-- 4. Helper: get top spark consultants
CREATE OR REPLACE FUNCTION top_spark_consultants(p_limit INT DEFAULT 20)
RETURNS TABLE (
  consultant_id TEXT,
  user_id TEXT,
  full_name TEXT,
  avatar TEXT,
  spark_score BIGINT,
  category TEXT,
  rating DOUBLE PRECISION
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    c.id, c."userId", u.name, u.avatar, c."sparkScore",
    c.category::text, c.rating
  FROM "Consultant" c
  JOIN "User" u ON u.id = c."userId"
  WHERE c.status = 'VERIFIED' AND c."isActive" = true
  ORDER BY c."sparkScore" DESC, c.rating DESC
  LIMIT p_limit;
$$;