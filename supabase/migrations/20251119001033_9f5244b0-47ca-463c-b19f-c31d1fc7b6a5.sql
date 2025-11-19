-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.notification_campaigns;

-- Create separate policies for better control
CREATE POLICY "Admins can view campaigns"
ON public.notification_campaigns
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert campaigns"
ON public.notification_campaigns
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update campaigns"
ON public.notification_campaigns
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete campaigns"
ON public.notification_campaigns
FOR DELETE
USING (has_role(auth.uid(), 'admin'));