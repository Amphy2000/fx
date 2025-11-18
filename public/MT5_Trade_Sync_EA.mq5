//+------------------------------------------------------------------+
//|                                           MT5_Trade_Sync_EA.mq5 |
//|                                      Auto Trade Sync for Journal |
//|                                                                  |
//| IMPORTANT: Before using this EA:                                 |
//| 1. In MT5: Tools → Options → Expert Advisors                     |
//| 2. Check "Allow WebRequest for listed URL"                       |
//| 3. Add this URL: https://yvclpmdgrwugayrvjtqg.supabase.co       |
//| 4. Click OK and restart MT5                                      |
//+------------------------------------------------------------------+
#property copyright "Trade Journal"
#property link      ""
#property version   "1.00"
#property strict

// Input parameters
input string WebhookURL = "https://yvclpmdgrwugayrvjtqg.supabase.co/functions/v1/mt5-sync";  // Webhook URL (copy from dashboard)
input string APIKey = "YOUR_API_KEY_HERE";          // API Key from your dashboard
input int CheckIntervalSeconds = 30;                // Check for new trades every N seconds

// Global variables
datetime lastCheckTime = 0;
string lastCheckedTrades[];

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("MT5 Trade Sync EA initialized");
   Print("Webhook URL: ", WebhookURL);
   Print("Check interval: ", CheckIntervalSeconds, " seconds");
   
   if(APIKey == "YOUR_API_KEY_HERE")
   {
      Alert("Please configure your API Key in EA settings!");
      return(INIT_FAILED);
   }
   
   EventSetTimer(CheckIntervalSeconds);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("MT5 Trade Sync EA deinitialized");
}

//+------------------------------------------------------------------+
//| Timer function - checks for new/closed trades                   |
//+------------------------------------------------------------------+
void OnTimer()
{
   CheckAndSendTrades();
}

//+------------------------------------------------------------------+
//| Check for new or closed trades and send to webhook              |
//+------------------------------------------------------------------+
void CheckAndSendTrades()
{
   string trades[];
   int tradeCount = 0;
   
   // Check history for closed trades
   HistorySelect(lastCheckTime, TimeCurrent());
   
   for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket > 0)
      {
         if(HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_OUT)
         {
            string tradeData = BuildTradeJSON(ticket);
            if(StringLen(tradeData) > 0)
            {
               ArrayResize(trades, tradeCount + 1);
               trades[tradeCount] = tradeData;
               tradeCount++;
            }
         }
      }
   }
   
   // If we found trades, send them
   if(tradeCount > 0)
   {
      string payload = BuildPayload(trades);
      SendToWebhook(payload, tradeCount);
   }
   
   lastCheckTime = TimeCurrent();
}

//+------------------------------------------------------------------+
//| Build JSON for a single trade                                    |
//+------------------------------------------------------------------+
string BuildTradeJSON(ulong ticket)
{
   string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
   long dealType = HistoryDealGetInteger(ticket, DEAL_TYPE);
   double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
   double price = HistoryDealGetDouble(ticket, DEAL_PRICE);
   double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
   double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
   double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
   datetime dealTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
   
   string direction = (dealType == DEAL_TYPE_BUY) ? "buy" : "sell";
   
   string json = "{";
   json += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
   json += "\"symbol\":\"" + symbol + "\",";
   json += "\"direction\":\"" + direction + "\",";
   json += "\"volume\":" + DoubleToString(volume, 2) + ",";
   json += "\"entryPrice\":" + DoubleToString(price, 5) + ",";
   json += "\"exitPrice\":" + DoubleToString(price, 5) + ",";
   json += "\"profit\":" + DoubleToString(profit, 2) + ",";
   json += "\"commission\":" + DoubleToString(commission, 2) + ",";
   json += "\"swap\":" + DoubleToString(swap, 2) + ",";
   json += "\"openTime\":\"" + TimeToString(dealTime, TIME_DATE|TIME_SECONDS) + "\",";
   json += "\"closeTime\":\"" + TimeToString(dealTime, TIME_DATE|TIME_SECONDS) + "\"";
   json += "}";
   
   return json;
}

//+------------------------------------------------------------------+
//| Build complete payload with all trades                           |
//+------------------------------------------------------------------+
string BuildPayload(string &trades[])
{
   string payload = "{\"trades\":[";
   
   for(int i = 0; i < ArraySize(trades); i++)
   {
      payload += trades[i];
      if(i < ArraySize(trades) - 1)
         payload += ",";
   }
   
   payload += "]}";
   return payload;
}

//+------------------------------------------------------------------+
//| Send data to webhook                                             |
//+------------------------------------------------------------------+
void SendToWebhook(string payload, int tradeCount)
{
   char postData[];
   char resultData[];
   string headers;
   
   StringToCharArray(payload, postData, 0, StringLen(payload));
   
   headers = "Content-Type: application/json\r\n";
   headers += "X-MT5-API-Key: " + APIKey + "\r\n";
   
   Print("Attempting to send ", tradeCount, " trades to webhook...");
   Print("Webhook URL: ", WebhookURL);
   
   int timeout = 5000;
   int res = WebRequest(
      "POST",
      WebhookURL,
      headers,
      timeout,
      postData,
      resultData,
      headers
   );
   
   if(res == 200)
   {
      Print("✓ Successfully sent ", tradeCount, " trades to webhook");
   }
   else if(res == -1)
   {
      Print("✗ ERROR: WebRequest failed. Error code: ", GetLastError());
      Print("✗ Make sure you added the URL to 'Allow WebRequest' list in MT5 options:");
      Print("  1. Tools → Options → Expert Advisors");
      Print("  2. Check 'Allow WebRequest for listed URL'");
      Print("  3. Add: https://yvclpmdgrwugayrvjtqg.supabase.co");
      Print("  4. Click OK and restart MT5");
   }
   else
   {
      Print("✗ Failed to send to webhook. HTTP code: ", res);
      Print("Response: ", CharArrayToString(resultData));
   }
}
//+------------------------------------------------------------------+
