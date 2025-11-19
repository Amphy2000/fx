-- Fix security issue: Set search_path for the delete function
DROP FUNCTION IF EXISTS delete_all_user_data(UUID);

CREATE OR REPLACE FUNCTION delete_all_user_data(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete dependent records first
  DELETE FROM trade_tags WHERE user_id = p_user_id;
  DELETE FROM trade_screenshots WHERE user_id = p_user_id;
  DELETE FROM trade_insights WHERE user_id = p_user_id;
  DELETE FROM chat_messages WHERE user_id = p_user_id;
  DELETE FROM sync_logs WHERE user_id = p_user_id;
  
  -- Delete trades in batches to avoid timeout
  LOOP
    DELETE FROM trades 
    WHERE id IN (
      SELECT id FROM trades 
      WHERE user_id = p_user_id 
      LIMIT 1000
    );
    EXIT WHEN NOT FOUND;
  END LOOP;
  
  -- Delete other main records
  DELETE FROM journal_entries WHERE user_id = p_user_id;
  DELETE FROM achievements WHERE user_id = p_user_id;
  DELETE FROM daily_checkins WHERE user_id = p_user_id;
  DELETE FROM streaks WHERE user_id = p_user_id;
  DELETE FROM mt5_accounts WHERE user_id = p_user_id;
  DELETE FROM mt5_connections WHERE user_id = p_user_id;
  DELETE FROM routine_entries WHERE user_id = p_user_id;
  DELETE FROM targets WHERE user_id = p_user_id;
  DELETE FROM performance_metrics WHERE user_id = p_user_id;
  DELETE FROM equity_snapshots WHERE user_id = p_user_id;
  DELETE FROM setup_performance WHERE user_id = p_user_id;
  DELETE FROM chat_conversations WHERE user_id = p_user_id;
  DELETE FROM copilot_feedback WHERE user_id = p_user_id;
  DELETE FROM journal_insights WHERE user_id = p_user_id;
  DELETE FROM setups WHERE user_id = p_user_id;
  DELETE FROM leaderboard_profiles WHERE user_id = p_user_id;
  DELETE FROM subscriptions WHERE user_id = p_user_id;
  DELETE FROM feedback WHERE user_id = p_user_id;
END;
$$;