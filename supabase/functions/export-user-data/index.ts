import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { format = 'json' } = await req.json();

    // Fetch all user data in parallel
    const [
      { data: profile },
      { data: trades },
      { data: journalEntries },
      { data: achievements },
      { data: checkins },
      { data: streaks },
      { data: mt5Accounts },
      { data: routineEntries },
      { data: targets },
      { data: setups }
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('trades').select('*').eq('user_id', user.id),
      supabase.from('journal_entries').select('*').eq('user_id', user.id),
      supabase.from('achievements').select('*').eq('user_id', user.id),
      supabase.from('daily_checkins').select('*').eq('user_id', user.id),
      supabase.from('streaks').select('*').eq('user_id', user.id),
      supabase.from('mt5_accounts').select('*').eq('user_id', user.id),
      supabase.from('routine_entries').select('*').eq('user_id', user.id),
      supabase.from('targets').select('*').eq('user_id', user.id),
      supabase.from('setups').select('*').eq('user_id', user.id)
    ]);

    const userData = {
      exportDate: new Date().toISOString(),
      profile,
      trades,
      journalEntries,
      achievements,
      checkins,
      streaks,
      mt5Accounts,
      routineEntries,
      targets,
      setups
    };

    if (format === 'csv') {
      // Convert to CSV format (trades only for simplicity)
      const csvHeaders = 'Pair,Direction,Entry,Exit,Stop Loss,Take Profit,Result,P/L,Date,Notes\n';
      const csvRows = (trades || []).map((t: any) => 
        `"${t.pair}","${t.direction}",${t.entry_price},${t.exit_price || ''},${t.stop_loss || ''},${t.take_profit || ''},"${t.result || ''}",${t.profit_loss || ''},"${t.created_at}","${(t.notes || '').replace(/"/g, '""')}"`
      ).join('\n');
      
      return new Response(csvHeaders + csvRows, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="amphy-trades-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Return JSON format
    return new Response(JSON.stringify(userData, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="amphy-backup-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error: any) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
