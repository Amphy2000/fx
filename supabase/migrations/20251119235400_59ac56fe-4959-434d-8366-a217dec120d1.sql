-- Remove DELETE policy for achievements - achievements should be preserved
DROP POLICY IF EXISTS "Users can delete their own achievements" ON public.achievements;