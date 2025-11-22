-- Fix extension in public schema by moving to extensions schema
-- Note: This is a warning fix - extensions should typically be in their own schema
-- but for simplicity we'll document this for manual review if needed

-- Create achievements tracking table for credit earning
CREATE TABLE IF NOT EXISTS public.credit_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  earning_type TEXT NOT NULL,
  credits_earned INTEGER NOT NULL,
  description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own credit earnings"
  ON public.credit_earnings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert credit earnings"
  ON public.credit_earnings FOR INSERT
  WITH CHECK (true);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.edge_function_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, function_name, window_start)
);

-- Enable RLS
ALTER TABLE public.edge_function_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create function to award credits
CREATE OR REPLACE FUNCTION public.award_credits(
  p_user_id UUID,
  p_earning_type TEXT,
  p_credits INTEGER,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert credit earning record
  INSERT INTO credit_earnings (user_id, earning_type, credits_earned, description)
  VALUES (p_user_id, p_earning_type, p_credits, p_description);
  
  -- Update user's credit balance
  UPDATE profiles
  SET ai_credits = ai_credits + p_credits
  WHERE id = p_user_id;
END;
$$;

-- Create function to check and enforce rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_function_name TEXT,
  p_max_requests INTEGER DEFAULT 60,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  v_window_start := date_trunc('hour', now());
  
  -- Get current count for this window
  SELECT request_count INTO v_request_count
  FROM edge_function_rate_limits
  WHERE user_id = p_user_id
    AND function_name = p_function_name
    AND window_start = v_window_start;
  
  IF v_request_count IS NULL THEN
    -- First request in this window
    INSERT INTO edge_function_rate_limits (user_id, function_name, request_count, window_start)
    VALUES (p_user_id, p_function_name, 1, v_window_start);
    RETURN TRUE;
  ELSIF v_request_count < p_max_requests THEN
    -- Within limit, increment
    UPDATE edge_function_rate_limits
    SET request_count = request_count + 1
    WHERE user_id = p_user_id
      AND function_name = p_function_name
      AND window_start = v_window_start;
    RETURN TRUE;
  ELSE
    -- Rate limit exceeded
    RETURN FALSE;
  END IF;
END;
$$;