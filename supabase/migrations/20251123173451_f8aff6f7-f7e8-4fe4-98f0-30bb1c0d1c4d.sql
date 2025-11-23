-- Add is_edited column to partner_messages
ALTER TABLE partner_messages 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Add is_edited column to group_messages
ALTER TABLE group_messages 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;