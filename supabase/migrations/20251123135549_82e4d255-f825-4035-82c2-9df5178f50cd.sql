-- Fix search path for mark_messages_as_read function
DROP FUNCTION IF EXISTS mark_messages_as_read(UUID, UUID);

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;