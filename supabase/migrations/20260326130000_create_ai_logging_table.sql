-- Create ai_request_logs table for caching and monitoring AI usage
CREATE TABLE IF NOT EXISTS public.ai_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL, -- 'text_analysis', 'vision_analysis', etc.
    request_hash TEXT, -- For caching responses
    prompt_text TEXT,
    response_text TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage everything (needed for Edge Functions)
CREATE POLICY "Admins/Service Role can manage AI logs"
  ON public.ai_request_logs
  FOR ALL
  USING (true);

-- Allow users to view their own logs if needed (optional)
CREATE POLICY "Users can view their own AI logs"
  ON public.ai_request_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index on request_hash for faster cache lookups
CREATE INDEX IF NOT EXISTS idx_ai_request_logs_request_hash ON public.ai_request_logs(request_hash);
CREATE INDEX IF NOT EXISTS idx_ai_request_logs_user_id ON public.ai_request_logs(user_id);
