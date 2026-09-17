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
