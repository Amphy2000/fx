-- Create trade_interceptions table to track pre-journal validations
CREATE TABLE IF NOT EXISTS public.trade_interceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposed_trade JSONB NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  pattern_matched TEXT,
  similar_trades_count INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2),
  suggested_action TEXT NOT NULL,
  user_action TEXT CHECK (user_action IN ('logged_anyway', 'cancelled', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trade_interceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own interceptions"
  ON public.trade_interceptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interceptions"
  ON public.trade_interceptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interceptions"
  ON public.trade_interceptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_trade_interceptions_user_id ON public.trade_interceptions(user_id);
CREATE INDEX idx_trade_interceptions_created_at ON public.trade_interceptions(created_at DESC);