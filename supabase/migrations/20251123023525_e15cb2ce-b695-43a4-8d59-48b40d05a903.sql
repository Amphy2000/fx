-- Create security definer functions to avoid circular policy dependencies

-- Function to check if user is a group member without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_group_member(p_user_id uuid, p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_memberships
    WHERE user_id = p_user_id
      AND group_id = p_group_id
      AND status = 'active'
  );
$$;

-- Function to check if user is a group admin without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_group_admin(p_user_id uuid, p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_memberships
    WHERE user_id = p_user_id
      AND group_id = p_group_id
      AND role = 'admin'
  );
$$;

-- Function to check if group is public or user is creator
CREATE OR REPLACE FUNCTION public.can_view_group(p_user_id uuid, p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM accountability_groups
    WHERE id = p_group_id
      AND (is_public = true OR created_by = p_user_id)
  );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view public groups or their own groups" ON public.accountability_groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON public.accountability_groups;
DROP POLICY IF EXISTS "Users can view memberships of their groups" ON public.group_memberships;
DROP POLICY IF EXISTS "Group admins can manage memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_memberships;

-- Recreate accountability_groups policies using security definer functions
CREATE POLICY "Users can view public groups or their own groups"
  ON public.accountability_groups FOR SELECT
  USING (
    is_public = true OR 
    created_by = auth.uid() OR
    public.is_group_member(auth.uid(), id)
  );

CREATE POLICY "Group admins can update groups"
  ON public.accountability_groups FOR UPDATE
  USING (
    created_by = auth.uid() OR
    public.is_group_admin(auth.uid(), id)
  );

-- Recreate group_memberships policies using security definer functions
CREATE POLICY "Users can view memberships of their groups"
  ON public.group_memberships FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.can_view_group(auth.uid(), group_id)
  );

CREATE POLICY "Group admins can manage memberships"
  ON public.group_memberships FOR UPDATE
  USING (
    public.is_group_admin(auth.uid(), group_id)
  );

CREATE POLICY "Users can leave groups"
  ON public.group_memberships FOR DELETE
  USING (
    user_id = auth.uid() OR
    public.is_group_admin(auth.uid(), group_id)
  );