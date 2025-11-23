-- Create accountability groups table for multi-person accountability
CREATE TABLE IF NOT EXISTS public.accountability_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_members INTEGER DEFAULT 5,
  is_public BOOLEAN DEFAULT false,
  group_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create group memberships table
CREATE TABLE IF NOT EXISTS public.group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.accountability_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  UNIQUE(group_id, user_id)
);

-- Create accountability challenges table
CREATE TABLE IF NOT EXISTS public.accountability_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('streak', 'win_rate', 'profit_target', 'consistency', 'custom')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  goal_criteria JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  prize_description TEXT,
  max_participants INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create challenge participants table
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.accountability_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.accountability_groups(id) ON DELETE CASCADE,
  current_progress JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'withdrawn')),
  rank INTEGER,
  joined_at TIMESTAMPTZ DEFAULT now(),
  CHECK (user_id IS NOT NULL OR group_id IS NOT NULL),
  UNIQUE(challenge_id, user_id),
  UNIQUE(challenge_id, group_id)
);

-- Create partnership analytics table for leaderboards
CREATE TABLE IF NOT EXISTS public.partnership_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID REFERENCES public.accountability_partnerships(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.accountability_groups(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  combined_win_rate NUMERIC,
  combined_profit_factor NUMERIC,
  total_goals_completed INTEGER DEFAULT 0,
  total_goals_set INTEGER DEFAULT 0,
  completion_rate NUMERIC,
  engagement_score NUMERIC,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (partnership_id IS NOT NULL OR group_id IS NOT NULL)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON public.group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON public.group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON public.challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON public.challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_partnership_analytics_partnership ON public.partnership_analytics(partnership_id);
CREATE INDEX IF NOT EXISTS idx_partnership_analytics_week ON public.partnership_analytics(week_start, week_end);

-- Enable RLS
ALTER TABLE public.accountability_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accountability_groups
CREATE POLICY "Users can view public groups or their own groups"
  ON public.accountability_groups FOR SELECT
  USING (
    is_public = true OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.group_memberships
      WHERE group_memberships.group_id = accountability_groups.id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.status = 'active'
    )
  );

CREATE POLICY "Users can create groups"
  ON public.accountability_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
  ON public.accountability_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_memberships
      WHERE group_memberships.group_id = accountability_groups.id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role = 'admin'
    )
  );

CREATE POLICY "Group admins can delete groups"
  ON public.accountability_groups FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for group_memberships
CREATE POLICY "Users can view memberships of their groups"
  ON public.group_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_groups
      WHERE accountability_groups.id = group_memberships.group_id
      AND (
        accountability_groups.is_public = true OR
        EXISTS (
          SELECT 1 FROM public.group_memberships gm
          WHERE gm.group_id = accountability_groups.id
          AND gm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can join groups"
  ON public.group_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group admins can manage memberships"
  ON public.group_memberships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

CREATE POLICY "Users can leave groups"
  ON public.group_memberships FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

-- RLS Policies for accountability_challenges
CREATE POLICY "Users can view public challenges or their challenges"
  ON public.accountability_challenges FOR SELECT
  USING (
    is_public = true OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.challenge_participants
      WHERE challenge_participants.challenge_id = accountability_challenges.id
      AND challenge_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create challenges"
  ON public.accountability_challenges FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Challenge creators can update their challenges"
  ON public.accountability_challenges FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Challenge creators can delete their challenges"
  ON public.accountability_challenges FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for challenge_participants
CREATE POLICY "Users can view challenge participants"
  ON public.challenge_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_challenges
      WHERE accountability_challenges.id = challenge_participants.challenge_id
      AND (accountability_challenges.is_public = true OR accountability_challenges.created_by = auth.uid())
    ) OR
    user_id = auth.uid()
  );

CREATE POLICY "Users can join challenges"
  ON public.challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
  ON public.challenge_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can withdraw from challenges"
  ON public.challenge_participants FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for partnership_analytics
CREATE POLICY "Users can view analytics of their partnerships"
  ON public.partnership_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships
      WHERE accountability_partnerships.id = partnership_analytics.partnership_id
      AND (accountability_partnerships.user_id = auth.uid() OR accountability_partnerships.partner_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.group_memberships
      WHERE group_memberships.group_id = partnership_analytics.group_id
      AND group_memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert analytics"
  ON public.partnership_analytics FOR INSERT
  WITH CHECK (true);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_memberships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;

-- Function to update group updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_group_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.accountability_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_group_updated_at();

CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON public.accountability_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_group_updated_at();