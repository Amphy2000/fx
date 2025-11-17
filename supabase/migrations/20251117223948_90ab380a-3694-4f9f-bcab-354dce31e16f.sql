-- Remove all problematic triggers that cause tuple modification conflicts
DO $$
BEGIN
  -- Remove update_updated_at_column trigger if it exists on profiles
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_updated_at_column_profiles'
      AND tgrelid = 'public.profiles'::regclass
  ) THEN
    DROP TRIGGER update_updated_at_column_profiles ON public.profiles;
  END IF;
  
  -- Remove any other triggers that might be updating profiles
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at'
      AND tgrelid = 'public.profiles'::regclass
  ) THEN
    DROP TRIGGER set_updated_at ON public.profiles;
  END IF;
  
  -- Remove any trigger that might conflict with updates
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'handle_updated_at'
      AND tgrelid = 'public.profiles'::regclass
  ) THEN
    DROP TRIGGER handle_updated_at ON public.profiles;
  END IF;
END$$;