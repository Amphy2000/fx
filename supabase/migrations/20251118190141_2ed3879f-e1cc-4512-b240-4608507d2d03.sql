-- Enable realtime for mt5_accounts table
ALTER TABLE mt5_accounts REPLICA IDENTITY FULL;

-- The table will automatically be added to the supabase_realtime publication
-- No need to manually add it as it's handled by Supabase