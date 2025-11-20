-- Add IP tracking to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signup_ip_address text,
ADD COLUMN IF NOT EXISTS last_login_ip text,
ADD COLUMN IF NOT EXISTS signup_fingerprint text;

-- Create index for faster IP lookups
CREATE INDEX IF NOT EXISTS idx_profiles_signup_ip ON public.profiles(signup_ip_address);
CREATE INDEX IF NOT EXISTS idx_profiles_signup_fingerprint ON public.profiles(signup_fingerprint);

-- Update the duplicate signup check function to include IP checking
CREATE OR REPLACE FUNCTION public.check_duplicate_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signup_ip text;
  v_fingerprint text;
BEGIN
  -- Get IP and fingerprint from metadata
  v_signup_ip := NEW.raw_user_meta_data->>'signup_ip';
  v_fingerprint := NEW.raw_user_meta_data->>'signup_fingerprint';
  
  -- Check if email already exists in profiles
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(email) = LOWER(NEW.email) 
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'An account with this email already exists. Please sign in instead.';
  END IF;
  
  -- Check if IP address already has an account (only for free tier)
  IF v_signup_ip IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE signup_ip_address = v_signup_ip 
    AND id != NEW.id
    AND subscription_tier = 'free'
    AND created_at > NOW() - INTERVAL '30 days' -- Only check recent accounts
  ) THEN
    RAISE EXCEPTION 'An account from this location already exists. Please contact support if you need multiple accounts.';
  END IF;
  
  -- Check if fingerprint already has an account
  IF v_fingerprint IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE signup_fingerprint = v_fingerprint 
    AND id != NEW.id
    AND subscription_tier = 'free'
    AND created_at > NOW() - INTERVAL '30 days'
  ) THEN
    RAISE EXCEPTION 'An account from this device already exists. Please contact support if you need multiple accounts.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the handle_new_user function to capture IP and fingerprint
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    subscription_tier,
    subscription_status,
    ai_credits,
    monthly_trade_limit,
    credits_reset_date,
    signup_ip_address,
    signup_fingerprint
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'free',
    'active',
    50,
    10,
    NOW() + INTERVAL '30 days',
    NEW.raw_user_meta_data->>'signup_ip',
    NEW.raw_user_meta_data->>'signup_fingerprint'
  );
  RETURN NEW;
END;
$$;