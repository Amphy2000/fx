-- Create daily check-ins table
CREATE TABLE public.daily_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood TEXT NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 1 AND confidence <= 10),
  stress INTEGER NOT NULL CHECK (stress >= 1 AND stress <= 10),
  sleep_hours NUMERIC(3,1) NOT NULL,
  focus_level INTEGER NOT NULL CHECK (focus_level >= 1 AND focus_level <= 10),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, check_in_date)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own check-ins"
  ON public.daily_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own check-ins"
  ON public.daily_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own check-ins"
  ON public.daily_checkins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own check-ins"
  ON public.daily_checkins FOR DELETE
  USING (auth.uid() = user_id);

-- Create setups table
CREATE TABLE public.setups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own setups"
  ON public.setups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own setups"
  ON public.setups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own setups"
  ON public.setups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own setups"
  ON public.setups FOR DELETE
  USING (auth.uid() = user_id);

-- Add setup_id to trades table
ALTER TABLE public.trades ADD COLUMN setup_id UUID REFERENCES public.setups(id) ON DELETE SET NULL;

-- Create routine entries table
CREATE TABLE public.routine_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  market_bias TEXT,
  key_levels JSONB DEFAULT '[]',
  trading_rules_checked BOOLEAN DEFAULT false,
  pre_session_ready BOOLEAN DEFAULT false,
  session_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

ALTER TABLE public.routine_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own routine entries"
  ON public.routine_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routine entries"
  ON public.routine_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routine entries"
  ON public.routine_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routine entries"
  ON public.routine_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Create streaks table
CREATE TABLE public.streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL,
  current_count INTEGER NOT NULL DEFAULT 0,
  best_count INTEGER NOT NULL DEFAULT 0,
  last_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, streak_type)
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streaks"
  ON public.streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
  ON public.streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
  ON public.streaks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streaks"
  ON public.streaks FOR DELETE
  USING (auth.uid() = user_id);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_type, achievement_name)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
  ON public.achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_daily_checkins_updated_at
  BEFORE UPDATE ON public.daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_setups_updated_at
  BEFORE UPDATE ON public.setups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_routine_entries_updated_at
  BEFORE UPDATE ON public.routine_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();