-- Add hidden_for column to partner_messages and group_messages for clear chat feature
ALTER TABLE public.partner_messages 
ADD COLUMN IF NOT EXISTS hidden_for UUID[];

ALTER TABLE public.group_messages 
ADD COLUMN IF NOT EXISTS hidden_for UUID[];

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partner_messages_hidden_for ON public.partner_messages USING GIN(hidden_for);
CREATE INDEX IF NOT EXISTS idx_group_messages_hidden_for ON public.group_messages USING GIN(hidden_for);