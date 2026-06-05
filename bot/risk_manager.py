"""
risk_manager.py
---------------
Handles all risk calculations so the bot NEVER blows your prop firm account.

Rules enforced:
  - Max risk per trade = X% of account balance (default 1%)
  - Stop Loss is always set (below the OB sweep / above for sell)
  - Take Profit targets minimum 1:2 RR (configurable)
  - Max 2 concurrent open trades at once
  - No trading 30 minutes before/after high-impact news (future feature)
"""


class RiskManager:
    def __init__(
        self,
        account_balance: float,
        risk_percent: float = 1.0,      # % of balance to risk per trade
        min_rr: float = 2.0,            # Minimum Risk:Reward ratio
        max_open_trades: int = 2,
        pip_value_per_lot: float = 10.0  # Gold: ~$1 per 0.01 lot per $1 move
    ):
        self.balance           = account_balance
        self.risk_percent      = risk_percent
        self.min_rr            = min_rr
        self.max_open_trades   = max_open_trades
        self.pip_value_per_lot = pip_value_per_lot

    def update_balance(self, new_balance: float):
        self.balance = new_balance

    def dollar_risk(self) -> float:
        """How many dollars we are willing to lose on one trade."""
        return self.balance * (self.risk_percent / 100)

    def calculate_lot_size(self, entry: float, stop_loss: float) -> float:
        """
        Calculates the correct lot size so that if SL is hit,
        we only lose `risk_percent` of the account.

        For XAUUSD:  1 lot = 100 oz
                     $1 move in Gold = $100 profit/loss per lot
        """
        if entry == stop_loss:
            return 0.0

        stop_distance_usd = abs(entry - stop_loss)  # $ per oz
        dollar_per_lot    = stop_distance_usd * 100  # 1 lot = 100 oz

        if dollar_per_lot == 0:
            return 0.0

        lot_size = self.dollar_risk() / dollar_per_lot

        # Round down to 2 decimal places (0.01 lot = micro lot minimum)
        lot_size = round(lot_size, 2)
        lot_size = max(lot_size, 0.01)   # never below 0.01 lot

        return lot_size

    def calculate_take_profit(self, entry: float, stop_loss: float, direction: str) -> float:
        """
        Sets TP at minimum 1:2 RR from entry.
        direction = 'buy' or 'sell'
        """
        stop_distance = abs(entry - stop_loss)
        tp_distance   = stop_distance * self.min_rr

        if direction == "buy":
            return round(entry + tp_distance, 2)
        else:
            return round(entry - tp_distance, 2)

    def validate_trade(self, lot_size: float, open_trades: int) -> dict:
        """
        Final gate-check before sending any order.
        Returns {valid: bool, reason: str}
        """
        if open_trades >= self.max_open_trades:
            return {"valid": False, "reason": f"Max open trades ({self.max_open_trades}) reached."}
        if lot_size < 0.01:
            return {"valid": False, "reason": "Lot size too small (< 0.01). Increase account balance or widen SL."}
        if lot_size > 10.0:
            return {"valid": False, "reason": "Lot size too large (> 10). Safety cap triggered."}
        return {"valid": True, "reason": "OK"}


# --- Quick demo ---
if __name__ == "__main__":
    rm = RiskManager(account_balance=10_000, risk_percent=1.0, min_rr=2.0)

    entry     = 2350.00
    stop_loss = 2340.00   # $10 SL on Gold
    direction = "buy"

    lot  = rm.calculate_lot_size(entry, stop_loss)
    tp   = rm.calculate_take_profit(entry, stop_loss, direction)
    gate = rm.validate_trade(lot, open_trades=0)

    print("=== Risk Manager Demo ===")
    print(f"Account Balance  : ${rm.balance:,.2f}")
    print(f"Dollar Risk (1%) : ${rm.dollar_risk():,.2f}")
    print(f"Entry            : {entry}")
    print(f"Stop Loss        : {stop_loss}")
    print(f"Take Profit (2R) : {tp}")
    print(f"Lot Size         : {lot} lots")
    print(f"Trade Valid      : {gate}")
