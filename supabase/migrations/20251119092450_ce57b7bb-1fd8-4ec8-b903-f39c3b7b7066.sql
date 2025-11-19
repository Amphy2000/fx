-- Create A/B test variants table
CREATE TABLE IF NOT EXISTS public.email_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  test_type TEXT NOT NULL, -- 'subject_line', 'content', 'send_time'
  winner_variant_id UUID,
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'cancelled'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create A/B test variants table
CREATE TABLE IF NOT EXISTS public.email_ab_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID NOT NULL REFERENCES public.email_ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'Variant A', 'Variant B', etc.
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  subject_line TEXT,
  send_time TIME, -- For send time tests
  traffic_percentage INTEGER DEFAULT 50, -- Percentage of traffic to send to this variant
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Track which variant each user received
CREATE TABLE IF NOT EXISTS public.email_ab_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID NOT NULL REFERENCES public.email_ab_tests(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.email_ab_variants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email_send_id UUID REFERENCES public.email_sends(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_ab_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_ab_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage A/B tests"
  ON public.email_ab_tests
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage A/B variants"
  ON public.email_ab_variants
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view A/B assignments"
  ON public.email_ab_assignments
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert A/B assignments"
  ON public.email_ab_assignments
  FOR INSERT
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_email_ab_tests_campaign_id ON public.email_ab_tests(campaign_id);
CREATE INDEX idx_email_ab_tests_status ON public.email_ab_tests(status);
CREATE INDEX idx_email_ab_variants_ab_test_id ON public.email_ab_variants(ab_test_id);
CREATE INDEX idx_email_ab_assignments_ab_test_id ON public.email_ab_assignments(ab_test_id);
CREATE INDEX idx_email_ab_assignments_user_id ON public.email_ab_assignments(user_id);
CREATE INDEX idx_email_ab_assignments_variant_id ON public.email_ab_assignments(variant_id);

-- Function to update variant stats
CREATE OR REPLACE FUNCTION public.increment_variant_stat(
  variant_id UUID,
  stat_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF stat_name = 'sent_count' THEN
    UPDATE email_ab_variants SET sent_count = sent_count + 1 WHERE id = variant_id;
  ELSIF stat_name = 'delivered_count' THEN
    UPDATE email_ab_variants SET delivered_count = delivered_count + 1 WHERE id = variant_id;
  ELSIF stat_name = 'opened_count' THEN
    UPDATE email_ab_variants SET opened_count = opened_count + 1 WHERE id = variant_id;
  ELSIF stat_name = 'clicked_count' THEN
    UPDATE email_ab_variants SET clicked_count = clicked_count + 1 WHERE id = variant_id;
  ELSIF stat_name = 'conversion_count' THEN
    UPDATE email_ab_variants SET conversion_count = conversion_count + 1 WHERE id = variant_id;
  END IF;
END;
$$;

-- Add A/B test columns to email_campaigns table
ALTER TABLE public.email_campaigns 
ADD COLUMN IF NOT EXISTS ab_test_id UUID REFERENCES public.email_ab_tests(id) ON DELETE SET NULL;

-- Add variant_id to email_sends table
ALTER TABLE public.email_sends
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.email_ab_variants(id) ON DELETE SET NULL;