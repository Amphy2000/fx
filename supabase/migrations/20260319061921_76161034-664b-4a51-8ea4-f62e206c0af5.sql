
ALTER TABLE public.mt5_accounts 
ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS equity numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS start_of_day_balance numeric DEFAULT 0;
