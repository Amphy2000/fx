-- Add unique constraint to prevent duplicate subscriptions per user+endpoint
ALTER TABLE push_subscriptions 
DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_endpoint_key;

ALTER TABLE push_subscriptions 
ADD CONSTRAINT push_subscriptions_user_id_endpoint_key 
UNIQUE (user_id, endpoint);

-- Add retry counter for failed notifications
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;

-- Clean up duplicate subscriptions, keeping the most recent one
WITH ranked_subs AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, endpoint ORDER BY created_at DESC) as rn
  FROM push_subscriptions
)
DELETE FROM push_subscriptions 
WHERE id IN (SELECT id FROM ranked_subs WHERE rn > 1);

-- Reactivate subscriptions with few failed attempts
UPDATE push_subscriptions 
SET is_active = true, failed_attempts = 0
WHERE failed_attempts < 3;