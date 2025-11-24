import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization token from the request
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify admin access
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    console.log('User retrieved:', !!user, 'Error:', authError?.message);
    
    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: `Authentication failed: ${authError.message}` }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!user) {
      console.error('No user found in session');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No authenticated user' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Authenticated user:', user.id);

    // Check admin role using the security definer function
    const { data: hasAdminRole, error: roleError } = await supabaseClient
      .rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      });

    if (roleError) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: `Failed to verify admin access: ${roleError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!hasAdminRole) {
      console.error('User does not have admin role:', user.id);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Admin access verified for user:', user.id);

    const { dateRange = 30 } = await req.json();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    console.log('Gathering analytics data...');

    // Parallel data gathering
    const [
      profilesData,
      tradesData,
      journalData,
      checkinsData,
      creditsData,
      chatData,
      insightsData,
      partnershipsData,
      groupsData,
      mt5Data,
      achievementsData,
      interceptionsData,
      setupsData,
    ] = await Promise.all([
      supabaseClient.from('profiles').select('id, created_at, subscription_tier, ai_credits'),
      supabaseClient.from('trades').select('id, user_id, created_at').gte('created_at', startDate.toISOString()),
      supabaseClient.from('journal_entries').select('id, user_id, created_at').gte('created_at', startDate.toISOString()),
      supabaseClient.from('daily_checkins').select('id, user_id, check_in_date').gte('check_in_date', startDate.toISOString()),
      supabaseClient.from('credit_earnings').select('earning_type, credits_earned, user_id').gte('earned_at', startDate.toISOString()),
      supabaseClient.from('chat_conversations').select('id, user_id, created_at').gte('created_at', startDate.toISOString()),
      supabaseClient.from('trade_insights').select('id, user_id, created_at').gte('created_at', startDate.toISOString()),
      supabaseClient.from('accountability_partnerships').select('id, status, created_at'),
      supabaseClient.from('accountability_groups').select('id, created_at'),
      supabaseClient.from('mt5_accounts').select('id, user_id, created_at'),
      supabaseClient.from('achievements').select('id, user_id, earned_at').gte('earned_at', startDate.toISOString()),
      supabaseClient.from('trade_interceptions').select('id, user_id, created_at').gte('created_at', startDate.toISOString()),
      supabaseClient.from('setups').select('id, user_id, created_at').gte('created_at', startDate.toISOString()),
    ]);

    // Calculate metrics
    const totalUsers = profilesData.data?.length || 0;
    const activeUsers = new Set([
      ...(tradesData.data?.map(t => t.user_id) || []),
      ...(journalData.data?.map(j => j.user_id) || []),
      ...(checkinsData.data?.map(c => c.user_id) || []),
    ]).size;

    // Feature usage aggregation
    const featureUsage = {
      trades: {
        name: 'Trade Logging',
        totalUsers: new Set(tradesData.data?.map(t => t.user_id) || []).size,
        totalUsage: tradesData.data?.length || 0,
        adoptionRate: totalUsers > 0 ? ((new Set(tradesData.data?.map(t => t.user_id) || []).size / totalUsers) * 100).toFixed(1) : '0',
      },
      journal: {
        name: 'AI Journal',
        totalUsers: new Set(journalData.data?.map(j => j.user_id) || []).size,
        totalUsage: journalData.data?.length || 0,
        adoptionRate: totalUsers > 0 ? ((new Set(journalData.data?.map(j => j.user_id) || []).size / totalUsers) * 100).toFixed(1) : '0',
      },
      checkins: {
        name: 'Daily Check-ins',
        totalUsers: new Set(checkinsData.data?.map(c => c.user_id) || []).size,
        totalUsage: checkinsData.data?.length || 0,
        adoptionRate: totalUsers > 0 ? ((new Set(checkinsData.data?.map(c => c.user_id) || []).size / totalUsers) * 100).toFixed(1) : '0',
      },
      aiCoach: {
        name: 'AI Coach Chat',
        totalUsers: new Set(chatData.data?.map(c => c.user_id) || []).size,
        totalUsage: chatData.data?.length || 0,
        adoptionRate: totalUsers > 0 ? ((new Set(chatData.data?.map(c => c.user_id) || []).size / totalUsers) * 100).toFixed(1) : '0',
      },
      tradeInsights: {
        name: 'Trade AI Analysis',
        totalUsers: new Set(insightsData.data?.map(i => i.user_id) || []).size,
        totalUsage: insightsData.data?.length || 0,
        adoptionRate: totalUsers > 0 ? ((new Set(insightsData.data?.map(i => i.user_id) || []).size / totalUsers) * 100).toFixed(1) : '0',
      },
      partnerships: {
        name: 'Accountability Partners',
        totalUsers: partnershipsData.data?.filter(p => p.status === 'active').length || 0,
        totalUsage: partnershipsData.data?.length || 0,
        adoptionRate: totalUsers > 0 ? ((partnershipsData.data?.filter(p => p.status === 'active').length || 0) / totalUsers * 100).toFixed(1) : '0',
      },
      groups: {
        name: 'Accountability Groups',
        totalUsers: groupsData.data?.length || 0,
        totalUsage: groupsData.data?.length || 0,
        adoptionRate: totalUsers > 0 ? ((groupsData.data?.length || 0) / totalUsers * 100).toFixed(1) : '0',
      },
      mt5Integration: {
        name: 'MT5 Integration',
        totalUsers: new Set(mt5Data.data?.map(m => m.user_id) || []).size,
        totalUsage: mt5Data.data?.length || 0,
        adoptionRate: totalUsers > 0 ? ((new Set(mt5Data.data?.map(m => m.user_id) || []).size / totalUsers) * 100).toFixed(1) : '0',
      },
      achievements: {
        name: 'Achievements/Badges',
        totalUsers: new Set(achievementsData.data?.map(a => a.user_id) || []).size,
        totalUsage: achievementsData.data?.length || 0,
        adoptionRate: totalUsers > 0 ? ((new Set(achievementsData.data?.map(a => a.user_id) || []).size / totalUsers) * 100).toFixed(1) : '0',
      },
      tradeValidation: {
        name: 'Trade Validation (Interceptor)',
        totalUsers: new Set(interceptionsData.data?.map(i => i.user_id) || []).size,
        totalUsage: interceptionsData.data?.length || 0,
        adoptionRate: totalUsers > 0 ? ((new Set(interceptionsData.data?.map(i => i.user_id) || []).size / totalUsers) * 100).toFixed(1) : '0',
      },
      setupTracking: {
        name: 'Setup Tracking',
        totalUsers: new Set(setupsData.data?.map(s => s.user_id) || []).size,
        totalUsage: setupsData.data?.length || 0,
        adoptionRate: totalUsers > 0 ? ((new Set(setupsData.data?.map(s => s.user_id) || []).size / totalUsers) * 100).toFixed(1) : '0',
      },
    };

    // Credit spending patterns
    const creditsByFeature = creditsData.data?.reduce((acc: Record<string, number>, curr) => {
      const type = curr.earning_type || 'unknown';
      acc[type] = (acc[type] || 0) + Math.abs(curr.credits_earned || 0);
      return acc;
    }, {}) || {};

    const platformStats = {
      totalUsers,
      activeUsers,
      activityRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : '0',
      subscriptionBreakdown: profilesData.data?.reduce((acc: Record<string, number>, curr) => {
        acc[curr.subscription_tier] = (acc[curr.subscription_tier] || 0) + 1;
        return acc;
      }, {}) || {},
      dateRange,
    };

    console.log('Analyzing data with AI...');

    // Call Lovable AI for insights
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiPrompt = `You are an expert product analyst for Amphy AI, a comprehensive trading psychology platform. 
Analyze this usage data and provide actionable insights.

PLATFORM OVERVIEW:
- Total Users: ${platformStats.totalUsers}
- Active Users (last ${dateRange} days): ${platformStats.activeUsers}
- Activity Rate: ${platformStats.activityRate}%
- Subscription Breakdown: ${JSON.stringify(platformStats.subscriptionBreakdown)}

FEATURE USAGE DATA (last ${dateRange} days):
${JSON.stringify(featureUsage, null, 2)}

CREDIT SPENDING BY FEATURE:
${JSON.stringify(creditsByFeature, null, 2)}

Please analyze and provide insights in JSON format:
{
  "topFeatures": [
    { "name": "string", "metric": "string", "reason": "string" }
  ],
  "underutilized": [
    { "name": "string", "adoptionRate": "string", "suggestion": "string" }
  ],
  "improvements": [
    { 
      "title": "string", 
      "impact": "High|Medium|Low", 
      "effort": "High|Medium|Low", 
      "reasoning": "string", 
      "expectedOutcome": "string" 
    }
  ],
  "newFeatures": [
    { 
      "title": "string", 
      "rationale": "string", 
      "priority": "High|Medium|Low", 
      "relatedBehavior": "string" 
    }
  ],
  "userJourneys": [
    { "pattern": "string", "insight": "string", "action": "string" }
  ]
}

Focus on:
1. Most successful features (adoption + engagement)
2. Features with potential but low adoption
3. Concrete improvements with estimated impact
4. New feature ideas based on user behavior patterns
5. Drop-off points and friction in user journeys`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a product analytics expert. Always respond with valid JSON only.' },
          { role: 'user', content: aiPrompt }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiInsights = JSON.parse(aiData.choices[0].message.content);

    console.log('Analysis complete');

    return new Response(
      JSON.stringify({
        platformStats,
        featureUsage,
        creditsByFeature,
        aiInsights,
        generatedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-platform-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});