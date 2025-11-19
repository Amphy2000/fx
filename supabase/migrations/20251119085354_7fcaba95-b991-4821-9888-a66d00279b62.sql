-- Create function to increment campaign stats
CREATE OR REPLACE FUNCTION public.increment_campaign_stat(
  campaign_id UUID,
  stat_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF stat_name = 'opened_count' THEN
    UPDATE email_campaigns SET opened_count = opened_count + 1, delivered_count = delivered_count + 1 WHERE id = campaign_id;
  ELSIF stat_name = 'clicked_count' THEN
    UPDATE email_campaigns SET clicked_count = clicked_count + 1 WHERE id = campaign_id;
  ELSIF stat_name = 'bounced_count' THEN
    UPDATE email_campaigns SET bounced_count = bounced_count + 1 WHERE id = campaign_id;
  END IF;
END;
$$;