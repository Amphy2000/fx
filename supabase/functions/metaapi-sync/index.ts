import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const METAAPI_BASE_URL = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts";
const METAAPI_HISTORY_URL = "https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts";

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
    const requestBody = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const requestedAccountId = requestBody?.accountId ?? null;

    let accountsQuery = supabase
      .from("mt5_accounts")
      .select("*")
      .eq("is_active", true)
      .eq("auto_sync_enabled", true);

    if (requestedAccountId) {
      accountsQuery = accountsQuery.eq("id", requestedAccountId);
    }

    const { data: accounts, error: accountsError } = await accountsQuery;
    if (accountsError) throw accountsError;

    console.log(`Found ${accounts?.length || 0} MT5 accounts to sync`);

    const results = [];

    for (const account of accounts || []) {
      try {
        console.log(`Syncing account ${account.account_number}...`);

        const metaApiAccountId = await ensureMetaApiAccount(metaapiKey, account);
        await waitForDeployment(metaapiKey, metaApiAccountId);
        
        // Fetch account info (balance/equity) and deals in parallel
        const [accountInfo, deals] = await Promise.all([
          fetchAccountInfo(metaapiKey, metaApiAccountId),
          fetchDeals(metaapiKey, metaApiAccountId),
        ]);

        let imported = 0;
        let updated = 0;

        for (const deal of deals) {
          if (deal.type !== "DEAL_TYPE_SELL" && deal.type !== "DEAL_TYPE_BUY") continue;
          if (!deal.positionId) continue;

          const ticketNumber = deal.positionId?.toString();
          const { data: existingTrade } = await supabase
            .from("trades")
            .select("id")
            .eq("ticket_number", ticketNumber)
            .eq("mt5_account_id", account.id)
            .maybeSingle();

          const tradeTimestamp = deal.time || new Date().toISOString();
          const tradeData = {
            user_id: account.user_id,
            mt5_account_id: account.id,
            ticket_number: ticketNumber,
            pair: deal.symbol || "UNKNOWN",
            direction: deal.type === "DEAL_TYPE_BUY" ? "buy" : "sell",
            entry_price: deal.price || 0,
            exit_price: deal.price || 0,
            volume: deal.volume || 0,
            profit_loss: deal.profit || 0,
            commission: deal.commission || 0,
            swap: deal.swap || 0,
            open_time: tradeTimestamp,
            close_time: tradeTimestamp,
            result: (deal.profit || 0) > 0 ? "win" : (deal.profit || 0) < 0 ? "loss" : "breakeven",
            is_auto_synced: true,
            comment: deal.comment || null,
            created_at: tradeTimestamp,
            updated_at: new Date().toISOString(),
          };

          if (existingTrade?.id) {
            const { error } = await supabase.from("trades").update(tradeData).eq("id", existingTrade.id);
            if (!error) updated++;
          } else {
            const { error } = await supabase.from("trades").insert(tradeData);
            if (!error) imported++;
          }
        }

        // Update account with balance info from MetaAPI
        await supabase
          .from("mt5_accounts")
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: "success",
            sync_error: null,
            balance: accountInfo.balance ?? account.balance ?? 0,
            equity: accountInfo.equity ?? account.equity ?? 0,
          })
          .eq("id", account.id);

        await supabase.from("sync_logs").insert({
          user_id: account.user_id,
          mt5_account_id: account.id,
          sync_type: requestedAccountId ? "manual_metaapi" : "metaapi",
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
      } catch (error: any) {
        console.error(`Error syncing account ${account.account_number}:`, error);

        await supabase
          .from("mt5_accounts")
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: "error",
            sync_error: error.message,
          })
          .eq("id", account.id);

        await supabase.from("sync_logs").insert({
          user_id: account.user_id,
          mt5_account_id: account.id,
          sync_type: requestedAccountId ? "manual_metaapi" : "metaapi",
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

    return new Response(JSON.stringify({ success: true, accountsSynced: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function ensureMetaApiAccount(metaapiKey: string, account: any) {
  const createResponse = await fetch(METAAPI_BASE_URL, {
    method: "POST",
    headers: {
      "auth-token": metaapiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `${account.broker_name}-${account.account_number}`,
      type: "cloud",
      login: account.account_number,
      password: account.api_secret_encrypted,
      server: account.server_name,
      platform: "mt5",
      magic: 0,
    }),
  });

  const createData = await createResponse.json();

  if (createResponse.ok && createData.id) {
    return createData.id;
  }

  if (createData?.message !== "Account with specified login already exists") {
    throw new Error(`MetaAPI account creation failed: ${createData?.message || createResponse.statusText}`);
  }

  const existingResponse = await fetch(METAAPI_BASE_URL, {
    headers: { "auth-token": metaapiKey },
  });

  const existingAccounts = await existingResponse.json();
  if (!existingResponse.ok || !Array.isArray(existingAccounts)) {
    throw new Error("Unable to find existing MetaAPI account");
  }

  const existingAccount = existingAccounts.find((item: any) => item.login === account.account_number || item.name === `${account.broker_name}-${account.account_number}`);
  if (!existingAccount?.id) {
    throw new Error("Existing MetaAPI account found but ID could not be resolved");
  }

  return existingAccount.id;
}

async function waitForDeployment(metaapiKey: string, metaApiAccountId: string) {
  let deployed = false;
  let attempts = 0;

  while (!deployed && attempts < 10) {
    const statusResponse = await fetch(`${METAAPI_BASE_URL}/${metaApiAccountId}`, {
      headers: { "auth-token": metaapiKey },
    });

    const statusData = await statusResponse.json();
    if (statusData.state === "DEPLOYED") {
      deployed = true;
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;
  }

  if (!deployed) {
    throw new Error("Account deployment timeout");
  }
}

async function fetchDeals(metaapiKey: string, metaApiAccountId: string) {
  const historyResponse = await fetch(
    `${METAAPI_HISTORY_URL}/${metaApiAccountId}/history-storage/deals/time-range?startTime=0`,
    {
      headers: { "auth-token": metaapiKey },
    }
  );

  if (!historyResponse.ok) {
    throw new Error(`Failed to fetch history: ${historyResponse.statusText}`);
  }

  const deals = await historyResponse.json();
  console.log(`Fetched ${deals.length} deals`);
  return deals;
}
