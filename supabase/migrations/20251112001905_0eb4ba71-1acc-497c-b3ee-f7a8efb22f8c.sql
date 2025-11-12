-- MT5 Connections table for storing user MT5 account credentials
CREATE TABLE public.mt5_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_name TEXT NOT NULL,
  server_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  investor_password_encrypted TEXT, -- Will store encrypted password
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending', -- pending, syncing, success, error
  sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_number)
);

-- Trade insights table for AI-generated analysis
CREATE TABLE public.trade_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- AI-detected pattern
  pattern_type TEXT, -- breakout, reversal, pullback, range, scalp, swing
  
  -- Behavioral analysis
  behavior_label TEXT, -- "chased_entry", "held_too_long", "emotional_exit", "perfect_timing"
  behavior_comment TEXT,
  
  -- AI confidence and scoring
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  execution_grade TEXT, -- A+, A, B, C, D, F
  
  -- Additional context
  ai_summary TEXT,
  recommendations TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(trade_id)
);

-- Enable RLS
ALTER TABLE public.mt5_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mt5_connections
CREATE POLICY "Users can view their own MT5 connections"
ON public.mt5_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MT5 connections"
ON public.mt5_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MT5 connections"
ON public.mt5_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MT5 connections"
ON public.mt5_connections FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for trade_insights
CREATE POLICY "Users can view their own trade insights"
ON public.trade_insights FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trade insights"
ON public.trade_insights FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trade insights"
ON public.trade_insights FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trade insights"
ON public.trade_insights FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_mt5_connections_updated_at
BEFORE UPDATE ON public.mt5_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trade_insights_updated_at
BEFORE UPDATE ON public.trade_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();