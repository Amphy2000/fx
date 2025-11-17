-- Fix security linter warnings by setting search_path on functions

-- Recreate check_duplicate_signup with search_path
CREATE OR REPLACE FUNCTION check_duplicate_signup()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if email already exists in profiles
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(email) = LOWER(NEW.email) 
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'An account with this email already exists. Please sign in instead.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate check_and_reset_limits with search_path
CREATE OR REPLACE FUNCTION check_and_reset_limits(user_id_param uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record profiles%ROWTYPE;
  days_since_reset integer;
BEGIN
  -- Get the user's profile
  SELECT * INTO profile_record 
  FROM profiles 
  WHERE id = user_id_param;
  
  -- Calculate days since last reset
  days_since_reset := EXTRACT(DAY FROM (now() - COALESCE(profile_record.credits_reset_date, profile_record.created_at)));
  
  -- Reset if 30+ days have passed
  IF days_since_reset >= 30 THEN
    UPDATE profiles 
    SET 
      ai_credits = CASE 
        WHEN subscription_tier = 'free' THEN 50
        WHEN subscription_tier = 'premium' THEN 500
        ELSE 200
      END,
      trades_count = 0,
      credits_reset_date = now(),
      last_credit_check = now()
    WHERE id = user_id_param;
  ELSE
    -- Just update the last check time
    UPDATE profiles 
    SET last_credit_check = now()
    WHERE id = user_id_param;
  END IF;
END;
$$;

-- Recreate auto_check_limits with search_path
CREATE OR REPLACE FUNCTION auto_check_limits()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hours_since_check integer;
BEGIN
  -- Only check if it's been more than 1 hour since last check
  hours_since_check := EXTRACT(EPOCH FROM (now() - COALESCE(NEW.last_credit_check, NEW.created_at))) / 3600;
  
  IF hours_since_check >= 1 THEN
    PERFORM check_and_reset_limits(NEW.id);
    -- Refresh the record
    SELECT * INTO NEW FROM profiles WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;