-- Fix subscription tier constraint to allow 'lifetime' tier
-- First check current constraint
DO $$
BEGIN
  -- Drop the existing check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'profiles' 
    AND constraint_name = 'profiles_subscription_tier_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_subscription_tier_check;
  END IF;
  
  -- Add new constraint that includes 'lifetime'
  ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_subscription_tier_check 
  CHECK (subscription_tier IN ('free', 'monthly', 'premium', 'lifetime'));
END$$;