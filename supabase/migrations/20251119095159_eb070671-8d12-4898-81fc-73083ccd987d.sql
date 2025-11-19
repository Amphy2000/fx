-- Create email warm-up schedules table
CREATE TABLE IF NOT EXISTS email_warm_up_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  current_daily_limit INTEGER NOT NULL DEFAULT 50,
  target_daily_limit INTEGER NOT NULL DEFAULT 10000,
  daily_increment INTEGER NOT NULL DEFAULT 50,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_increment_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create email send tracking table
CREATE TABLE IF NOT EXISTS email_send_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  send_date DATE NOT NULL DEFAULT CURRENT_DATE,
  emails_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(domain, send_date)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_warm_up_schedules_domain ON email_warm_up_schedules(domain);
CREATE INDEX IF NOT EXISTS idx_warm_up_schedules_active ON email_warm_up_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_send_tracking_domain_date ON email_send_tracking(domain, send_date);

-- Enable RLS
ALTER TABLE email_warm_up_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_send_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_warm_up_schedules
CREATE POLICY "Allow authenticated users to view warm-up schedules"
  ON email_warm_up_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create warm-up schedules"
  ON email_warm_up_schedules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow creators to update their warm-up schedules"
  ON email_warm_up_schedules FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Allow creators to delete their warm-up schedules"
  ON email_warm_up_schedules FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for email_send_tracking
CREATE POLICY "Allow authenticated users to view send tracking"
  ON email_send_tracking FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage send tracking"
  ON email_send_tracking FOR ALL
  TO service_role
  USING (true);

-- Function to increment warm-up limits
CREATE OR REPLACE FUNCTION increment_warmup_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_warm_up_schedules
  SET 
    current_daily_limit = LEAST(current_daily_limit + daily_increment, target_daily_limit),
    last_increment_at = now(),
    updated_at = now(),
    is_active = CASE 
      WHEN current_daily_limit + daily_increment >= target_daily_limit THEN false
      ELSE is_active
    END
  WHERE is_active = true
    AND DATE(last_increment_at) < CURRENT_DATE;
END;
$$;

-- Function to check if domain can send emails
CREATE OR REPLACE FUNCTION can_send_email(check_domain TEXT, email_count INTEGER DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_sent INTEGER;
  v_is_active BOOLEAN;
BEGIN
  -- Get warm-up schedule
  SELECT current_daily_limit, is_active INTO v_limit, v_is_active
  FROM email_warm_up_schedules
  WHERE domain = check_domain;
  
  -- If no warm-up schedule exists, allow sending
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- If warm-up is not active, allow sending
  IF NOT v_is_active THEN
    RETURN true;
  END IF;
  
  -- Get today's sent count
  SELECT COALESCE(emails_sent, 0) INTO v_sent
  FROM email_send_tracking
  WHERE domain = check_domain
    AND send_date = CURRENT_DATE;
  
  -- Check if within limit
  RETURN (COALESCE(v_sent, 0) + email_count) <= v_limit;
END;
$$;

-- Function to record email send
CREATE OR REPLACE FUNCTION record_email_send(send_domain TEXT, send_count INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO email_send_tracking (domain, send_date, emails_sent)
  VALUES (send_domain, CURRENT_DATE, send_count)
  ON CONFLICT (domain, send_date)
  DO UPDATE SET 
    emails_sent = email_send_tracking.emails_sent + send_count,
    updated_at = now();
END;
$$;