-- Migration: 011_enterprise_rls.sql
-- Description: Locks down database access so users/consultants only see their own data.
-- Note: Admins automatically bypass these rules via the SERVICE_ROLE key.

-- 1. Enable RLS on core tables
ALTER TABLE "Wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consultant" ENABLE ROW LEVEL SECURITY;

-- 2. Wallet Policies (Users can only see their own wallet)
CREATE POLICY "Users can view own wallet" 
ON "Wallet" FOR SELECT 
USING (auth.uid()::text = "userId");

-- 3. Transaction Policies (Users can only see transactions tied to their wallet)
CREATE POLICY "Users can view own transactions" 
ON "Transaction" FOR SELECT 
USING (
  "walletId" IN (SELECT id FROM "Wallet" WHERE "userId" = auth.uid()::text)
);

-- 4. Booking Policies (Users see their bookings, Consultants see their clients)
CREATE POLICY "Users view own bookings" 
ON "Booking" FOR SELECT 
USING (auth.uid()::text = "userId");

CREATE POLICY "Consultants view assigned bookings" 
ON "Booking" FOR SELECT 
USING (
  "consultantId" IN (SELECT id FROM "Consultant" WHERE "userId" = auth.uid()::text)
);

-- 5. Consultant Profile Policies
-- Anyone can view verified consultants (for the explore page)
CREATE POLICY "Public can view verified consultants" 
ON "Consultant" FOR SELECT 
USING (status = 'VERIFIED' AND "isActive" = true);

-- Consultants can view/update their own profile
CREATE POLICY "Consultants can manage own profile" 
ON "Consultant" FOR ALL 
USING (auth.uid()::text = "userId");
