import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const metaapiKey = Deno.env.get("METAAPI_API_KEY");

    if (!metaapiKey) {
      throw new Error("METAAPI_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active MT5 accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("mt5_accounts")
      .select("*")
      .eq("is_active", true)
      .eq("auto_sync_enabled", true);

    if (accountsError) throw accountsError;

    console.log(`Found ${accounts?.length || 0} active accounts to sync`);

    const results = [];

    for (const account of accounts || []) {
      try {
        console.log(`Syncing account ${account.account_number}...`);

        // Step 1: Create/Get MetaAPI account
        const metaApiAccountResponse = await fetch("https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts", {
          method: "POST",
          headers: {
            "auth-token": metaapiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `${account.broker_name}-${account.account_number}`,
            type: "cloud",
            login: account.account_number,
            password: account.api_secret_encrypted, // investor password
            server: account.server_name,
            platform: "mt5",
            magic: 0,
          }),
        });

        const metaApiAccountData = await metaApiAccountResponse.json();
        
        if (!metaApiAccountResponse.ok && metaApiAccountData.message !== "Account with specified login already exists") {
          throw new Error(`MetaAPI account creation failed: ${metaApiAccountData.message}`);
        }

        const metaApiAccountId = metaApiAccountData.id;
        console.log(`MetaAPI account ID: ${metaApiAccountId}`);

        // Step 2: Wait for account to be deployed
        let deployed = false;
        let attempts = 0;
        while (!deployed && attempts < 10) {
          const statusResponse = await fetch(
            `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${metaApiAccountId}`,
            {
              headers: { "auth-token": metaapiKey },
            }
          );
          const statusData = await statusResponse.json();
          
          if (statusData.state === "DEPLOYED") {
            deployed = true;
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
          }
        }

        if (!deployed) {
          throw new Error("Account deployment timeout");
        }

        // Step 3: Get account history
        const historyResponse = await fetch(
          `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${metaApiAccountId}/history-storage/deals/time-range?startTime=0`,
          {
            headers: { "auth-token": metaapiKey },
          }
        );

        if (!historyResponse.ok) {
          throw new Error(`Failed to fetch history: ${historyResponse.statusText}`);
        }

        const deals = await historyResponse.json();
        console.log(`Fetched ${deals.length} deals`);

        let imported = 0;
        let updated = 0;

        // Step 4: Process deals and import to database
        for (const deal of deals) {
          // Only process closed positions
          if (deal.type !== "DEAL_TYPE_SELL" && deal.type !== "DEAL_TYPE_BUY") continue;
          if (!deal.positionId) continue;

          const { data: existingTrade } = await supabase
            .from("trades")
            .select("id")
            .eq("ticket_number", deal.positionId)
            .eq("mt5_account_id", account.id)
            .single();

          const tradeData = {
            user_id: account.user_id,
            mt5_account_id: account.id,
            ticket_number: deal.positionId,
            pair: deal.symbol || "UNKNOWN",
            direction: deal.type === "DEAL_TYPE_BUY" ? "buy" : "sell",
            entry_price: deal.price || 0,
            exit_price: deal.price || 0,
            volume: deal.volume || 0,
            profit_loss: deal.profit || 0,
            commission: deal.commission || 0,
            swap: deal.swap || 0,
            open_time: deal.time,
            close_time: deal.time,
            result: (deal.profit || 0) >= 0 ? "win" : "loss",
            is_auto_synced: true,
            comment: deal.comment || null,
          };

          if (existingTrade) {
            const { error } = await supabase
              .from("trades")
              .update(tradeData)
              .eq("id", existingTrade.id);
            
            if (!error) updated++;
          } else {
            const { error } = await supabase
              .from("trades")
              .insert(tradeData);
            
            if (!error) imported++;
          }
        }

        // Update sync status
        await supabase
          .from("mt5_accounts")
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: "success",
            sync_error: null,
          })
          .eq("id", account.id);

        // Log sync activity
        await supabase
          .from("sync_logs")
          .insert({
            user_id: account.user_id,
            mt5_account_id: account.id,
            sync_type: "metaapi",
            status: "success",
            trades_imported: imported,
            trades_updated: updated,
            completed_at: new Date().toISOString(),
          });

        results.push({
          accountId: account.id,
          accountNumber: account.account_number,
          success: true,
          imported,
          updated,
        });

        console.log(`Account ${account.account_number} synced: ${imported} imported, ${updated} updated`);
      } catch (error: any) {
        console.error(`Error syncing account ${account.account_number}:`, error);

        // Update error status
        await supabase
          .from("mt5_accounts")
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: "error",
            sync_error: error.message,
          })
          .eq("id", account.id);

        await supabase
          .from("sync_logs")
          .insert({
            user_id: account.user_id,
            mt5_account_id: account.id,
            sync_type: "metaapi",
            status: "error",
            error_message: error.message,
            completed_at: new Date().toISOString(),
          });

        results.push({
          accountId: account.id,
          accountNumber: account.account_number,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        accountsSynced: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
