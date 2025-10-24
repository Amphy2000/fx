-- Create storage bucket for trade screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trade-screenshots',
  'trade-screenshots',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
);

-- Create RLS policies for trade screenshots bucket
CREATE POLICY "Users can upload their own trade screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trade-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own trade screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'trade-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own trade screenshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'trade-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own trade screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'trade-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);