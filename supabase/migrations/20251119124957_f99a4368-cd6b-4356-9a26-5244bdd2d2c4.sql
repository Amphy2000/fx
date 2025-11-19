-- Add OneSignal player ID column to push_subscriptions table
ALTER TABLE push_subscriptions
ADD COLUMN onesignal_player_id TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX idx_push_subscriptions_onesignal_player_id 
ON push_subscriptions(onesignal_player_id) 
WHERE onesignal_player_id IS NOT NULL;

-- Update the table comment
COMMENT ON COLUMN push_subscriptions.onesignal_player_id IS 'OneSignal player/subscription ID for push notifications';