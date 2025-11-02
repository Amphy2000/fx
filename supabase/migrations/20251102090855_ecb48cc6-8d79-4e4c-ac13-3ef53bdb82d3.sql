-- Add credit system to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ai_credits INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS credits_reset_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days');

-- Create function to reset credits monthly
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET ai_credits = CASE
    WHEN subscription_tier = 'free' THEN 50
    WHEN subscription_tier = 'monthly' THEN 500
    WHEN subscription_tier = 'lifetime' THEN 999999
    ELSE 50
  END,
  credits_reset_date = NOW() + INTERVAL '30 days'
  WHERE credits_reset_date <= NOW();
END;
$$;

-- Update existing users with credits based on tier
UPDATE profiles
SET ai_credits = CASE
  WHEN subscription_tier = 'free' THEN 50
  WHEN subscription_tier = 'monthly' THEN 500
  WHEN subscription_tier = 'lifetime' THEN 999999
  ELSE 50
END,
credits_reset_date = NOW() + INTERVAL '30 days'
WHERE ai_credits IS NULL;