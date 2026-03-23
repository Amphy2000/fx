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

        // Fetch today's daily check-in mood to use as a baseline 'emotion_before'
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: todayCheckin } = await supabase
          .from("daily_checkins")
          .select("mood")
          .eq("user_id", account.user_id)
          .eq("check_in_date", todayStr)
          .maybeSingle();
        
        const dailyMood = todayCheckin?.mood || null;

        let lastLossTime: Date | null = null;
        let lastLossPair: string | null = null;
        let totalVolume = 0;
        let validTradeCount = 0;

        // Sort deals by time ascending to ensure accurate chronological behavioral inference
        const sortedDeals = [...(deals || [])].sort((a, b) => new Date(a.time || 0).getTime() - new Date(b.time || 0).getTime());

        for (const deal of sortedDeals) {
          if (deal.type !== "DEAL_TYPE_SELL" && deal.type !== "DEAL_TYPE_BUY") continue;
          if (!deal.positionId) continue;

          // --- AI Behavioral Inference Logic ---
          const tradeTimestamp = new Date(deal.time || new Date());
          const pair = deal.symbol || "UNKNOWN";
          const profit = deal.profit || 0;
          const isLoss = profit < 0;
          
          totalVolume += deal.volume || 0;
          validTradeCount++;
          const avgVolume = validTradeCount > 1 ? (totalVolume - (deal.volume || 0)) / (validTradeCount - 1) : (deal.volume || 0);

          let inferredEmotion = null;
          let autoComment = deal.comment || null;

          // 1. Revenge Trading (Opening same pair < 15 mins after a loss)
          if (lastLossTime && lastLossPair === pair) {
            const minutesSinceLoss = (tradeTimestamp.getTime() - lastLossTime.getTime()) / (1000 * 60);
            if (minutesSinceLoss < 15) {
                inferredEmotion = "🤬 Revenge";
                autoComment = (autoComment ? autoComment + " | " : "") + "AI Flag: High probability of revenge trading detected (quick re-entry after loss).";
            }
          }

          // 2. Overconfidence / Greed (Lot size is substantially larger than recent average)
          if (!inferredEmotion && avgVolume > 0 && deal.volume >= avgVolume * 2) {
              inferredEmotion = "🤑 Overconfident";
              autoComment = (autoComment ? autoComment + " | " : "") + "AI Flag: Lot size significantly larger than recent average. Check for overconfidence/greed.";
          }

          if (isLoss) {
              lastLossTime = tradeTimestamp;
              lastLossPair = pair;
          }
          // --- End AI Logic ---

          const ticketNumber = deal.positionId?.toString();
          const { data: existingTrade } = await supabase
            .from("trades")
            .select("id")
            .eq("ticket_number", ticketNumber)
            .eq("mt5_account_id", account.id)
            .maybeSingle();

          const tradeData = {
            user_id: account.user_id,
            mt5_account_id: account.id,
            ticket_number: ticketNumber,
            pair: pair,
            direction: deal.type === "DEAL_TYPE_BUY" ? "buy" : "sell",
            entry_price: deal.price || 0,
            exit_price: deal.price || 0,
            volume: deal.volume || 0,
            profit_loss: profit,
            commission: deal.commission || 0,
            swap: deal.swap || 0,
            open_time: tradeTimestamp.toISOString(),
            close_time: tradeTimestamp.toISOString(),
            result: profit > 0 ? "win" : profit < 0 ? "loss" : "breakeven",
            is_auto_synced: true,
            comment: autoComment,
            emotion_before: dailyMood,
            emotion_after: inferredEmotion,
            created_at: tradeTimestamp.toISOString(),
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
        // Track start_of_day_balance: reset it at the start of each new day
        const now = new Date();
        const lastSync = account.last_sync_at ? new Date(account.last_sync_at) : null;
        const isNewDay = !lastSync || lastSync.toDateString() !== now.toDateString();
        const newBalance = accountInfo.balance ?? account.balance ?? 0;

        const updateData: Record<string, any> = {
          last_sync_at: now.toISOString(),
          last_sync_status: "success",
          sync_error: null,
          balance: newBalance,
          equity: accountInfo.equity ?? account.equity ?? 0,
        };

        // Set start_of_day_balance on the first sync of each new day
        if (isNewDay) {
          updateData.start_of_day_balance = newBalance;
          console.log(`New day detected for ${account.account_number}, setting start_of_day_balance=${newBalance}`);
        }

        await supabase
          .from("mt5_accounts")
          .update(updateData)
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

async function fetchAccountInfo(metaapiKey: string, metaApiAccountId: string) {
  try {
    const response = await fetch(
      `${METAAPI_HISTORY_URL}/${metaApiAccountId}/account-information`,
      { headers: { "auth-token": metaapiKey } }
    );
    if (!response.ok) {
      console.warn(`Failed to fetch account info: ${response.statusText}`);
      return { balance: null, equity: null };
    }
    const data = await response.json();
    console.log(`Account info: balance=${data.balance}, equity=${data.equity}`);
    return { balance: data.balance ?? null, equity: data.equity ?? null };
  } catch (e) {
    console.warn("Account info fetch failed:", e);
    return { balance: null, equity: null };
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
