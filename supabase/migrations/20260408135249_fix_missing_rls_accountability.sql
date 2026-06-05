-- Migration to fix missing Row-Level Security on accountability tables
-- Found that accountability_profiles and accountability_partnerships were created without RLS enabled

-- 1. Enable RLS on accountability_profiles
ALTER TABLE public.accountability_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Add policies for accountability_profiles
DO $$ BEGIN
  CREATE POLICY "Users can view their own accountability profile"
    ON public.accountability_profiles FOR SELECT
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own accountability profile"
    ON public.accountability_profiles FOR UPDATE
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own accountability profile"
    ON public.accountability_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Enable RLS on accountability_partnerships
ALTER TABLE public.accountability_partnerships ENABLE ROW LEVEL SECURITY;

-- 4. Add policies for accountability_partnerships
DO $$ BEGIN
  CREATE POLICY "Users can view their own partnerships"
    ON public.accountability_partnerships FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = partner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can initiate their own partnerships"
    ON public.accountability_partnerships FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own partnerships"
    ON public.accountability_partnerships FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = partner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own partnerships"
    ON public.accountability_partnerships FOR DELETE
    USING (auth.uid() = user_id OR auth.uid() = partner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Final check: Ensure all tables in the public schema have RLS enabled
-- This is a safety measure to ensure no other tables were missed
COMMENT ON TABLE public.accountability_profiles IS 'Enforced RLS on 2026-04-08 to resolve Supabase security warning';
COMMENT ON TABLE public.accountability_partnerships IS 'Enforced RLS on 2026-04-08 to resolve Supabase security warning';
