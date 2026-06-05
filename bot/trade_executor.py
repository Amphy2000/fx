"""
trade_executor.py
-----------------
Official MetaTrader 5 Executor (100% FREE).
This script talks directly to the MT5 terminal running on your computer.

Setup:
  1. Download and install MetaTrader 5 on your Windows laptop.
  2. Log into your Prop Firm account inside the MT5 app.
  3. Go to Tools -> Options -> Expert Advisors -> Enable "Allow Algorithmic Trading".
  4. Run this script.
"""

import MetaTrader5 as mt5
import os

class TradeExecutor:
    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.symbol = "XAUUSD"

    async def connect(self):
        """Initializes connection to the local MT5 terminal."""
        if not mt5.initialize():
            print(f"[TradeExecutor] Initialize failed, error code: {mt5.last_error()}")
            return False
        
        print(f"[TradeExecutor] Successfully connected to MetaTrader 5 Terminal")
        account_info = mt5.account_info()
        if account_info:
            print(f"[TradeExecutor] Trading Account: {account_info.login} | Broker: {account_info.company}")
        return True

    async def get_account_info(self) -> dict:
        """Returns current balance and equity from the MT5 terminal."""
        info = mt5.account_info()
        if not info:
            return {"balance": 0, "equity": 0}
        return {
            "balance": info.balance,
            "equity": info.equity,
            "margin": info.margin,
            "freeMargin": info.margin_free
        }

    async def place_order(
        self,
        direction: str,
        lot_size: float,
        entry: float,
        stop_loss: float,
        take_profit: float,
        comment: str = "SMC-Bot"
    ) -> dict:
        """Sends a trade request to MT5."""
        if self.dry_run:
            print(f"\n[DRY RUN] Would {direction.upper()} {lot_size} lots of {self.symbol}")
            return {"status": "dry_run"}

        # Prepare request
        order_type = mt5.ORDER_TYPE_BUY if direction == "buy" else mt5.ORDER_TYPE_SELL
        price = mt5.symbol_info_tick(self.symbol).ask if direction == "buy" else mt5.symbol_info_tick(self.symbol).bid

        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": self.symbol,
            "volume": float(lot_size),
            "type": order_type,
            "price": price,
            "sl": float(stop_loss),
            "tp": float(take_profit),
            "deviation": 20,
            "magic": 123456,
            "comment": comment,
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }

        # Send request
        result = mt5.order_send(request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            print(f"[TradeExecutor] Order failed: {result.comment} (code: {result.retcode})")
            return {"status": "error", "message": result.comment}

        print(f"[TradeExecutor] Order Successful! Ticket: {result.order}")
        return {"status": "success", "orderId": result.order}

    async def manage_active_trades(self, breakeven_rr: float = 1.0, trailing_step_points: float = 20.0):
        """
        Manages open trades by:
        1. Moving SL to Break-Even once a 1:1 Risk/Reward is achieved.
        2. Trailing the SL once the trade is deeply in profit.
        Note: trailing_step_points is in raw price points (e.g., $2.00 on Gold, or 0.0020 on EURUSD)
        """
        if self.dry_run:
            return

        positions = mt5.positions_get()
        if positions is None or len(positions) == 0:
            return

        for pos in positions:
            symbol = pos.symbol
            direction = "buy" if pos.type == mt5.ORDER_TYPE_BUY else "sell"
            entry = pos.price_open
            current = pos.price_current
            sl = pos.sl
            tp = pos.tp
            ticket = pos.ticket

            # Skip if SL is missing
            if sl == 0.0:
                continue

            # Determine pip precision for the symbol
            info = mt5.symbol_info(symbol)
            if not info:
                continue
            
            # Trailing step logic in price terms
            # Gold might use 2.0, Forex might use 0.0020.
            # We scale trailing_step_points depending on the asset type (XAU = 10x points, Forex = standard)
            step = 2.0 if "XAU" in symbol or "GOLD" in symbol else 0.0020

            new_sl = sl

            if direction == "buy":
                # Check for Break-Even (1:1 RR achieved)
                if sl < entry:
                    initial_risk = entry - sl
                    current_reward = current - entry
                    if initial_risk > 0 and current_reward >= initial_risk * breakeven_rr:
                        new_sl = entry + (info.point * 10)  # BE + tiny spread buffer
                        print(f"[TradeExecutor] 🔒 Break-Even activated for BUY {symbol} #{ticket}")

                # Check for Trailing Stop
                if current > new_sl + step:
                    potential_sl = current - step
                    if potential_sl > new_sl:
                        new_sl = potential_sl
                        print(f"[TradeExecutor] 📈 Trailing SL moved up for BUY {symbol} #{ticket}")

            elif direction == "sell":
                # Check for Break-Even (1:1 RR achieved)
                if sl > entry:
                    initial_risk = sl - entry
                    current_reward = entry - current
                    if initial_risk > 0 and current_reward >= initial_risk * breakeven_rr:
                        new_sl = entry - (info.point * 10)
                        print(f"[TradeExecutor] 🔒 Break-Even activated for SELL {symbol} #{ticket}")

                # Check for Trailing Stop
                if current < new_sl - step:
                    potential_sl = current + step
                    if potential_sl < new_sl:
                        new_sl = potential_sl
                        print(f"[TradeExecutor] 📉 Trailing SL moved down for SELL {symbol} #{ticket}")

            # Send Modification Request if SL changed
            if new_sl != sl:
                request = {
                    "action": mt5.TRADE_ACTION_SLTP,
                    "position": ticket,
                    "symbol": symbol,
                    "sl": float(new_sl),
                    "tp": float(tp),
                    "magic": 123456,
                }
                res = mt5.order_send(request)
                if res.retcode != mt5.TRADE_RETCODE_DONE:
                    print(f"[TradeExecutor] Failed to modify SL for #{ticket}: {res.comment}")

    async def disconnect(self):
        mt5.shutdown()
        print("[TradeExecutor] MT5 Connection Closed.")
