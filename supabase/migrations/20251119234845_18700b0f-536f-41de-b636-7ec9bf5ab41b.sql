-- Add DELETE policy for achievements table so users can delete their own achievements
CREATE POLICY "Users can delete their own achievements"
ON public.achievements
FOR DELETE
USING (auth.uid() = user_id);