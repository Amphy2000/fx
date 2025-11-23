-- Create affiliate system tables

-- Affiliate profiles table
CREATE TABLE IF NOT EXISTS public.affiliate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code TEXT UNIQUE NOT NULL,
  commission_rate NUMERIC(5,2) DEFAULT 30.00,
  total_referrals INTEGER DEFAULT 0,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  pending_earnings NUMERIC(10,2) DEFAULT 0,
  paid_earnings NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  tier TEXT DEFAULT 'micro' CHECK (tier IN ('micro', 'mid', 'macro')),
  application_notes TEXT,
  social_links JSONB DEFAULT '{}',
  payment_info JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id)
);

-- Affiliate referrals table
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  promo_code TEXT NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_type TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  conversion_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promo code clicks tracking
CREATE TABLE IF NOT EXISTS public.promo_code_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  promo_code TEXT NOT NULL,
  visitor_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  ip_address TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Affiliate payouts table
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payment_method TEXT,
  payment_details JSONB DEFAULT '{}',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_profiles
CREATE POLICY "Users can view their own affiliate profile"
  ON public.affiliate_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own affiliate profile"
  ON public.affiliate_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own affiliate profile"
  ON public.affiliate_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all affiliate profiles"
  ON public.affiliate_profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all affiliate profiles"
  ON public.affiliate_profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for affiliate_referrals
CREATE POLICY "Affiliates can view their own referrals"
  ON public.affiliate_referrals FOR SELECT
  USING (affiliate_id IN (SELECT id FROM public.affiliate_profiles WHERE user_id = auth.uid()));

CREATE POLICY "System can insert referrals"
  ON public.affiliate_referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all referrals"
  ON public.affiliate_referrals FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for promo_code_clicks
CREATE POLICY "Affiliates can view their own clicks"
  ON public.promo_code_clicks FOR SELECT
  USING (affiliate_id IN (SELECT id FROM public.affiliate_profiles WHERE user_id = auth.uid()));

CREATE POLICY "System can insert clicks"
  ON public.promo_code_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all clicks"
  ON public.promo_code_clicks FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for affiliate_payouts
CREATE POLICY "Affiliates can view their own payouts"
  ON public.affiliate_payouts FOR SELECT
  USING (affiliate_id IN (SELECT id FROM public.affiliate_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Affiliates can request payouts"
  ON public.affiliate_payouts FOR INSERT
  WITH CHECK (affiliate_id IN (SELECT id FROM public.affiliate_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all payouts"
  ON public.affiliate_payouts FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_affiliate_profiles_user_id ON public.affiliate_profiles(user_id);
CREATE INDEX idx_affiliate_profiles_promo_code ON public.affiliate_profiles(promo_code);
CREATE INDEX idx_affiliate_profiles_status ON public.affiliate_profiles(status);
CREATE INDEX idx_affiliate_referrals_affiliate_id ON public.affiliate_referrals(affiliate_id);
CREATE INDEX idx_affiliate_referrals_promo_code ON public.affiliate_referrals(promo_code);
CREATE INDEX idx_affiliate_referrals_status ON public.affiliate_referrals(status);
CREATE INDEX idx_promo_code_clicks_affiliate_id ON public.promo_code_clicks(affiliate_id);
CREATE INDEX idx_promo_code_clicks_promo_code ON public.promo_code_clicks(promo_code);
CREATE INDEX idx_affiliate_payouts_affiliate_id ON public.affiliate_payouts(affiliate_id);

-- Function to update affiliate stats
CREATE OR REPLACE FUNCTION update_affiliate_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.affiliate_profiles
    SET 
      total_referrals = (
        SELECT COUNT(*) 
        FROM public.affiliate_referrals 
        WHERE affiliate_id = NEW.affiliate_id
      ),
      total_earnings = (
        SELECT COALESCE(SUM(commission_amount), 0)
        FROM public.affiliate_referrals
        WHERE affiliate_id = NEW.affiliate_id AND status = 'completed'
      ),
      pending_earnings = (
        SELECT COALESCE(SUM(commission_amount), 0)
        FROM public.affiliate_referrals
        WHERE affiliate_id = NEW.affiliate_id AND status = 'pending'
      ),
      updated_at = NOW()
    WHERE id = NEW.affiliate_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update affiliate stats
CREATE TRIGGER update_affiliate_stats_trigger
AFTER INSERT OR UPDATE ON public.affiliate_referrals
FOR EACH ROW
EXECUTE FUNCTION update_affiliate_stats();

-- Function to generate unique promo code
CREATE OR REPLACE FUNCTION generate_promo_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.affiliate_profiles WHERE promo_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;