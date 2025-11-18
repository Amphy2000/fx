-- Add notification metrics tracking
ALTER TABLE public.push_notifications
ADD COLUMN opened_count INTEGER DEFAULT 0,
ADD COLUMN clicked_count INTEGER DEFAULT 0,
ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE,
ADD COLUMN template_id UUID,
ADD COLUMN user_segment TEXT,
ADD COLUMN action_buttons JSONB;

-- Create notification templates table
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  action_buttons JSONB,
  category TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notification clicks tracking table
CREATE TABLE public.notification_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.push_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create scheduled notifications table
CREATE TABLE public.scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  user_segment TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  recurrence TEXT,
  template_id UUID REFERENCES public.notification_templates(id),
  action_buttons JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_templates
CREATE POLICY "Admins can manage templates"
  ON public.notification_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for notification_clicks
CREATE POLICY "Users can insert their own clicks"
  ON public.notification_clicks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all clicks"
  ON public.notification_clicks
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for scheduled_notifications
CREATE POLICY "Admins can manage scheduled notifications"
  ON public.scheduled_notifications
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_notification_clicks_notification_id ON public.notification_clicks(notification_id);
CREATE INDEX idx_notification_clicks_user_id ON public.notification_clicks(user_id);
CREATE INDEX idx_scheduled_notifications_scheduled_for ON public.scheduled_notifications(scheduled_for);
CREATE INDEX idx_scheduled_notifications_status ON public.scheduled_notifications(status);

-- Create trigger for templates updated_at
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();