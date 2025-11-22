-- Make trade-screenshots bucket truly public by removing restrictive RLS policies
-- and ensuring anonymous access for AI image analysis

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to upload screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their own screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view their own screenshots" ON storage.objects;

-- Create public read policy for trade-screenshots
CREATE POLICY "Public read access for trade-screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'trade-screenshots');

-- Allow authenticated users to upload to trade-screenshots
CREATE POLICY "Authenticated users can upload to trade-screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'trade-screenshots' 
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files in trade-screenshots"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'trade-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);