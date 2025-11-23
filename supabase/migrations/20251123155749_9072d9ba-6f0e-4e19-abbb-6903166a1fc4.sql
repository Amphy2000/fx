-- Add RLS policies for partner_goals table to allow users to manage their own goals

-- Enable RLS on partner_goals if not already enabled
ALTER TABLE partner_goals ENABLE ROW LEVEL SECURITY;

-- Allow users to delete their own goals
CREATE POLICY "Users can delete their own partner goals"
ON partner_goals
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own goals
CREATE POLICY "Users can update their own partner goals"
ON partner_goals
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);