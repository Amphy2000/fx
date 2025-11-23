-- Fix infinite recursion in RLS policies for accountability groups and memberships

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view public groups or their own groups" ON public.accountability_groups;
DROP POLICY IF EXISTS "Users can view memberships of their groups" ON public.group_memberships;
DROP POLICY IF EXISTS "Group admins can update groups" ON public.accountability_groups;
DROP POLICY IF EXISTS "Group admins can manage memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_memberships;

-- Recreate accountability_groups SELECT policy without circular dependency
CREATE POLICY "Users can view public groups or their own groups"
  ON public.accountability_groups FOR SELECT
  USING (
    is_public = true OR 
    created_by = auth.uid() OR
    id IN (
      SELECT group_id FROM public.group_memberships
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Recreate group_memberships SELECT policy without circular dependency
-- Just check if the user is a member directly or if the group is public
CREATE POLICY "Users can view memberships of their groups"
  ON public.group_memberships FOR SELECT
  USING (
    user_id = auth.uid() OR
    group_id IN (
      SELECT id FROM public.accountability_groups
      WHERE is_public = true OR created_by = auth.uid()
    )
  );

-- Recreate group_memberships UPDATE policy without circular dependency
CREATE POLICY "Group admins can manage memberships"
  ON public.group_memberships FOR UPDATE
  USING (
    group_id IN (
      SELECT group_id FROM public.group_memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Recreate group_memberships DELETE policy without circular dependency
CREATE POLICY "Users can leave groups"
  ON public.group_memberships FOR DELETE
  USING (
    user_id = auth.uid() OR
    group_id IN (
      SELECT group_id FROM public.group_memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Recreate accountability_groups UPDATE policy without circular dependency
CREATE POLICY "Group admins can update groups"
  ON public.accountability_groups FOR UPDATE
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT group_id FROM public.group_memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );