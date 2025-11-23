-- Add email notification preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.profiles.email_notifications_enabled IS 'Whether user wants to receive weekly summary emails';