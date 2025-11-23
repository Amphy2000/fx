-- Add missing SELECT and INSERT RLS policies for partner_goals table

-- Allow users to view goals in their active partnerships
CREATE POLICY "Users can view partner goals in their partnerships"
ON partner_goals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM accountability_partnerships
    WHERE accountability_partnerships.id = partner_goals.partnership_id
    AND (
      accountability_partnerships.user_id = auth.uid()
      OR accountability_partnerships.partner_id = auth.uid()
    )
    AND accountability_partnerships.status = 'active'
  )
);

-- Allow users to create goals in their active partnerships
CREATE POLICY "Users can create partner goals"
ON partner_goals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM accountability_partnerships
    WHERE accountability_partnerships.id = partner_goals.partnership_id
    AND (
      accountability_partnerships.user_id = auth.uid()
      OR accountability_partnerships.partner_id = auth.uid()
    )
    AND accountability_partnerships.status = 'active'
  )
);