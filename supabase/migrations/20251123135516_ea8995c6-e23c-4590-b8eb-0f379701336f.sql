-- Add read tracking columns
ALTER TABLE partner_messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Update existing system messages
UPDATE partner_messages 
SET is_system = true 
WHERE message_type = 'system';

-- Add index for efficient unread queries
CREATE INDEX IF NOT EXISTS idx_partner_messages_unread 
ON partner_messages(partnership_id, sender_id, read_at) 
WHERE read_at IS NULL;

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_partnership_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE partner_messages
  SET read_at = NOW()
  WHERE partnership_id = p_partnership_id
    AND sender_id != p_user_id
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;