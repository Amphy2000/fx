-- Add recovery mode columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_in_recovery_mode boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recovery_mode_started_at timestamp with time zone;

-- Create voice_memos table for free voice recordings
CREATE TABLE IF NOT EXISTS public.voice_memos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  trade_id uuid REFERENCES public.trades ON DELETE SET NULL,
  storage_path text NOT NULL,
  duration integer NOT NULL DEFAULT 0,
  transcript text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_memos ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice_memos
CREATE POLICY "Users can view their own voice memos"
ON public.voice_memos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice memos"
ON public.voice_memos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice memos"
ON public.voice_memos FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for voice memos
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-memos', 'voice-memos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for voice memos
CREATE POLICY "Users can upload their own voice memos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voice-memos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own voice memos"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-memos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own voice memos"
ON storage.objects FOR DELETE
USING (bucket_id = 'voice-memos' AND auth.uid()::text = (storage.foldername(name))[1]);