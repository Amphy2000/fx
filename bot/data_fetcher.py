"""
data_fetcher.py
---------------
Real-time Data Fetcher using MetaTrader 5 (100% FREE).
Fetches live tick and candle data directly from your MT5 terminal.
"""

import MetaTrader5 as mt5
import pandas as pd
from datetime import datetime

TIMEFRAME_MAP = {
    "3m":  mt5.TIMEFRAME_M3,
    "5m":  mt5.TIMEFRAME_M5,
    "15m": mt5.TIMEFRAME_M15,
    "30m": mt5.TIMEFRAME_M30,
    "1h":  mt5.TIMEFRAME_H1,
    "4h":  mt5.TIMEFRAME_H4,
    "1d":  mt5.TIMEFRAME_D1,
}

def fetch_data(symbol_name: str = "XAUUSD", timeframe: str = "1h", n_candles: int = 500) -> pd.DataFrame:
    """
    Fetches real-time candle data for a given symbol from the local MT5 terminal.
    """
    # Brokers use different suffixes for symbols (like .m, _, m)
    possible_symbols = [symbol_name, f"{symbol_name}m", f"{symbol_name}.m", f"{symbol_name}_"]
    
    # If the user specifically wants gold, include GOLD just in case
    if symbol_name.upper() == "XAUUSD":
        possible_symbols.insert(0, "GOLD")
        
    symbol = None

    for s in possible_symbols:
        # Check if broker supports this symbol
        info = mt5.symbol_info(s)
        if info is not None:
            # Found it! Now make sure it's visible in Market Watch
            if not info.select:
                mt5.symbol_select(s, True)
            symbol = s
            break
    
    if symbol is None:
        print(f"[DataFetcher] CRITICAL: Could not find symbol {symbol_name} (tried {possible_symbols})")
        return pd.DataFrame()
    
    if timeframe not in TIMEFRAME_MAP:
        raise ValueError(f"Unsupported timeframe '{timeframe}'")

    # Get bars from MT5
    rates = mt5.copy_rates_from_pos(symbol, TIMEFRAME_MAP[timeframe], 0, n_candles)
    
    if rates is None or len(rates) == 0:
        print(f"[DataFetcher] Error fetching data for {symbol}: {mt5.last_error()}")
        return pd.DataFrame()

    # Convert to DataFrame
    df = pd.DataFrame(rates)
    df['time'] = pd.to_datetime(df['time'], unit='s')
    df.set_index('time', inplace=True)
    
    # Normalise column names
    df.rename(columns={
        "open":   "open",
        "high":   "high",
        "low":    "low",
        "close":  "close",
        "tick_volume": "volume",
    }, inplace=True)

    return df[["open", "high", "low", "close", "volume"]]

if __name__ == "__main__":
    if mt5.initialize():
        data = fetch_data("XAUUSD", "1h")
        print(data.tail())
        mt5.shutdown()
