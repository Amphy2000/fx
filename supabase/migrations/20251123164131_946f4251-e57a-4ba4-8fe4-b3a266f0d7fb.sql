-- Create voice-messages storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-messages',
  'voice-messages',
  true,
  10485760, -- 10MB limit
  ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg']
);

-- Create chat-attachments storage bucket for files and images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  20971520, -- 20MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- RLS policies for voice-messages bucket
CREATE POLICY "Users can upload their own voice messages"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-messages' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view voice messages in their partnerships"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'voice-messages');

CREATE POLICY "Users can delete their own voice messages"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-messages' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for chat-attachments bucket
CREATE POLICY "Users can upload chat attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view chat attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add attachment columns to partner_messages if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_messages' AND column_name = 'attachment_url') THEN
    ALTER TABLE partner_messages ADD COLUMN attachment_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_messages' AND column_name = 'attachment_type') THEN
    ALTER TABLE partner_messages ADD COLUMN attachment_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_messages' AND column_name = 'attachment_name') THEN
    ALTER TABLE partner_messages ADD COLUMN attachment_name TEXT;
  END IF;
END $$;

-- Add attachment columns to group_messages if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_messages' AND column_name = 'attachment_url') THEN
    ALTER TABLE group_messages ADD COLUMN attachment_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_messages' AND column_name = 'attachment_type') THEN
    ALTER TABLE group_messages ADD COLUMN attachment_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_messages' AND column_name = 'attachment_name') THEN
    ALTER TABLE group_messages ADD COLUMN attachment_name TEXT;
  END IF;
END $$;

-- Create message_reactions table for group messages if it doesn't exist
CREATE TABLE IF NOT EXISTS group_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS on group_message_reactions
ALTER TABLE group_message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_message_reactions
CREATE POLICY "Users can view all reactions"
ON group_message_reactions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can add reactions"
ON group_message_reactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
ON group_message_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create partner_message_reactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS partner_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES partner_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS on partner_message_reactions
ALTER TABLE partner_message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for partner_message_reactions
CREATE POLICY "Users can view all reactions"
ON partner_message_reactions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can add reactions"
ON partner_message_reactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
ON partner_message_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);