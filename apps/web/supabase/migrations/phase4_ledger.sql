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
