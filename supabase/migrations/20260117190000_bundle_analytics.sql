-- Create bundle analytics table
CREATE TABLE IF NOT EXISTS public.bundle_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'page_view', 'claim_click', 'payment_init', 'payment_success'
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT, -- For tracking anonymous users
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bundle_analytics_event_type ON public.bundle_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_bundle_analytics_created_at ON public.bundle_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bundle_analytics_session_id ON public.bundle_analytics(session_id);

-- Enable RLS
ALTER TABLE public.bundle_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (for tracking)
CREATE POLICY "Anyone can insert analytics" ON public.bundle_analytics
    FOR INSERT WITH CHECK (true);

-- Policy: Only admins can read
CREATE POLICY "Admins can read analytics" ON public.bundle_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Create a view for easy analytics querying
CREATE OR REPLACE VIEW public.bundle_analytics_summary AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
    COUNT(*) FILTER (WHERE event_type = 'claim_click') as claim_clicks,
    COUNT(*) FILTER (WHERE event_type = 'payment_init') as payment_inits,
    COUNT(*) FILTER (WHERE event_type = 'payment_success') as payment_successes,
    ROUND(
        (COUNT(*) FILTER (WHERE event_type = 'payment_success')::NUMERIC / 
         NULLIF(COUNT(*) FILTER (WHERE event_type = 'page_view'), 0) * 100), 
        2
    ) as conversion_rate
FROM public.bundle_analytics
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Grant access to the view
GRANT SELECT ON public.bundle_analytics_summary TO authenticated;
