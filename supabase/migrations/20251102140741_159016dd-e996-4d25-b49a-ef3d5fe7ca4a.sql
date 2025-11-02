-- Create copilot feedback table
CREATE TABLE public.copilot_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_setup JSONB NOT NULL,
  analysis_result TEXT NOT NULL,
  feedback BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.copilot_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own feedback"
ON public.copilot_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
ON public.copilot_feedback
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
ON public.copilot_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create leaderboard view for public profiles
CREATE TABLE public.leaderboard_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  total_trades INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  profit_factor NUMERIC(10,2) NOT NULL DEFAULT 0,
  best_pair TEXT,
  trading_since DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leaderboard_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leaderboard
CREATE POLICY "Public profiles are viewable by everyone"
ON public.leaderboard_profiles
FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can view their own profile"
ON public.leaderboard_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.leaderboard_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.leaderboard_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger to update leaderboard profile
CREATE OR REPLACE FUNCTION public.update_leaderboard_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_trades INTEGER;
  v_winning_trades INTEGER;
  v_win_rate NUMERIC(5,2);
  v_total_profit NUMERIC;
  v_total_loss NUMERIC;
  v_profit_factor NUMERIC(10,2);
  v_best_pair TEXT;
BEGIN
  -- Calculate stats
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE result = 'win'),
    SUM(profit_loss) FILTER (WHERE profit_loss > 0),
    ABS(SUM(profit_loss) FILTER (WHERE profit_loss < 0))
  INTO v_total_trades, v_winning_trades, v_total_profit, v_total_loss
  FROM trades
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND result IS NOT NULL;
  
  v_win_rate := CASE 
    WHEN v_total_trades > 0 THEN (v_winning_trades::NUMERIC / v_total_trades * 100)
    ELSE 0 
  END;
  
  v_profit_factor := CASE 
    WHEN v_total_loss > 0 THEN (v_total_profit / v_total_loss)
    ELSE 0 
  END;
  
  -- Get best pair
  SELECT pair INTO v_best_pair
  FROM trades
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND result = 'win'
  GROUP BY pair
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  -- Update or insert leaderboard profile
  INSERT INTO leaderboard_profiles (user_id, display_name, total_trades, win_rate, profit_factor, best_pair, trading_since)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    (SELECT COALESCE(full_name, email) FROM profiles WHERE id = COALESCE(NEW.user_id, OLD.user_id)),
    v_total_trades,
    v_win_rate,
    v_profit_factor,
    v_best_pair,
    (SELECT MIN(DATE(created_at)) FROM trades WHERE user_id = COALESCE(NEW.user_id, OLD.user_id))
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_trades = v_total_trades,
    win_rate = v_win_rate,
    profit_factor = v_profit_factor,
    best_pair = v_best_pair,
    updated_at = now();
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger for leaderboard updates
CREATE TRIGGER update_leaderboard_on_trade_change
AFTER INSERT OR UPDATE OR DELETE ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.update_leaderboard_stats();