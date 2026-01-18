-- Create bundle analytics table
CREATE TABLE public.bundle_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'page_view', 'button_click', 'payment_initiated', 'payment_success'
  user_id UUID,
  session_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.bundle_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert analytics events (for anonymous tracking)
CREATE POLICY "Anyone can insert analytics events"
ON public.bundle_analytics
FOR INSERT
WITH CHECK (true);

-- Allow authenticated users with admin subscription tier to view
CREATE POLICY "Admins can view all analytics"
ON public.bundle_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.subscription_tier = 'admin'
  )
);

-- Create indexes for faster queries
CREATE INDEX idx_bundle_analytics_event_type ON public.bundle_analytics(event_type);
CREATE INDEX idx_bundle_analytics_created_at ON public.bundle_analytics(created_at DESC);