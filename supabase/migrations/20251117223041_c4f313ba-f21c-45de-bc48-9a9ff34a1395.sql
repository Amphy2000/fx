-- Remove problematic auto_check_limits trigger to unblock admin upgrades
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