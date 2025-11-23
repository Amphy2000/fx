-- Create voice-notes storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-notes',
  'voice-notes',
  false,
  5242880, -- 5MB limit
  ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/m4a']
);

-- RLS policies for voice-notes bucket
CREATE POLICY "Users can upload their own voice notes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view voice notes in their partnerships"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-notes' AND
  (
    -- User can see their own voice notes
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- User can see voice notes from their partners
    EXISTS (
      SELECT 1 FROM accountability_partnerships ap
      WHERE ap.status = 'active'
      AND (ap.user_id = auth.uid() OR ap.partner_id = auth.uid())
      AND (
        (storage.foldername(name))[1] = ap.user_id::text OR
        (storage.foldername(name))[1] = ap.partner_id::text
      )
    )
  )
);

CREATE POLICY "Users can delete their own voice notes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-notes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);