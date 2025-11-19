-- Add list_id to email_campaigns table
ALTER TABLE email_campaigns
ADD COLUMN list_id uuid REFERENCES email_lists(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_email_campaigns_list_id ON email_campaigns(list_id);