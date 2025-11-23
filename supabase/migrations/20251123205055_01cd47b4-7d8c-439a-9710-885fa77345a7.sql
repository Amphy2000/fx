-- Create only the INSERT policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'affiliate_profiles' 
    AND policyname = 'Users can create their own affiliate profile'
  ) THEN
    CREATE POLICY "Users can create their own affiliate profile"
    ON affiliate_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create only the admin UPDATE policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'affiliate_profiles' 
    AND policyname = 'Admins can update affiliate profiles'
  ) THEN
    CREATE POLICY "Admins can update affiliate profiles"
    ON affiliate_profiles
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
      )
    );
  END IF;
END $$;

-- Create only the admin DELETE policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'affiliate_profiles' 
    AND policyname = 'Admins can delete affiliate profiles'
  ) THEN
    CREATE POLICY "Admins can delete affiliate profiles"
    ON affiliate_profiles
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
      )
    );
  END IF;
END $$;