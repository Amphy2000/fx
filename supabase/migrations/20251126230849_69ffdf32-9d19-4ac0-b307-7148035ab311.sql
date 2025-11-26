-- Add daily check-in reminder preferences to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS checkin_reminder_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS checkin_reminder_time time DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS checkin_reminder_channels text[] DEFAULT ARRAY['in_app']::text[],
ADD COLUMN IF NOT EXISTS avg_first_trade_hour integer;

COMMENT ON COLUMN profiles.checkin_reminder_enabled IS 'Whether user wants daily check-in reminders';
COMMENT ON COLUMN profiles.checkin_reminder_time IS 'Preferred time for daily check-in reminder';
COMMENT ON COLUMN profiles.checkin_reminder_channels IS 'Notification channels: in_app, telegram, email';
COMMENT ON COLUMN profiles.avg_first_trade_hour IS 'Average hour of first trade for smart timing (0-23)';