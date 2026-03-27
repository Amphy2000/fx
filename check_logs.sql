SELECT status, prompt_text, response_text, created_at 
FROM public.ai_request_logs 
ORDER BY created_at DESC 
LIMIT 10;
