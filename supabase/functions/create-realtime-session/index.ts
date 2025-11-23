import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the JWT token from the authorization header
    const authHeader = req.headers.get('authorization');
    console.log('Authorization header present:', !!authHeader);
    
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with the JWT token  
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('Supabase URL configured:', !!supabaseUrl);
    console.log('Supabase Key configured:', !!supabaseKey);
    
    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseKey ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Verify the user by getting their info from the JWT
    console.log('Attempting to verify user...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    console.log('User verification result:', { user: !!user, error: userError?.message });
    
    if (userError || !user) {
      console.error('Auth verification failed:', userError);
      throw new Error('Unauthorized: ' + (userError?.message || 'Invalid token'));
    }

    console.log('User authenticated successfully:', user.id);

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log('Creating OpenAI Realtime session for user:', user.id);

    // Request ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions: "You are an encouraging accountability partner assistant. Help traders stay motivated, provide positive reinforcement, and offer constructive feedback on their trading goals. Be supportive, friendly, and concise in your responses."
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Session created successfully');

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});