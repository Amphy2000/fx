-- Fix push_subscriptions RLS policy for UPDATE operations
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can update their own subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);