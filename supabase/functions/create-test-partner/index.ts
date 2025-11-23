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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    console.log('Creating test partner for user:', user.id);

    // Check if test partner already exists
    const { data: existingPartnership } = await supabaseAdmin
      .from('accountability_partnerships')
      .select('id, partner_id')
      .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (existingPartnership) {
      return new Response(
        JSON.stringify({ error: 'Active partnership already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Generate truly unique email with UUID to avoid duplicates
    const uniqueId = crypto.randomUUID();
    const testEmail = `test.partner.${uniqueId.substring(0, 8)}@example.com`;
    
    console.log('Attempting to create test user with email:', testEmail);

    // Clean up any existing test users with similar email pattern for this user
    const oldTestEmail = `test.partner.${user.id.substring(0, 8)}@example.com`;
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    
    if (existingUsers?.users) {
      const oldTestUser = existingUsers.users.find(u => u.email === oldTestEmail);
      if (oldTestUser) {
        console.log('Deleting old test user and associated data:', oldTestUser.id);
        
        // Delete profile first (this will cascade delete other data)
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', oldTestUser.id);
        
        // Then delete auth user
        await supabaseAdmin.auth.admin.deleteUser(oldTestUser.id);
      }
    }

    // Create test auth user using admin API with metadata to bypass duplicate checks
    const { data: testUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Partner',
        signup_ip: 'test_partner',
        signup_fingerprint: `test_${uniqueId}`,
      },
    });

    if (createUserError) {
      console.error('Error creating test user:', createUserError);
      throw createUserError;
    }

    console.log('Test user created:', testUser.user.id);

    // Create profile for test partner
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: testUser.user.id,
        email: testEmail,
        full_name: 'Test Partner',
        subscription_tier: 'free',
        subscription_status: 'active',
        ai_credits: 50,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw profileError;
    }

    // Create accountability profile for test partner
    const { error: accProfileError } = await supabaseAdmin
      .from('accountability_profiles')
      .insert({
        user_id: testUser.user.id,
        bio: 'Test partner for development and testing',
        experience_level: 'intermediate',
        goals: ['consistency', 'risk management', 'emotional control'],
        trading_style: ['day trading', 'swing trading'],
        is_seeking_partner: false,
      });

    if (accProfileError) {
      console.error('Error creating accountability profile:', accProfileError);
      throw accProfileError;
    }

    // Create active partnership
    const { error: partnershipError } = await supabaseAdmin
      .from('accountability_partnerships')
      .insert({
        user_id: user.id,
        partner_id: testUser.user.id,
        initiated_by: user.id,
        status: 'active',
        accepted_at: new Date().toISOString(),
        request_message: 'Test partnership for development',
      });

    if (partnershipError) {
      console.error('Error creating partnership:', partnershipError);
      throw partnershipError;
    }

    console.log('Test partnership created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        partnerId: testUser.user.id,
        message: 'Test partner created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-test-partner:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
