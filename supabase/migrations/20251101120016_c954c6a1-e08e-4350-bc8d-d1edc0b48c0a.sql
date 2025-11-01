-- Add data collection consent and streak tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS data_collection_consent BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS consent_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_trade_date DATE,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- Create function to update streak on trade insert
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  last_date DATE;
  trade_date DATE;
BEGIN
  trade_date := DATE(NEW.created_at);
  
  SELECT last_trade_date INTO last_date
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- If first trade or same day, don't update streak
  IF last_date IS NULL THEN
    UPDATE profiles
    SET last_trade_date = trade_date,
        current_streak = 1,
        longest_streak = GREATEST(longest_streak, 1)
    WHERE id = NEW.user_id;
  ELSIF last_date = trade_date THEN
    -- Same day, just update last_trade_date
    UPDATE profiles
    SET last_trade_date = trade_date
    WHERE id = NEW.user_id;
  ELSIF last_date = trade_date - INTERVAL '1 day' THEN
    -- Consecutive day
    UPDATE profiles
    SET last_trade_date = trade_date,
        current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1)
    WHERE id = NEW.user_id;
  ELSE
    -- Streak broken
    UPDATE profiles
    SET last_trade_date = trade_date,
        current_streak = 1
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for streak updates
DROP TRIGGER IF EXISTS update_streak_on_trade ON public.trades;
CREATE TRIGGER update_streak_on_trade
  AFTER INSERT ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_streak();