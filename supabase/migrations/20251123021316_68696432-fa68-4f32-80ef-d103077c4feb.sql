-- Create coaches table for coaching marketplace
CREATE TABLE IF NOT EXISTS public.coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bio TEXT NOT NULL,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  hourly_rate NUMERIC(10,2) NOT NULL,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  availability JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create coaching sessions table
CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  amount_paid NUMERIC(10,2) NOT NULL,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  session_notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create group premium subscriptions table
CREATE TABLE IF NOT EXISTS public.group_premium_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.accountability_groups(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'elite')),
  amount_paid NUMERIC(10,2),
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id)
);

-- Enable RLS
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_premium_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coaches table
CREATE POLICY "Coaches are viewable by everyone"
  ON public.coaches FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own coach profile"
  ON public.coaches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coach profile"
  ON public.coaches FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for coaching_sessions table
CREATE POLICY "Users can view their own coaching sessions"
  ON public.coaching_sessions FOR SELECT
  USING (
    auth.uid() = client_id OR 
    auth.uid() IN (SELECT user_id FROM coaches WHERE id = coach_id)
  );

CREATE POLICY "Users can create coaching sessions"
  ON public.coaching_sessions FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Coaches and clients can update their sessions"
  ON public.coaching_sessions FOR UPDATE
  USING (
    auth.uid() = client_id OR 
    auth.uid() IN (SELECT user_id FROM coaches WHERE id = coach_id)
  );

-- RLS Policies for group_premium_subscriptions table
CREATE POLICY "Group members can view group subscription"
  ON public.group_premium_subscriptions FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group creators can manage group subscription"
  ON public.group_premium_subscriptions FOR ALL
  USING (
    group_id IN (
      SELECT id FROM accountability_groups WHERE created_by = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coaches_user_id ON public.coaches(user_id);
CREATE INDEX IF NOT EXISTS idx_coaches_is_active ON public.coaches(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_coach_id ON public.coaching_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_client_id ON public.coaching_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_group_premium_subscriptions_group_id ON public.group_premium_subscriptions(group_id);

-- Create trigger for updated_at
CREATE TRIGGER update_coaches_updated_at
  BEFORE UPDATE ON public.coaches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaching_sessions_updated_at
  BEFORE UPDATE ON public.coaching_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_premium_subscriptions_updated_at
  BEFORE UPDATE ON public.group_premium_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();