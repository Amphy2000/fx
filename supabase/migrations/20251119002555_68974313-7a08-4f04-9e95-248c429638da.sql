-- Check and fix push_subscriptions RLS policies
-- First, let's see if INSERT policy exists
DO $$
BEGIN
  -- Drop existing INSERT policy if it exists
  DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.push_subscriptions;
  
  -- Create INSERT policy
  CREATE POLICY "Users can insert their own subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
  
  -- Ensure SELECT policy exists for the function to check existing subscriptions
  DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
  
  CREATE POLICY "Users can view their own subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);
END $$;