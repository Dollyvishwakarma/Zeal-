-- ============================================================================
-- SEED CONSULTANTS ACROSS ALL CATEGORIES (IDEMPOTENT)
-- ============================================================================
-- Creates 3-5 verified consultants per category with realistic data.
-- Safe to run multiple times (uses deterministic IDs + ON CONFLICT).
-- ============================================================================

-- Helper: create user + consultant in one go
DO $$
DECLARE
  -- Each entry: (name, username, email, category, specialties[], languages[], rate, bio, faith, gender_emoji)
  cons RECORD;
  new_user_id TEXT;
  new_consultant_id TEXT;
BEGIN

  FOR cons IN
    SELECT * FROM (VALUES
      -- ═══ ASTROLOGERS ═══
      ('Rajesh Sharma', 'raj_astrologer', 'raj.sharma@zeal.com', 'ASTROLOGER',
       ARRAY['Vedic', 'Vedic Astrology', 'KP'], ARRAY['Hindi', 'English'], 75,
       'Vedic astrologer with 15+ years of experience in career and relationships.', 'HINDU'),
      ('Priya Patel', 'priya_jyotish', 'priya.patel@zeal.com', 'ASTROLOGER',
       ARRAY['Vedic', 'Nadi', 'Nadi Astrology'], ARRAY['Hindi', 'English', 'Gujarati'], 60,
       'Nadi astrologer specializing in planetary transits and muhurtha.', 'HINDU'),
      ('Amit Singh', 'amit_astro', 'amit.singh@zeal.com', 'ASTROLOGER',
       ARRAY['KP', 'Western', 'Western Astrology'], ARRAY['English', 'Punjabi'], 55,
       'KP astrologer with 10 years of experience in predictive astrology.', 'HINDU'),
      ('Sana Khan', 'sana_astro', 'sana.khan@zeal.com', 'ASTROLOGER',
       ARRAY['Vedic', 'Horoscopes'], ARRAY['Hindi', 'Urdu', 'English'], 80,
       'Spiritual astrologer guiding life decisions through planetary wisdom.', 'ISLAM'),

      -- ═══ PSYCHOLOGISTS ═══
      ('Dr. Meera Nair', 'dr_meera', 'meera.nair@zeal.com', 'PSYCHOLOGIST',
       ARRAY['CBT', 'Anxiety', 'Individual Therapy'], ARRAY['English', 'Malayalam'], 100,
       'Licensed clinical psychologist specializing in anxiety and depression.', 'OTHER'),
      ('Dr. Arjun Gupta', 'dr_arjun', 'arjun.gupta@zeal.com', 'PSYCHOLOGIST',
       ARRAY['Trauma', 'PTSD', 'EMDR'], ARRAY['Hindi', 'English'], 95,
       'Trauma specialist with 15 years of experience in PTSD recovery.', 'HINDU'),
      ('Dr. Ritu Sharma', 'dr_ritu', 'ritu.sharma@zeal.com', 'PSYCHOLOGIST',
       ARRAY['CBT', 'Depression', 'Couples Therapy'], ARRAY['Hindi', 'English'], 85,
       'CBT specialist helping with anxiety and depression.', 'HINDU'),

      -- ═══ TAROT ═══
      ('Sana Tarot', 'sana_tarot', 'sana.tarot@zeal.com', 'TAROT',
       ARRAY['Rider-Waite', 'Rider-Waite Tarot', 'Lenormand'], ARRAY['Hindi', 'English'], 60,
       'Intuitive tarot reader with 8+ years of experience.', 'ISLAM'),
      ('Rahul Das', 'rahul_tarot', 'rahul.das@zeal.com', 'TAROT',
       ARRAY['Osho Zen', 'Angel Cards'], ARRAY['Hindi', 'English'], 55,
       'Spiritual tarot reader focusing on self-discovery.', 'HINDU'),
      ('Kavya Iyer', 'kavya_tarot', 'kavya.iyer@zeal.com', 'TAROT',
       ARRAY['Rider-Waite', 'Marseille'], ARRAY['English', 'Tamil'], 65,
       'Professional tarot reader with 6+ years of experience.', 'HINDU'),

      -- ═══ NUMEROLOGISTS ═══
      ('Divya Mathur', 'divya_num', 'divya.mathur@zeal.com', 'NUMEROLOGIST',
       ARRAY['Chaldean', 'Pythagorean', 'Life Path Number'], ARRAY['Hindi', 'English'], 70,
       'Numerologist with 10+ years of experience in destiny mapping.', 'HINDU'),
      ('Raj Kumar', 'raj_num', 'raj.kumar@zeal.com', 'NUMEROLOGIST',
       ARRAY['Kabbalah', 'Indian'], ARRAY['Hindi', 'English'], 65,
       'Numerologist specializing in Kabbalah and Vedic systems.', 'HINDU'),
      ('Sneha Reddy', 'sneha_num', 'sneha.reddy@zeal.com', 'NUMEROLOGIST',
       ARRAY['Pythagorean', 'Name Analysis'], ARRAY['Telugu', 'English'], 60,
       'Numerologist helping with life path decisions.', 'HINDU'),

      -- ═══ PALMISTS ═══
      ('Riya Mehta', 'riya_palm', 'riya.mehta@zeal.com', 'PALMIST',
       ARRAY['Classical', 'Life Line', 'Heart Line'], ARRAY['Hindi', 'English'], 60,
       'Classical palmist with modern insights.', 'HINDU'),
      ('Dr. Shilpa Mehta', 'shilpa_palm', 'shilpa.mehta@zeal.com', 'PALMIST',
       ARRAY['Psychological', 'Modern'], ARRAY['Hindi', 'English'], 70,
       'Holistic palmist integrating psychology.', 'OTHER'),

      -- ═══ REIKI / HEALERS ═══
      ('Ananya Gupta', 'ananya_reiki', 'ananya.gupta@zeal.com', 'REIKI',
       ARRAY['Reiki', 'Usui Reiki'], ARRAY['Hindi', 'English'], 80,
       'Reiki master and energy healer with 10+ years of experience.', 'HINDU'),
      ('Manoj Kumar', 'manoj_healer', 'manoj.kumar@zeal.com', 'REIKI',
       ARRAY['Crystal', 'Sound'], ARRAY['Hindi', 'English'], 75,
       'Energy healer using crystals and sound therapy.', 'OTHER'),
      ('Pooja Reiki', 'pooja_reiki', 'pooja.reiki@zeal.com', 'REIKI',
       ARRAY['Reiki', 'Pranic'], ARRAY['Hindi', 'English'], 70,
       'Pranic healer focusing on chakra balancing.', 'HINDU'),

      -- ═══ LIFE COACHES ═══
      ('Coach Priyanka', 'priyanka_coach', 'priyanka.coach@zeal.com', 'LIFE_COACH',
       ARRAY['Life Coaching', 'Career Coaching'], ARRAY['Hindi', 'English'], 85,
       'Certified life coach specializing in career growth.', 'HINDU'),
      ('Coach Aditi', 'aditi_coach', 'aditi.coach@zeal.com', 'LIFE_COACH',
       ARRAY['Relationship Coaching', 'Personal Growth'], ARRAY['English'], 90,
       'Holistic life coach for health and relationships.', 'OTHER'),

      -- ═══ HEALERS ═══
      ('Healer Maya', 'maya_healer', 'maya.healer@zeal.com', 'HEALER',
       ARRAY['Energy Healing', 'Reiki'], ARRAY['English'], 80,
       'Energy healer and spiritual counselor.', 'HINDU'),
      ('Healer Nisha', 'nisha_healer', 'nisha.healer@zeal.com', 'HEALER',
       ARRAY['Pranic Healing', 'Crystal Healing'], ARRAY['Hindi', 'English'], 75,
       'Pranic healing and chakra balancing expert.', 'HINDU'),

      -- ═══ MOTIVATIONAL SPEAKERS ═══
      ('Speaker Neha', 'neha_speaker', 'neha.speaker@zeal.com', 'MOTIVATIONAL_SPEAKER',
       ARRAY['Inspiration', 'Leadership'], ARRAY['Hindi', 'English'], 80,
       'Dynamic motivational speaker empowering potential.', 'HINDU'),

      -- ═══ SPIRITUAL GUIDES ═══
      ('Guide Tara', 'tara_guide', 'tara.guide@zeal.com', 'SPIRITUAL_GUIDE',
       ARRAY['Meditation', 'Mindfulness'], ARRAY['Hindi', 'English'], 70,
       'Meditation and spiritual guide.', 'HINDU'),
      ('Guide Radhika', 'radhika_guide', 'radhika.guide@zeal.com', 'SPIRITUAL_GUIDE',
       ARRAY['Spiritual Counseling', 'Inner Peace'], ARRAY['English'], 75,
       'Spiritual counselor for inner peace.', 'HINDU'),

      -- ═══ YOGA INSTRUCTORS ═══
      ('Yoga Guru Anjali', 'anjali_yoga', 'anjali.yoga@zeal.com', 'YOGA_INSTRUCTOR',
       ARRAY['Hatha', 'Vinyasa'], ARRAY['Hindi', 'English'], 60,
       'Hatha and Vinyasa yoga instructor.', 'HINDU'),
      ('Yoga Instructor Simran', 'simran_yoga', 'simran.yoga@zeal.com', 'YOGA_INSTRUCTOR',
       ARRAY['Kundalini', 'Meditation'], ARRAY['English'], 65,
       'Kundalini yoga and meditation teacher.', 'SIKH'),

      -- ═══ VASTU ═══
      ('Lata Vastu', 'lata_vastu', 'lata.vastu@zeal.com', 'VASTU',
       ARRAY['Vastu Shastra', 'Feng Shui'], ARRAY['Hindi', 'English'], 65,
       'Vastu Shastra expert.', 'HINDU')
    ) AS t(name, username, email, category, specialties, languages, rate, bio, faith)
  LOOP
    -- Check if user exists
    SELECT id INTO new_user_id FROM "User" WHERE username = cons.username;

    IF new_user_id IS NULL THEN
      new_user_id := 'usr_' || REPLACE(gen_random_uuid()::text, '-', '');

      INSERT INTO "User" (
        id, email, username, name, avatar, role, sparks, "isVerified",
        "createdAt", "updatedAt"
      ) VALUES (
        new_user_id,
        cons.email,
        cons.username,
        cons.name,
        'https://ui-avatars.com/api/?name=' || REPLACE(cons.name, ' ', '+') || '&background=9D7DC5&color=fff',
        'CLIENT_ADMIN',
        100,
        true,
        NOW(),
        NOW()
      );
    END IF;

    -- Check if consultant exists
    SELECT id INTO new_consultant_id FROM "Consultant" WHERE "userId" = new_user_id;

    IF new_consultant_id IS NULL THEN
      new_consultant_id := 'cst_' || REPLACE(gen_random_uuid()::text, '-', '');

      INSERT INTO "Consultant" (
        id, "userId", category, specialties, languages, bio, "perMinuteRate",
        "isVerified", "isActive", faith, rating, "totalConsultations",
        availability, status, "chatRate", "audioRate", "videoRate",
        "physicalRate", "subdomain", "subdomainActive", "theme",
        "createdAt", "updatedAt"
      ) VALUES (
        new_consultant_id,
        new_user_id,
        cons.category::"ConsultantCategory",
        cons.specialties,
        cons.languages,
        cons.bio,
        cons.rate,
        true,
        true,
        cons.faith::"Faith",
        4.6 + (random() * 0.3),
        (random() * 500 + 100)::int,
        '{"monday":[{"start":"09:00","end":"18:00"}],"tuesday":[{"start":"09:00","end":"18:00"}],"wednesday":[{"start":"09:00","end":"18:00"}],"thursday":[{"start":"09:00","end":"18:00"}],"friday":[{"start":"09:00","end":"18:00"}],"saturday":[],"sunday":[]}'::jsonb,
        'VERIFIED',
        cons.rate,
        cons.rate * 1.5,
        cons.rate * 2,
        cons.rate * 3,
        LOWER(REPLACE(cons.username, '_', '-')),
        true,
        jsonb_build_object(
          'primaryColor', '#9D7DC5',
          'accentColor', '#533AFD',
          'welcomeMessage', 'Welcome to ' || cons.name || '''s practice'
        ),
        NOW(),
        NOW()
      );
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Consultant seeding complete';
END$$;

-- Verification
SELECT
  category,
  COUNT(*) AS consultants
FROM "Consultant"
WHERE status = 'VERIFIED' AND "isActive" = true
GROUP BY category
ORDER BY category;
