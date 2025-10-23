-- Fix function search paths for security
DROP FUNCTION IF EXISTS public.update_trade_count CASCADE;

CREATE OR REPLACE FUNCTION public.update_trade_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET trades_count = trades_count + 1
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET trades_count = trades_count - 1
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
CREATE TRIGGER update_profile_trade_count
  AFTER INSERT OR DELETE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trade_count();