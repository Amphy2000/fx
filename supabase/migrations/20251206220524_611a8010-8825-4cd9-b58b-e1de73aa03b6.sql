-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view seeking partners" ON public.accountability_profiles;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can view seeking partners"
ON public.accountability_profiles
FOR SELECT
USING (is_seeking_partner = true AND auth.uid() IS NOT NULL);