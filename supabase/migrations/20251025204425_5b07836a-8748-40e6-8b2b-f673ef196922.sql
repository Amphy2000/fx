-- Make trade-screenshots bucket private to prevent unauthorized access
UPDATE storage.buckets 
SET public = false 
WHERE id = 'trade-screenshots';