-- Add trade validation preferences to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trade_validation_mode text DEFAULT 'manual' CHECK (trade_validation_mode IN ('manual', 'auto', 'required')),
ADD COLUMN IF NOT EXISTS validation_min_credits_threshold integer DEFAULT 5;