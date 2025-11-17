-- Refactor auto_check_limits to avoid tuple modification conflicts and switch to AFTER UPDATE trigger
-- 1) Update the trigger function to not modify NEW and to only run once per hour
CREATE OR REPLACE FUNCTION public.auto_check_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hours_since_check integer;
BEGIN
  -- Calculate hours since last check (fallback to created_at)
  hours_since_check := EXTRACT(EPOCH FROM (now() - COALESCE(NEW.last_credit_check, NEW.created_at))) / 3600;

  -- Only run the heavy reset logic at most once per hour
  IF hours_since_check >= 1 THEN
    PERFORM check_and_reset_limits(NEW.id);
  END IF;

  -- Do not modify NEW here in AFTER trigger context
  RETURN NEW;
END;
$$;

-- 2) Recreate the trigger as AFTER UPDATE to prevent 27000 error
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'auto_check_limits_trigger'
      AND tgrelid = 'public.profiles'::regclass
  ) THEN
    DROP TRIGGER auto_check_limits_trigger ON public.profiles;
  END IF;
END$$;

CREATE TRIGGER auto_check_limits_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_check_limits();