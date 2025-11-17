-- Update handle_new_user to set free tier defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    subscription_tier,
    subscription_status,
    ai_credits,
    monthly_trade_limit,
    credits_reset_date
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'free',
    'active',
    50,
    10,
    NOW() + INTERVAL '30 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;