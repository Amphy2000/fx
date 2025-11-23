-- Update the create_test_partner_for_user function to use extensions schema
CREATE OR REPLACE FUNCTION public.create_test_partner_for_user(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_test_partner_id UUID;
  v_test_email TEXT;
BEGIN
  -- Generate unique email for test partner
  v_test_email := 'test.partner.' || substring(p_user_id::text from 1 for 8) || '@example.com';
  
  -- Create test auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_super_admin,
    raw_app_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    v_test_email,
    crypt('testpassword123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"full_name": "Test Partner"}'::jsonb,
    false,
    '{"provider": "email", "providers": ["email"]}'::jsonb
  )
  RETURNING id INTO v_test_partner_id;
  
  -- Create profile for test partner
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    subscription_tier,
    subscription_status,
    ai_credits
  ) VALUES (
    v_test_partner_id,
    v_test_email,
    'Test Partner',
    'free',
    'active',
    50
  );
  
  -- Create accountability profile for test partner
  INSERT INTO public.accountability_profiles (
    user_id,
    bio,
    experience_level,
    goals,
    trading_style,
    is_seeking_partner
  ) VALUES (
    v_test_partner_id,
    'Test partner for development and testing',
    'intermediate',
    ARRAY['consistency', 'risk management', 'emotional control'],
    ARRAY['day trading', 'swing trading'],
    false
  );
  
  -- Create active partnership
  INSERT INTO public.accountability_partnerships (
    user_id,
    partner_id,
    initiated_by,
    status,
    accepted_at,
    request_message
  ) VALUES (
    p_user_id,
    v_test_partner_id,
    p_user_id,
    'active',
    now(),
    'Test partnership for development'
  );
  
  RETURN v_test_partner_id;
END;
$function$;