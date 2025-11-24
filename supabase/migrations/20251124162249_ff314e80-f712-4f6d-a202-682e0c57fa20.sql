-- Drop problematic triggers that are blocking user signups
-- These triggers try to access configuration parameters that don't exist

DROP TRIGGER IF EXISTS on_user_welcome_email ON auth.users;
DROP TRIGGER IF EXISTS on_milestone_email ON public.achievements;

-- Recreate the functions without the HTTP call (email workflows can be triggered separately)
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Simply return NEW without attempting HTTP calls
  -- Email workflows will be triggered separately via application logic
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_milestone_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Simply return NEW without attempting HTTP calls
  -- Email workflows will be triggered separately via application logic
  RETURN NEW;
END;
$$;