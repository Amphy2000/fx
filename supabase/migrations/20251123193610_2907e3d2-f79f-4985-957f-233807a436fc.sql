-- Fix security warnings: Add search_path to functions

CREATE OR REPLACE FUNCTION update_affiliate_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION generate_promo_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;