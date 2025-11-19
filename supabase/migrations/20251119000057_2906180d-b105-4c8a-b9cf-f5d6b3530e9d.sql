-- Create campaigns table for automated notifications
CREATE TABLE public.notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'inactivity', 'milestone', 'trade_count', 'win_streak', 'loss_streak', 'custom'
  trigger_conditions JSONB NOT NULL, -- e.g., {"days": 7} for inactivity, {"achievement": "first_trade"} for milestone
  notification_title TEXT NOT NULL,
  notification_body TEXT NOT NULL,
  notification_template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  action_buttons JSONB,
  user_segment TEXT NOT NULL DEFAULT 'all', -- 'all', 'free', 'monthly', 'lifetime', 'inactive'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at TIMESTAMPTZ,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_triggered INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage campaigns"
ON public.notification_campaigns
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_campaigns_active ON public.notification_campaigns(is_active, trigger_type);
CREATE INDEX idx_campaigns_last_run ON public.notification_campaigns(last_run_at) WHERE is_active = true;

-- Add updated_at trigger
CREATE TRIGGER update_notification_campaigns_updated_at
BEFORE UPDATE ON public.notification_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create campaign logs table to track execution
CREATE TABLE public.campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.notification_campaigns(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  users_matched INTEGER NOT NULL DEFAULT 0,
  notifications_sent INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  error_message TEXT
);

-- Enable RLS on campaign logs
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy for campaign logs
CREATE POLICY "Admins can view campaign logs"
ON public.campaign_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create index on campaign logs
CREATE INDEX idx_campaign_logs_campaign ON public.campaign_logs(campaign_id, executed_at DESC);