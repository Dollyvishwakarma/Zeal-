-- 1. Create Consultant Sparks (Impressions) tracking table
CREATE TABLE IF NOT EXISTS public.sparks (
    consultant_id UUID PRIMARY KEY REFERENCES auth.users(id),
    total_sparks BIGINT DEFAULT 0,
    last_spark_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Secure RPC to increment Sparks (Prevents Client-Side Payload Manipulation)
CREATE OR REPLACE FUNCTION increment_spark(p_consultant_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO public.sparks (consultant_id, total_sparks)
    VALUES (p_consultant_id, 1)
    ON CONFLICT (consultant_id)
    DO UPDATE SET 
        total_sparks = public.sparks.total_sparks + 1,
        last_spark_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. The 60-Second Financial Pulse (INR) - Atomic Server-Side Deduction
CREATE OR REPLACE FUNCTION pulse_deduct_inr(p_consultation_id UUID, p_client_id UUID)
RETURNS json AS $$
DECLARE
    v_rate NUMERIC;
    v_balance NUMERIC;
    v_status TEXT;
    v_terminate BOOLEAN := false;
BEGIN
    -- Verify Session Status
    SELECT rate_per_minute, status INTO v_rate, v_status 
    FROM public.consultations 
    WHERE id = p_consultation_id AND client_id = p_client_id;
    
    IF NOT FOUND OR v_status != 'ACTIVE' THEN
        RETURN json_build_object('success', false, 'error', 'Consultation is not active.');
    END IF;

    -- Lock and verify User Balance
    SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = p_client_id FOR UPDATE;

    IF v_balance < v_rate THEN
        -- Force Database Level Termination
        UPDATE public.consultations SET status = 'TERMINATED', ended_at = now() WHERE id = p_consultation_id;
        RETURN json_build_object('success', false, 'terminate', true, 'error', 'Insufficient funds. Auto-terminated.');
    END IF;

    -- Execute strict INR atomic debits & logging
    UPDATE public.profiles SET wallet_balance = wallet_balance - v_rate WHERE id = p_client_id;
    UPDATE public.consultations SET total_cost = total_cost + v_rate WHERE id = p_consultation_id;
    
    INSERT INTO public.wallet_ledger (user_id, amount, transaction_type, reference_id)
    VALUES (p_client_id, v_rate, 'DEBIT', p_consultation_id::TEXT);

    -- Flag UI if funds will drop below minimum requirement before the next minute
    IF (v_balance - v_rate) < v_rate THEN
        v_terminate := true;
    END IF;

    RETURN json_build_object('success', true, 'deducted_inr', v_rate, 'remaining_inr', (v_balance - v_rate), 'terminate_next', v_terminate);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Publish tables securely for Real-time streaming
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sparks') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sparks;
    END IF;
END;
$$;
-- 1. Add Online Status to Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- 2. Safely add to Realtime Publication (so users can see who is online)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
END;
$$;
-- Run this in your Supabase SQL Editor
-- 1. Immutable Wallet Ledger
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type TEXT CHECK (transaction_type IN ('CREDIT', 'DEBIT', 'HOLD', 'REFUND')),
    gateway TEXT DEFAULT 'INSTAMOJO',
    reference_id TEXT, -- Instamojo Payment ID or Consultation ID
    status TEXT DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Consultations Tracking
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES auth.users(id) NOT NULL,
    consultant_id UUID NOT NULL,
    service_type TEXT CHECK (service_type IN ('CHAT', 'AUDIO', 'VIDEO', 'PHYSICAL')),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    rate_per_minute DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. System Notifications (Real-Time)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id UUID NOT NULL, -- User, Consultant, or Admin ID
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Safely add to Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wallet_ledger') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_ledger;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'consultations') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END;
$$;
-- 1. Create Messages Table for Real-Time Consultations
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id TEXT NOT NULL, -- UUID for human, or category-slug-ai for AI
    sender_id TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('USER', 'CONSULTANT', 'AI', 'SYSTEM')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Safely add to Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END;
$$;
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
