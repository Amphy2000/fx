-- Create email workflows table for automated emails
CREATE TABLE IF NOT EXISTS public.email_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'user_signup', 'milestone_achieved', 'streak_milestone', etc.
  trigger_conditions JSONB DEFAULT '{}'::jsonb,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  delay_minutes INTEGER DEFAULT 0, -- Delay before sending (0 = immediate)
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  sent_count INTEGER DEFAULT 0
);

-- Create workflow execution log table
CREATE TABLE IF NOT EXISTS public.email_workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.email_workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email_send_id UUID REFERENCES public.email_sends(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.email_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_workflow_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_workflows
CREATE POLICY "Admins can manage email workflows"
  ON public.email_workflows
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for email_workflow_executions
CREATE POLICY "Admins can view workflow executions"
  ON public.email_workflow_executions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert workflow executions"
  ON public.email_workflow_executions
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_email_workflows_trigger_type ON public.email_workflows(trigger_type);
CREATE INDEX idx_email_workflows_is_active ON public.email_workflows(is_active);
CREATE INDEX idx_email_workflow_executions_workflow_id ON public.email_workflow_executions(workflow_id);
CREATE INDEX idx_email_workflow_executions_user_id ON public.email_workflow_executions(user_id);
CREATE INDEX idx_email_workflow_executions_status ON public.email_workflow_executions(status);

-- Function to trigger welcome email on new user signup
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call edge function to process welcome email workflow
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/process-email-workflow',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := jsonb_build_object(
      'trigger_type', 'user_signup',
      'user_id', NEW.id,
      'data', jsonb_build_object('email', NEW.email, 'full_name', NEW.full_name)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_user_signup_email ON public.profiles;
CREATE TRIGGER on_user_signup_email
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_welcome_email();

-- Function to trigger milestone emails
CREATE OR REPLACE FUNCTION public.trigger_milestone_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call edge function to process milestone email workflow
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/process-email-workflow',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := jsonb_build_object(
      'trigger_type', 'milestone_achieved',
      'user_id', NEW.user_id,
      'data', jsonb_build_object(
        'achievement_name', NEW.achievement_name,
        'achievement_type', NEW.achievement_type
      )
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for achievements
DROP TRIGGER IF EXISTS on_achievement_earned_email ON public.achievements;
CREATE TRIGGER on_achievement_earned_email
  AFTER INSERT ON public.achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_milestone_email();