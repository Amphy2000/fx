import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { filters } = await req.json();

    console.log('Finding partners for user:', user.id, 'with filters:', filters);

    // Build query
    let query = supabaseClient
      .from('accountability_profiles')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq('is_seeking_partner', true)
      .neq('user_id', user.id);

    // Apply filters
    if (filters?.experience_level) {
      query = query.eq('experience_level', filters.experience_level);
    }
    if (filters?.trading_style && filters.trading_style.length > 0) {
      query = query.overlaps('trading_style', filters.trading_style);
    }
    if (filters?.timezone) {
      query = query.eq('timezone', filters.timezone);
    }

    const { data: profiles, error } = await query.limit(50);

    if (error) {
      console.error('Error finding partners:', error);
      throw error;
    }

    // Check existing partnerships to filter out
    const { data: existingPartnerships } = await supabaseClient
      .from('accountability_partnerships')
      .select('partner_id, user_id')
      .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`);

    const partnerIds = new Set(
      existingPartnerships?.flatMap(p => [p.user_id, p.partner_id]) || []
    );

    // Filter out existing partners
    const availableProfiles = profiles?.filter(
      p => !partnerIds.has(p.user_id)
    ) || [];

    console.log(`Found ${availableProfiles.length} available partners`);

    return new Response(
      JSON.stringify({ partners: availableProfiles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in find-accountability-partners:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
