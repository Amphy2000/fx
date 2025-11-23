-- Add manual upload tracking columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS manual_upload_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_manual_upload_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_manual_upload ON profiles(manual_upload_count);

-- Comment for documentation
COMMENT ON COLUMN profiles.manual_upload_count IS 'Tracks number of manual MT5 file uploads for conversion optimization';
COMMENT ON COLUMN profiles.last_manual_upload_at IS 'Timestamp of last manual MT5 file upload';