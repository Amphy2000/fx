-- Make trade-screenshots bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'trade-screenshots';