-- Add unique constraint for MT5 account numbers (one account per user)
ALTER TABLE mt5_accounts 
ADD CONSTRAINT unique_account_per_user UNIQUE (account_number, user_id);

-- Add last credit check timestamp to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_credit_check timestamp with time zone DEFAULT now();

-- Function to prevent duplicate signups by email
CREATE OR REPLACE FUNCTION check_duplicate_signup()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check for duplicate signups
DROP TRIGGER IF EXISTS prevent_duplicate_signup ON profiles;
CREATE TRIGGER prevent_duplicate_signup
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_signup();

-- Function to check and reset monthly limits (credits and trades)
CREATE OR REPLACE FUNCTION check_and_reset_limits(user_id_param uuid)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically check limits on profile access
CREATE OR REPLACE FUNCTION auto_check_limits()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-check limits on profile updates
DROP TRIGGER IF EXISTS trigger_auto_check_limits ON profiles;
CREATE TRIGGER trigger_auto_check_limits
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_check_limits();