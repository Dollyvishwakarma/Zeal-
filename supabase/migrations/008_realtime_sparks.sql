-- Migration: 008_realtime_sparks.sql
-- Description: Automatically increments Spark (impression) scores on interactions.

-- 1. Trigger for Cheers (Likes) -> +1 Spark to Post Author
CREATE OR REPLACE FUNCTION trigger_cheer_sparks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE "User"
  SET sparks = sparks + 1, "updatedAt" = NOW()
  WHERE id = (SELECT "authorId" FROM "Post" WHERE id = NEW."postId");
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_cheer_add_spark ON "Cheer";
CREATE TRIGGER on_cheer_add_spark
AFTER INSERT ON "Cheer"
FOR EACH ROW EXECUTE FUNCTION trigger_cheer_sparks();


-- 2. Trigger for Comments -> +2 Sparks to Post Author, +1 Spark to Commenter
CREATE OR REPLACE FUNCTION trigger_comment_sparks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Author of the post gets +2 sparks for the engagement
  UPDATE "User"
  SET sparks = sparks + 2, "updatedAt" = NOW()
  WHERE id = (SELECT "authorId" FROM "Post" WHERE id = NEW."postId");

  -- User who commented gets +1 spark for participating
  UPDATE "User"
  SET sparks = sparks + 1, "updatedAt" = NOW()
  WHERE id = NEW."authorId";

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_add_spark ON "Comment";
CREATE TRIGGER on_comment_add_spark
AFTER INSERT ON "Comment"
FOR EACH ROW EXECUTE FUNCTION trigger_comment_sparks();


-- 3. Trigger for Follows/Profile Views (UserActivity) -> +5 Sparks to Target
CREATE OR REPLACE FUNCTION trigger_activity_sparks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_consultant_user_id TEXT;
BEGIN
  -- If activity is 'FOLLOW' or 'PROFILE_VIEW'
  IF NEW.type IN ('FOLLOW', 'PROFILE_VIEW') THEN
    
    -- Find the underlying User ID for the Consultant being followed/viewed
    SELECT "userId" INTO v_consultant_user_id FROM "Consultant" WHERE id = NEW."consultantId";
    
    IF FOUND THEN
      UPDATE "User"
      SET sparks = sparks + 5, "updatedAt" = NOW()
      WHERE id = v_consultant_user_id;
    END IF;
    
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_activity_add_spark ON "UserActivity";
CREATE TRIGGER on_activity_add_spark
AFTER INSERT ON "UserActivity"
FOR EACH ROW EXECUTE FUNCTION trigger_activity_sparks();
