-- Remove only user-defined triggers from profiles table (not system constraint triggers)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find and drop only user-defined triggers (not constraint triggers)
    FOR r IN (
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'public.profiles'::regclass 
        AND NOT tgisinternal  -- Exclude internal/constraint triggers
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.profiles';
        RAISE NOTICE 'Dropped trigger %', r.tgname;
    END LOOP;
END$$;

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.auto_check_limits() CASCADE;
DROP FUNCTION IF EXISTS public.check_and_reset_limits(uuid) CASCADE;