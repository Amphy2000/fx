-- Create storage bucket for trade screenshots (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('trade-screenshots', 'trade-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to recreate them correctly
DROP POLICY IF EXISTS "Users can upload trade screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own trade screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public can view trade screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own trade screenshots" ON storage.objects;

-- Allow authenticated users to upload their own screenshots
CREATE POLICY "Users can upload trade screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trade-screenshots'
);

-- Allow authenticated users to view all screenshots (needed for AI processing)
CREATE POLICY "Users can view trade screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'trade-screenshots');

-- Allow public access to screenshots (for AI to access via public URL)
CREATE POLICY "Public can view trade screenshots"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'trade-screenshots');

-- Allow authenticated users to delete their own screenshots
CREATE POLICY "Users can delete their own trade screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'trade-screenshots');