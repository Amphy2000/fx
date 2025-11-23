
-- Allow users to view profiles of their accountability partners
CREATE POLICY "Users can view their partners' profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM public.accountability_partnerships
    WHERE (
      (accountability_partnerships.user_id = auth.uid() AND accountability_partnerships.partner_id = profiles.id)
      OR
      (accountability_partnerships.partner_id = auth.uid() AND accountability_partnerships.user_id = profiles.id)
    )
    AND accountability_partnerships.status = 'active'
  )
);
