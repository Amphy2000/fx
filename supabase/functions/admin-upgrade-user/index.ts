import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpgradeRequest {
  userId: string;
  tier: 'free' | 'monthly' | 'premium' | 'lifetime';
  expiresAt?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user');
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, tier, expiresAt }: UpgradeRequest = await req.json();

    if (!userId || !tier) {
      throw new Error('Missing required fields: userId and tier');
    }

    // Calculate credits based on tier
    const credits = tier === 'free' ? 50 : tier === 'premium' ? 500 : tier === 'lifetime' ? 999999 : 200;
    
    // Calculate expiry date (null for lifetime, 30 days for others if not provided)
    const expiryDate = tier === 'lifetime' ? null : (expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

    console.log(`Admin ${user.id} upgrading user ${userId} to ${tier}`);

    // Update user profile with service role (bypasses RLS)
    // Don't set updated_at explicitly - let the trigger handle it to avoid conflicts
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_tier: tier,
        subscription_status: 'active',
        subscription_expires_at: expiryDate,
        ai_credits: credits,
        credits_reset_date: expiryDate,
        monthly_trade_limit: tier === 'free' ? 10 : 999999
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error upgrading user:', error);
      throw error;
    }

    console.log(`Successfully upgraded user ${userId} to ${tier}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User upgraded to ${tier}`,
        profile: data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-upgrade-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});