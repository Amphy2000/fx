-- Create targets table
CREATE TABLE public.targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN ('weekly', 'monthly', 'annual')),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own targets" 
ON public.targets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own targets" 
ON public.targets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own targets" 
ON public.targets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own targets" 
ON public.targets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_targets_updated_at
BEFORE UPDATE ON public.targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();