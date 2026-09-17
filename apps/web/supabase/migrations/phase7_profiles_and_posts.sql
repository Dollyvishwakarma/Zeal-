-- 1. Detailed Consultants Master Table (Auto-built on onboarding)
CREATE TABLE IF NOT EXISTS public.consultants_directory (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    slug TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    bio TEXT,
    experience_years INT DEFAULT 1,
    chat_rate_inr NUMERIC(10,2) DEFAULT 20.00,
    video_rate_inr NUMERIC(10,2) DEFAULT 50.00,
    is_verified BOOLEAN DEFAULT true,
    rating NUMERIC(3,2) DEFAULT 4.90,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Real-Time Consultant Feed Posts (Appends to Homepage)
CREATE TABLE IF NOT EXISTS public.consultant_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID REFERENCES public.consultants_directory(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'General Insight',
    likes_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Realtime Publications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'consultant_posts') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.consultant_posts;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'consultants_directory') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.consultants_directory;
    END IF;
END;
$$;
