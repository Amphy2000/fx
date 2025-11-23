-- Add voice message columns to group_messages table
ALTER TABLE public.group_messages 
ADD COLUMN IF NOT EXISTS voice_url TEXT,
ADD COLUMN IF NOT EXISTS voice_duration INTEGER;