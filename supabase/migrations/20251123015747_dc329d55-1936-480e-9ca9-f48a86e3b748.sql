-- Create partner messages table
CREATE TABLE IF NOT EXISTS partner_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES accountability_partnerships(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'voice', 'encouragement'
  content TEXT,
  voice_url TEXT,
  voice_duration INTEGER,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create goal comments table
CREATE TABLE IF NOT EXISTS goal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES partner_goals(id) ON DELETE CASCADE,
  check_in_id UUID REFERENCES goal_check_ins(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES goal_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES partner_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL, -- 'heart', 'fire', 'thumbs_up', 'celebrate'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, reaction_type)
);

-- Create typing indicators table (temporary state)
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES accountability_partnerships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(partnership_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_partner_messages_partnership ON partner_messages(partnership_id);
CREATE INDEX IF NOT EXISTS idx_partner_messages_sender ON partner_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_partner_messages_created ON partner_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goal_comments_goal ON goal_comments(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_comments_checkin ON goal_comments(check_in_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_partnership ON typing_indicators(partnership_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE partner_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE goal_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;

-- RLS Policies for partner_messages
ALTER TABLE partner_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their messages"
  ON partner_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accountability_partnerships
      WHERE id = partner_messages.partnership_id
      AND (user_id = auth.uid() OR partner_id = auth.uid())
      AND status = 'active'
    )
  );

CREATE POLICY "Partners can send messages"
  ON partner_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM accountability_partnerships
      WHERE id = partner_messages.partnership_id
      AND (user_id = auth.uid() OR partner_id = auth.uid())
      AND status = 'active'
    )
  );

CREATE POLICY "Users can update their own messages"
  ON partner_messages FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
  ON partner_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- RLS Policies for goal_comments
ALTER TABLE goal_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view comments"
  ON goal_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partner_goals
      JOIN accountability_partnerships ON partner_goals.partnership_id = accountability_partnerships.id
      WHERE partner_goals.id = goal_comments.goal_id
      AND (accountability_partnerships.user_id = auth.uid() OR accountability_partnerships.partner_id = auth.uid())
      AND accountability_partnerships.status = 'active'
    )
  );

CREATE POLICY "Partners can create comments"
  ON goal_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM partner_goals
      JOIN accountability_partnerships ON partner_goals.partnership_id = accountability_partnerships.id
      WHERE partner_goals.id = goal_comments.goal_id
      AND (accountability_partnerships.user_id = auth.uid() OR accountability_partnerships.partner_id = auth.uid())
      AND accountability_partnerships.status = 'active'
    )
  );

CREATE POLICY "Users can update their own comments"
  ON goal_comments FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments"
  ON goal_comments FOR DELETE
  USING (auth.uid() = author_id);

-- RLS Policies for message_reactions
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view reactions"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partner_messages
      JOIN accountability_partnerships ON partner_messages.partnership_id = accountability_partnerships.id
      WHERE partner_messages.id = message_reactions.message_id
      AND (accountability_partnerships.user_id = auth.uid() OR accountability_partnerships.partner_id = auth.uid())
    )
  );

CREATE POLICY "Users can add reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their reactions"
  ON message_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for typing_indicators
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view typing status"
  ON typing_indicators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accountability_partnerships
      WHERE id = typing_indicators.partnership_id
      AND (user_id = auth.uid() OR partner_id = auth.uid())
      AND status = 'active'
    )
  );

CREATE POLICY "Users can update their typing status"
  ON typing_indicators FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to clean old typing indicators
CREATE OR REPLACE FUNCTION clean_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE updated_at < NOW() - INTERVAL '30 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;