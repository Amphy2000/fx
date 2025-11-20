-- Create table for tracking flagged signups
CREATE TABLE IF NOT EXISTS public.flagged_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  signup_ip_address text,
  signup_fingerprint text,
  flagged_reason text NOT NULL,
  flagged_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create table for IP/device overrides
CREATE TABLE IF NOT EXISTS public.abuse_prevention_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  override_type text NOT NULL CHECK (override_type IN ('ip_address', 'fingerprint', 'email')),
  override_value text NOT NULL,
  reason text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(override_type, override_value)
);

-- Enable RLS
ALTER TABLE public.flagged_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_prevention_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flagged_signups
CREATE POLICY "Admins can view all flagged signups"
  ON public.flagged_signups
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update flagged signups"
  ON public.flagged_signups
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert flagged signups"
  ON public.flagged_signups
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for abuse_prevention_overrides
CREATE POLICY "Admins can view all overrides"
  ON public.abuse_prevention_overrides
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage overrides"
  ON public.abuse_prevention_overrides
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_flagged_signups_status ON public.flagged_signups(status);
CREATE INDEX idx_flagged_signups_email ON public.flagged_signups(email);
CREATE INDEX idx_abuse_overrides_value ON public.abuse_prevention_overrides(override_type, override_value);
CREATE INDEX idx_abuse_overrides_active ON public.abuse_prevention_overrides(is_active);

-- Update the duplicate signup check to respect overrides
CREATE OR REPLACE FUNCTION public.check_duplicate_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signup_ip text;
  v_fingerprint text;
  v_has_ip_override boolean;
  v_has_fingerprint_override boolean;
  v_has_email_override boolean;
BEGIN
  -- Get IP and fingerprint from metadata
  v_signup_ip := NEW.raw_user_meta_data->>'signup_ip';
  v_fingerprint := NEW.raw_user_meta_data->>'signup_fingerprint';
  
  -- Check for active overrides
  SELECT EXISTS (
    SELECT 1 FROM abuse_prevention_overrides
    WHERE override_type = 'ip_address'
    AND override_value = v_signup_ip
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_has_ip_override;
  
  SELECT EXISTS (
    SELECT 1 FROM abuse_prevention_overrides
    WHERE override_type = 'fingerprint'
    AND override_value = v_fingerprint
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_has_fingerprint_override;
  
  SELECT EXISTS (
    SELECT 1 FROM abuse_prevention_overrides
    WHERE override_type = 'email'
    AND override_value = LOWER(NEW.email)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_has_email_override;
  
  -- Check if email already exists in profiles
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(email) = LOWER(NEW.email) 
    AND id != NEW.id
  ) THEN
    -- Log the flagged signup
    INSERT INTO flagged_signups (email, signup_ip_address, signup_fingerprint, flagged_reason, status)
    VALUES (NEW.email, v_signup_ip, v_fingerprint, 'Duplicate email', 'rejected');
    
    RAISE EXCEPTION 'An account with this email already exists. Please sign in instead.';
  END IF;
  
  -- Check if IP address already has an account (only for free tier, unless overridden)
  IF NOT v_has_ip_override AND v_signup_ip IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE signup_ip_address = v_signup_ip 
    AND id != NEW.id
    AND subscription_tier = 'free'
    AND created_at > NOW() - INTERVAL '30 days'
  ) THEN
    -- Log the flagged signup
    INSERT INTO flagged_signups (email, signup_ip_address, signup_fingerprint, flagged_reason, status)
    VALUES (NEW.email, v_signup_ip, v_fingerprint, 'Duplicate IP address', 'pending');
    
    RAISE EXCEPTION 'An account from this location already exists. Please contact support if you need multiple accounts.';
  END IF;
  
  -- Check if fingerprint already has an account (unless overridden)
  IF NOT v_has_fingerprint_override AND v_fingerprint IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE signup_fingerprint = v_fingerprint 
    AND id != NEW.id
    AND subscription_tier = 'free'
    AND created_at > NOW() - INTERVAL '30 days'
  ) THEN
    -- Log the flagged signup
    INSERT INTO flagged_signups (email, signup_ip_address, signup_fingerprint, flagged_reason, status)
    VALUES (NEW.email, v_signup_ip, v_fingerprint, 'Duplicate device fingerprint', 'pending');
    
    RAISE EXCEPTION 'An account from this device already exists. Please contact support if you need multiple accounts.';
  END IF;
  
  RETURN NEW;
END;
$$;