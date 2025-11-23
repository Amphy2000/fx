-- Create partner achievements table
CREATE TABLE IF NOT EXISTS partner_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partnership_id UUID REFERENCES accountability_partnerships(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_data JSONB DEFAULT '{}',
  earned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create partner streaks table
CREATE TABLE IF NOT EXISTS partner_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partnership_id UUID NOT NULL REFERENCES accountability_partnerships(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL, -- 'check_in', 'goal_completion', 'weekly_share'
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, partnership_id, streak_type)
);

-- Create partner progress snapshots table
CREATE TABLE IF NOT EXISTS partner_progress_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partnership_id UUID NOT NULL REFERENCES accountability_partnerships(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  goals_completed INTEGER DEFAULT 0,
  goals_partial INTEGER DEFAULT 0,
  goals_missed INTEGER DEFAULT 0,
  completion_rate NUMERIC(5,2),
  streak_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, partnership_id, snapshot_date)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_partner_achievements_user ON partner_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_achievements_partnership ON partner_achievements(partnership_id);
CREATE INDEX IF NOT EXISTS idx_partner_streaks_user_partnership ON partner_streaks(user_id, partnership_id);
CREATE INDEX IF NOT EXISTS idx_partner_progress_user_partnership ON partner_progress_snapshots(user_id, partnership_id);
CREATE INDEX IF NOT EXISTS idx_partner_progress_date ON partner_progress_snapshots(snapshot_date);

-- RLS Policies
ALTER TABLE partner_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_progress_snapshots ENABLE ROW LEVEL SECURITY;

-- Partner achievements policies
CREATE POLICY "Users can view their own achievements"
  ON partner_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Partners can view each other's achievements"
  ON partner_achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accountability_partnerships
      WHERE id = partner_achievements.partnership_id
      AND (user_id = auth.uid() OR partner_id = auth.uid())
      AND status = 'active'
    )
  );

CREATE POLICY "System can insert achievements"
  ON partner_achievements FOR INSERT
  WITH CHECK (true);

-- Partner streaks policies
CREATE POLICY "Users can view their own streaks"
  ON partner_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Partners can view each other's streaks"
  ON partner_streaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accountability_partnerships
      WHERE id = partner_streaks.partnership_id
      AND (user_id = auth.uid() OR partner_id = auth.uid())
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert their own streaks"
  ON partner_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
  ON partner_streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- Partner progress snapshots policies
CREATE POLICY "Users can view their own progress"
  ON partner_progress_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Partners can view each other's progress"
  ON partner_progress_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accountability_partnerships
      WHERE id = partner_progress_snapshots.partnership_id
      AND (user_id = auth.uid() OR partner_id = auth.uid())
      AND status = 'active'
    )
  );

CREATE POLICY "System can insert progress snapshots"
  ON partner_progress_snapshots FOR INSERT
  WITH CHECK (true);

-- Function to update streak
CREATE OR REPLACE FUNCTION update_partner_streak(
  p_user_id UUID,
  p_partnership_id UUID,
  p_streak_type TEXT
) RETURNS void AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  -- Get current streak info
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM partner_streaks
  WHERE user_id = p_user_id 
    AND partnership_id = p_partnership_id 
    AND streak_type = p_streak_type;

  IF NOT FOUND THEN
    -- First activity
    INSERT INTO partner_streaks (user_id, partnership_id, streak_type, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, p_partnership_id, p_streak_type, 1, 1, CURRENT_DATE);
  ELSIF v_last_date = CURRENT_DATE THEN
    -- Same day, no change
    RETURN;
  ELSIF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day
    UPDATE partner_streaks
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_activity_date = CURRENT_DATE,
        updated_at = now()
    WHERE user_id = p_user_id 
      AND partnership_id = p_partnership_id 
      AND streak_type = p_streak_type;
  ELSE
    -- Streak broken
    UPDATE partner_streaks
    SET current_streak = 1,
        last_activity_date = CURRENT_DATE,
        updated_at = now()
    WHERE user_id = p_user_id 
      AND partnership_id = p_partnership_id 
      AND streak_type = p_streak_type;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;