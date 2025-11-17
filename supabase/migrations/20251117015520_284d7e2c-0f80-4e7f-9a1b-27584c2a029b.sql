-- MT5 Accounts table (enhanced from mt5_connections)
CREATE TABLE IF NOT EXISTS public.mt5_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  account_name TEXT,
  broker_name TEXT NOT NULL,
  server_name TEXT NOT NULL,
  account_type TEXT DEFAULT 'live', -- live, demo
  currency TEXT DEFAULT 'USD',
  leverage INTEGER,
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 5,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT DEFAULT 'pending', -- pending, success, error
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, account_number, broker_name)
);

-- Enhanced trade history with MT5 metadata
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mt5_account_id UUID REFERENCES public.mt5_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS ticket_number TEXT;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS magic_number INTEGER;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS commission NUMERIC;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS swap NUMERIC;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS volume NUMERIC;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS open_time TIMESTAMPTZ;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS close_time TIMESTAMPTZ;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS session TEXT; -- london, new_york, asia, sydney
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS r_multiple NUMERIC;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS is_auto_synced BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_trades_mt5_account ON public.trades(mt5_account_id);
CREATE INDEX IF NOT EXISTS idx_trades_ticket ON public.trades(ticket_number);
CREATE INDEX IF NOT EXISTS idx_trades_open_time ON public.trades(open_time);
CREATE INDEX IF NOT EXISTS idx_trades_session ON public.trades(session);

-- Automated sync logs
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mt5_account_id UUID NOT NULL REFERENCES public.mt5_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- manual, auto, scheduled
  status TEXT NOT NULL, -- started, completed, failed
  trades_imported INTEGER DEFAULT 0,
  trades_updated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_account ON public.sync_logs(mt5_account_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user ON public.sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON public.sync_logs(started_at DESC);

-- Performance metrics snapshots
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mt5_account_id UUID REFERENCES public.mt5_accounts(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  balance NUMERIC,
  equity NUMERIC,
  margin NUMERIC,
  free_margin NUMERIC,
  margin_level NUMERIC,
  daily_pnl NUMERIC,
  weekly_pnl NUMERIC,
  monthly_pnl NUMERIC,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  win_rate NUMERIC,
  profit_factor NUMERIC,
  average_win NUMERIC,
  average_loss NUMERIC,
  largest_win NUMERIC,
  largest_loss NUMERIC,
  max_drawdown NUMERIC,
  max_drawdown_percent NUMERIC,
  sharpe_ratio NUMERIC,
  expectancy NUMERIC,
  average_r NUMERIC,
  consecutive_wins INTEGER DEFAULT 0,
  consecutive_losses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, mt5_account_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_metrics_user_date ON public.performance_metrics(user_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_account_date ON public.performance_metrics(mt5_account_id, metric_date DESC);

-- Equity snapshots for equity curve
CREATE TABLE IF NOT EXISTS public.equity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mt5_account_id UUID REFERENCES public.mt5_accounts(id) ON DELETE CASCADE,
  snapshot_time TIMESTAMPTZ NOT NULL,
  balance NUMERIC NOT NULL,
  equity NUMERIC NOT NULL,
  margin_used NUMERIC,
  free_margin NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equity_user_time ON public.equity_snapshots(user_id, snapshot_time DESC);
CREATE INDEX IF NOT EXISTS idx_equity_account_time ON public.equity_snapshots(mt5_account_id, snapshot_time DESC);

-- Trade tags (auto and manual)
CREATE TABLE IF NOT EXISTS public.trade_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_type TEXT NOT NULL, -- auto, manual
  confidence NUMERIC, -- for auto tags
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trade_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_trade_tags_trade ON public.trade_tags(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_tags_user ON public.trade_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_tags_name ON public.trade_tags(tag_name);

-- Strategy/Setup performance analysis
CREATE TABLE IF NOT EXISTS public.setup_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  setup_id UUID REFERENCES public.setups(id) ON DELETE CASCADE,
  setup_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  win_rate NUMERIC,
  profit_factor NUMERIC,
  total_pnl NUMERIC,
  average_win NUMERIC,
  average_loss NUMERIC,
  average_r NUMERIC,
  max_consecutive_wins INTEGER DEFAULT 0,
  max_consecutive_losses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, setup_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_setup_perf_user ON public.setup_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_setup_perf_setup ON public.setup_performance(setup_id);

-- RLS Policies for mt5_accounts
ALTER TABLE public.mt5_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own MT5 accounts"
  ON public.mt5_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MT5 accounts"
  ON public.mt5_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MT5 accounts"
  ON public.mt5_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MT5 accounts"
  ON public.mt5_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync logs"
  ON public.sync_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync logs"
  ON public.sync_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for performance_metrics
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metrics"
  ON public.performance_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
  ON public.performance_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics"
  ON public.performance_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for equity_snapshots
ALTER TABLE public.equity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own equity snapshots"
  ON public.equity_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own equity snapshots"
  ON public.equity_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for trade_tags
ALTER TABLE public.trade_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trade tags"
  ON public.trade_tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trade tags"
  ON public.trade_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trade tags"
  ON public.trade_tags FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for setup_performance
ALTER TABLE public.setup_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own setup performance"
  ON public.setup_performance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own setup performance"
  ON public.setup_performance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own setup performance"
  ON public.setup_performance FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_mt5_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mt5_accounts_updated_at
  BEFORE UPDATE ON public.mt5_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_mt5_accounts_updated_at();

CREATE TRIGGER update_setup_performance_updated_at
  BEFORE UPDATE ON public.setup_performance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();