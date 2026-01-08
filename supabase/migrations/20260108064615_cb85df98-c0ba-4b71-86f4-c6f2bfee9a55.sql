-- Create AI response cache table for reducing API calls
CREATE TABLE public.ai_response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '1 hour'
);

-- Enable RLS
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role can manage cache"
ON public.ai_response_cache
FOR ALL
USING (true)
WITH CHECK (true);

-- Create AI request queue for rate limit handling
CREATE TABLE public.ai_request_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  retry_count int DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.ai_request_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own queue items
CREATE POLICY "Users can view own queue items"
ON public.ai_request_queue
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage all queue items
CREATE POLICY "Service role can manage queue"
ON public.ai_request_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster cache lookups
CREATE INDEX idx_ai_cache_key ON public.ai_response_cache(cache_key);
CREATE INDEX idx_ai_cache_expires ON public.ai_response_cache(expires_at);

-- Create index for queue processing
CREATE INDEX idx_ai_queue_status ON public.ai_request_queue(status, created_at);
CREATE INDEX idx_ai_queue_user ON public.ai_request_queue(user_id);

-- Add daily AI usage tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS daily_ai_requests int DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_ai_reset_date date DEFAULT CURRENT_DATE;

-- Function to reset daily AI requests
CREATE OR REPLACE FUNCTION public.reset_daily_ai_requests()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_ai_reset_date < CURRENT_DATE THEN
    NEW.daily_ai_requests := 0;
    NEW.last_ai_reset_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-reset daily requests
CREATE TRIGGER reset_ai_requests_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.reset_daily_ai_requests();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.clean_expired_ai_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.ai_response_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;