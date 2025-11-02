-- Create trade_screenshots table for storing trade screenshot metadata
CREATE TABLE IF NOT EXISTS public.trade_screenshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trade_screenshots ENABLE ROW LEVEL SECURITY;

-- Create policies for trade screenshots
CREATE POLICY "Users can view their own trade screenshots"
ON public.trade_screenshots
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own trade screenshots"
ON public.trade_screenshots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trade screenshots"
ON public.trade_screenshots
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_trade_screenshots_trade_id ON public.trade_screenshots(trade_id);
CREATE INDEX idx_trade_screenshots_user_id ON public.trade_screenshots(user_id);