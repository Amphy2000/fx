-- Update RLS policies to allow admins to read subscriptions for stats
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'push_subscriptions' 
    AND policyname = 'Admins can view all subscriptions'
  ) THEN
    CREATE POLICY "Admins can view all subscriptions"
    ON push_subscriptions
    FOR SELECT
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'push_subscriptions' 
    AND policyname = 'Admins can update subscriptions'
  ) THEN
    CREATE POLICY "Admins can update subscriptions"
    ON push_subscriptions
    FOR UPDATE
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
