-- Add onboarding completion flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;

-- Create a policy update to allow users to update their own onboarding status
CREATE POLICY "Users can update their own onboarding status" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);
