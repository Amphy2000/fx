-- Phase 2: Partner Goals and Check-ins Schema

-- Partner goals table
CREATE TABLE IF NOT EXISTS partner_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES accountability_partnerships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_text TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('daily', 'weekly', 'custom')),
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goal check-ins table
CREATE TABLE IF NOT EXISTS goal_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES partner_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'partial')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partner reactions table
CREATE TABLE IF NOT EXISTS partner_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id UUID NOT NULL REFERENCES goal_check_ins(id) ON DELETE CASCADE,
  reactor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'celebrate', 'support', 'motivate')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_partner_goals_partnership ON partner_goals(partnership_id);
CREATE INDEX IF NOT EXISTS idx_partner_goals_user ON partner_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_goals_status ON partner_goals(status);
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_goal ON goal_check_ins(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_date ON goal_check_ins(check_in_date);
CREATE INDEX IF NOT EXISTS idx_partner_reactions_checkin ON partner_reactions(check_in_id);

-- Enable RLS
ALTER TABLE partner_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_goals
CREATE POLICY "Users can view goals in their partnerships"
  ON partner_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accountability_partnerships
      WHERE id = partner_goals.partnership_id
      AND (user_id = auth.uid() OR partner_id = auth.uid())
      AND status = 'active'
    )
  );

CREATE POLICY "Users can create their own goals"
  ON partner_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON partner_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON partner_goals FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for goal_check_ins
CREATE POLICY "Users can view check-ins for their partnership goals"
  ON goal_check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partner_goals pg
      JOIN accountability_partnerships ap ON ap.id = pg.partnership_id
      WHERE pg.id = goal_check_ins.goal_id
      AND (ap.user_id = auth.uid() OR ap.partner_id = auth.uid())
      AND ap.status = 'active'
    )
  );

CREATE POLICY "Users can create their own check-ins"
  ON goal_check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own check-ins"
  ON goal_check_ins FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for partner_reactions
CREATE POLICY "Users can view reactions on partnership check-ins"
  ON partner_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goal_check_ins gci
      JOIN partner_goals pg ON pg.id = gci.goal_id
      JOIN accountability_partnerships ap ON ap.id = pg.partnership_id
      WHERE gci.id = partner_reactions.check_in_id
      AND (ap.user_id = auth.uid() OR ap.partner_id = auth.uid())
      AND ap.status = 'active'
    )
  );

CREATE POLICY "Users can create reactions on partner check-ins"
  ON partner_reactions FOR INSERT
  WITH CHECK (auth.uid() = reactor_id);

-- Trigger for updated_at on partner_goals
CREATE TRIGGER update_partner_goals_updated_at
  BEFORE UPDATE ON partner_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add notification preferences to accountability_profiles
ALTER TABLE accountability_profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "goal_reminders": true,
  "partner_check_ins": true,
  "encouragement": true
}'::jsonb;
