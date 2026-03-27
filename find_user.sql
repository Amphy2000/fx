SELECT profiles.id, auth.users.email, profiles.subscription_tier, profiles.ai_credits 
FROM public.profiles 
JOIN auth.users ON public.profiles.id = auth.users.id 
WHERE auth.users.email = 'amphy2000@gmail.com';
