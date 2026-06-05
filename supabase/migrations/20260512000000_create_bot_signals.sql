-- Create bot_signals table for automated SMC detections
CREATE TABLE IF NOT EXISTS public.bot_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL DEFAULT 'XAUUSD',
    direction TEXT NOT NULL, -- 'buy' or 'sell'
    entry_price NUMERIC NOT NULL,
    stop_loss NUMERIC NOT NULL,
    take_profit NUMERIC NOT NULL,
    ob_zone TEXT, -- e.g. "2350.50-2352.00"
    status TEXT DEFAULT 'pending', -- 'pending', 'active', 'won', 'lost'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bot_signals ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users (so dashboard can show them)
CREATE POLICY "Public read access for bot signals"
  ON public.bot_signals
  FOR SELECT
  USING (true);

-- Allow service role (bot) to manage signals
CREATE POLICY "Service role can manage bot signals"
  ON public.bot_signals
  FOR ALL
  USING (true);
