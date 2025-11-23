-- Create group messages table for group chat functionality
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.accountability_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group goals table
CREATE TABLE IF NOT EXISTS public.group_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.accountability_groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on group_messages
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_messages - members can view and send messages
CREATE POLICY "Group members can view group messages" 
ON public.group_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_memberships.group_id = group_messages.group_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.status = 'active'
  )
);

CREATE POLICY "Group members can send messages" 
ON public.group_messages 
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_memberships.group_id = group_messages.group_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.status = 'active'
  )
);

CREATE POLICY "Users can delete their own messages" 
ON public.group_messages 
FOR DELETE 
USING (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages" 
ON public.group_messages 
FOR UPDATE 
USING (sender_id = auth.uid());

-- Enable RLS on group_goals
ALTER TABLE public.group_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_goals - members can view and create goals
CREATE POLICY "Group members can view group goals" 
ON public.group_goals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_memberships.group_id = group_goals.group_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.status = 'active'
  )
);

CREATE POLICY "Group members can create goals" 
ON public.group_goals 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_memberships.group_id = group_goals.group_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.status = 'active'
  )
);

CREATE POLICY "Goal creators can update their goals" 
ON public.group_goals 
FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Goal creators can delete their goals" 
ON public.group_goals 
FOR DELETE 
USING (created_by = auth.uid());

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- Create indexes for better performance
CREATE INDEX idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX idx_group_messages_sender_id ON public.group_messages(sender_id);
CREATE INDEX idx_group_goals_group_id ON public.group_goals(group_id);

-- Add updated_at trigger for group_messages
CREATE TRIGGER update_group_messages_updated_at
BEFORE UPDATE ON public.group_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for group_goals
CREATE TRIGGER update_group_goals_updated_at
BEFORE UPDATE ON public.group_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();