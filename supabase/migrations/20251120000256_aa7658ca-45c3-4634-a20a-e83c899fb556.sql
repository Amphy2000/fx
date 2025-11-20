-- Create setup_ai_insights table for storing AI analysis results
CREATE TABLE IF NOT EXISTS public.setup_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setup_id UUID REFERENCES public.setups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  analysis_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  performance_grade TEXT NOT NULL CHECK (performance_grade IN ('A+', 'A', 'B', 'C', 'D', 'F')),
  health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  winning_patterns JSONB DEFAULT '{}'::jsonb,
  losing_patterns JSONB DEFAULT '{}'::jsonb,
  focus_priority TEXT NOT NULL CHECK (focus_priority IN ('high', 'medium', 'low', 'pause')),
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  raw_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.setup_ai_insights ENABLE ROW LEVEL SECURITY;

-- Users can view their own insights
CREATE POLICY "Users can view their own setup insights"
  ON public.setup_ai_insights
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own insights
CREATE POLICY "Users can insert their own setup insights"
  ON public.setup_ai_insights
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own insights
CREATE POLICY "Users can delete their own setup insights"
  ON public.setup_ai_insights
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_setup_ai_insights_user_id ON public.setup_ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_setup_ai_insights_setup_id ON public.setup_ai_insights(setup_id);