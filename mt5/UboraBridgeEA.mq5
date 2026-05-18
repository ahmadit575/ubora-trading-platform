//+------------------------------------------------------------------+
//|                                               UboraBridgeEA.mq5   |
//|                         Copyright 2026, Ubora AI Trading Platform|
//|                                       https://ubora.ai.dashboard |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Ubora AI"
#property link      "https://ubora.ai"
#property version   "1.00"
#property description "Automated AI Trading Bridge for Ubora AI platform"

// Include standard trade library
#include <Trade\Trade.mqh>
CTrade trade;

//--- Input parameters
input string   InpRobotID           = "6a086dbbd05e520260862504"; // MongoDB Robot ID
input string   InpServerURL         = "http://localhost:3001/api/mt5"; // Bridge API URL
input int      InpPollInterval      = 2; // Signal polling interval in seconds
input double   InpLotSizeFallback   = 0.01; // Lot size to use if server doesn't provide one
input int      InpSlippage          = 10; // Allowed slippage in points

//--- Global variables
datetime       last_poll_time = 0;
string         active_signal_id = "";
ulong          active_ticket = 0;
bool           is_trading = false;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("🚀 [Ubora] Initializing Expert Advisor...");
   Print("🤖 [Ubora] Configured Robot ID: ", InpRobotID);
   Print("🌐 [Ubora] Bridge URL: ", InpServerURL);
   
   // Enable Timer
   EventSetTimer(InpPollInterval);
   
   // Set Slippage
   trade.SetDeviationInPoints(InpSlippage);
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("🔒 [Ubora] EA Stopped.");
}

//+------------------------------------------------------------------+
//| Timer event handler                                              |
//+------------------------------------------------------------------+
void OnTimer()
{
   // Check if we are already in an active trade
   if(is_trading)
   {
      CheckActivePosition();
      return;
   }

   // Poll server for new signals
   PollServerSignals();
}

//+------------------------------------------------------------------+
//| Poll Express Backend for Pending Signals                         |
//+------------------------------------------------------------------+
void PollServerSignals()
{
   string headers;
   char post[], result[];
   string result_headers;
   int timeout = 5000; // 5 seconds
   
   string poll_url = InpServerURL + "/signals?robotId=" + InpRobotID;
   
   // Send GET request to pull pending signals
   int res = WebRequest("GET", poll_url, headers, timeout, post, result, result_headers);
   
   if(res == -1)
   {
      int err = GetLastError();
      if(err == 4014)
      {
         Print("❌ [Ubora] Error 4014: Add '", InpServerURL, "' to Options -> Expert Advisors -> Allow WebRequest.");
      }
      else
      {
         Print("❌ [Ubora] WebRequest failed. Error code: ", err);
      }
      return;
   }
   
   if(res == 200)
   {
      string response_text = CharArrayToString(result);
      if(StringFind(response_text, "\"signal\":null") != -1 || StringFind(response_text, "\"signal\": null") != -1)
      {
         // No pending signals, just heartbeat success
         return;
      }
      
      Print("📡 [Ubora] New pending signal received! Processing JSON...");
      ParseAndExecuteSignal(response_text);
   }
}

//+------------------------------------------------------------------+
//| Parse JSON response and Execute Market Orders                     |
//+------------------------------------------------------------------+
void ParseAndExecuteSignal(string json)
{
   // Extract fields using robust string parsing
   string signal_id = GetJSONValue(json, "id");
   string pair = GetJSONValue(json, "pair");
   string direction = GetJSONValue(json, "direction");
   double stop_loss = StringToDouble(GetJSONValue(json, "stopLoss"));
   double take_profit = StringToDouble(GetJSONValue(json, "takeProfit"));
   double lot_size = StringToDouble(GetJSONValue(json, "lotSize"));
   
   if(lot_size <= 0) lot_size = InpLotSizeFallback;
   
   Print("🎯 [Ubora] Routing: ", direction, " ", pair, " Lots: ", lot_size, " SL: ", stop_loss, " TP: ", take_profit);
   
   // Perform trade
   ENUM_ORDER_TYPE order_type;
   double price;
   
   if(direction == "BUY")
   {
      order_type = ORDER_TYPE_BUY;
      price = SymbolInfoDouble(pair, SYMBOL_ASK);
   }
   else if(direction == "SELL")
   {
      order_type = ORDER_TYPE_SELL;
      price = SymbolInfoDouble(pair, SYMBOL_BID);
   }
   else
   {
      Print("❌ [Ubora] Invalid direction received: ", direction);
      return;
   }
   
   if(price <= 0)
   {
      Print("❌ [Ubora] Failed to fetch market price for: ", pair);
      return;
   }

   // Execute the order
   if(trade.PositionOpen(pair, order_type, lot_size, price, stop_loss, take_profit, "Ubora AI Order"))
   {
      ulong ticket = trade.ResultDeal();
      if(ticket == 0) ticket = trade.ResultOrder(); // Fallback to order ticket
      
      Print("🎉 [Ubora] Trade successfully opened! Ticket ID: #", ticket);
      
      active_signal_id = signal_id;
      active_ticket = ticket;
      is_trading = true;
      
      // Log execution back to the server
      ReportExecutionToServer(signal_id, ticket, price, lot_size);
   }
   else
   {
      Print("❌ [Ubora] Order execution failed: ", trade.ResultRetcodeDescription());
   }
}

//+------------------------------------------------------------------+
//| Report successfully executed trade back to server                |
//+------------------------------------------------------------------+
void ReportExecutionToServer(string signal_id, ulong ticket, double price, double lot_size)
{
   string headers = "Content-Type: application/json\r\n";
   char post[], result[];
   string result_headers;
   int timeout = 5000;
   
   string url = InpServerURL + "/trades";
   string body = "{" +
      "\"robotId\":\"" + InpRobotID + "\"," +
      "\"signalId\":\"" + signal_id + "\"," +
      "\"ticket\":" + IntegerToString(ticket) + "," +
      "\"entryPrice\":" + DoubleToString(price, 5) + "," +
      "\"lotSize\":" + DoubleToString(lot_size, 2) +
   "}";
   
   StringToCharArray(body, post);
   
   int res = WebRequest("POST", url, headers, timeout, post, result, result_headers);
   if(res == 201 || res == 200)
   {
      Print("✅ [Ubora] Order execution report successfully synced to cloud.");
   }
   else
   {
      Print("❌ [Ubora] Failed to report execution. Res: ", res);
   }
}

//+------------------------------------------------------------------+
//| Check status of active position (detects TP/SL hit)              |
//+------------------------------------------------------------------+
void CheckActivePosition()
{
   // Check if position with our active ticket is still open
   if(PositionSelectByTicket(active_ticket))
   {
      // Still open, nothing to do
      return;
   }
   
   // Position is closed! We need to query history to extract PnL
   Print("📈 [Ubora] Active trade ticket #", active_ticket, " is closed. Extracting history statistics...");
   
   double pnl = 0.0;
   double exit_price = 0.0;
   string outcome = "draw";
   
   // Query deal history
   HistorySelect(TimeCurrent() - 86400, TimeCurrent() + 60);
   int total_deals = HistoryDealsTotal();
   
   for(int i = total_deals - 1; i >= 0; i--)
   {
      ulong deal_ticket = HistoryDealGetTicket(i);
      ulong deal_position = HistoryDealGetInteger(deal_ticket, DEAL_POSITION_ID);
      
      if(deal_position == active_ticket)
      {
         pnl += HistoryDealGetDouble(deal_ticket, DEAL_PROFIT);
         pnl += HistoryDealGetDouble(deal_ticket, DEAL_COMMISSION);
         pnl += HistoryDealGetDouble(deal_ticket, DEAL_SWAP);
         
         double price = HistoryDealGetDouble(deal_ticket, DEAL_PRICE);
         if(price > 0) exit_price = price;
      }
   }
   
   outcome = pnl > 0 ? "win" : (pnl < 0 ? "loss" : "draw");
   Print("📊 [Ubora] Final PnL for ticket #", active_ticket, ": ", pnl, " USD (Outcome: ", outcome, ")");
   
   // Report close to server
   ReportCloseToServer(active_signal_id, active_ticket, exit_price, pnl, outcome);
   
   // Reset active trading state
   active_signal_id = "";
   active_ticket = 0;
   is_trading = false;
}

//+------------------------------------------------------------------+
//| Report closed position result to Express Server                  |
//+------------------------------------------------------------------+
void ReportCloseToServer(string signal_id, ulong ticket, double exit_price, double pnl, string outcome)
{
   string headers = "Content-Type: application/json\r\n";
   char post[], result[];
   string result_headers;
   int timeout = 5000;
   
   string url = InpServerURL + "/trades/close";
   string body = "{" +
      "\"signalId\":\"" + signal_id + "\"," +
      "\"ticket\":" + IntegerToString(ticket) + "," +
      "\"exitPrice\":" + DoubleToString(exit_price, 5) + "," +
      "\"usdtPnL\":" + DoubleToString(pnl, 2) + "," +
      "\"outcome\":\"" + outcome + "\"" +
   "}";
   
   StringToCharArray(body, post);
   
   int res = WebRequest("POST", url, headers, timeout, post, result, result_headers);
   if(res == 200)
   {
      Print("✅ [Ubora] Close statistics reported and synchronized to dashboard.");
   }
   else
   {
      Print("❌ [Ubora] Failed to report trade close. Res: ", res);
   }
}

//+------------------------------------------------------------------+
//| Robust JSON Value Extractor helper                              |
//+------------------------------------------------------------------+
string GetJSONValue(string json, string key)
{
   string quoted_key = "\"" + key + "\"";
   int pos = StringFind(json, quoted_key);
   if(pos == -1) return("");
   
   int start = pos + StringLen(quoted_key);
   
   // Find colon
   int colon = StringFind(json, ":", start);
   if(colon == -1) return("");
   
   int val_start = colon + 1;
   
   // Skip spaces
   while(val_start < StringLen(json) && 
         (StringSubstr(json, val_start, 1) == " " || StringSubstr(json, val_start, 1) == "\t"))
   {
      val_start++;
   }
   
   // Check if string value (enclosed in quotes)
   if(StringSubstr(json, val_start, 1) == "\"")
   {
      val_start++; // skip quote
      int val_end = StringFind(json, "\"", val_start);
      if(val_end == -1) return("");
      return(StringSubstr(json, val_start, val_end - val_start));
   }
   else
   {
      // Numeric or boolean value
      int val_end = val_start;
      while(val_end < StringLen(json) && 
            StringSubstr(json, val_end, 1) != "," && 
            StringSubstr(json, val_end, 1) != "}" && 
            StringSubstr(json, val_end, 1) != "\r" && 
            StringSubstr(json, val_end, 1) != "\n")
      {
         val_end++;
      }
      return(StringSubstr(json, val_start, val_end - val_start));
   }
}
//+------------------------------------------------------------------+
