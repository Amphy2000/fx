"""
main_bot.py
-----------
The MASTER LOOP — this is the brain that runs the entire SMC bot 24/7.

Flow every cycle:
  1. Fetch fresh OHLCV data (4H + 1H + 15M)
  2. Run SMC engine on Higher Timeframe (4H / 1H) to find active Order Blocks
  3. On each 15M candle close, check if price is tapping a valid HTF OB
  4. Confirm a Market Structure Shift (ChoCh) on 15M inside the OB
  5. Confirm an Inducement (Liquidity Sweep) just before the OB tap
  6. If ALL 3 conditions met → calculate lot size → fire the trade
  7. Strict prop-firm rules enforced at every step
"""

import asyncio
import time
import logging
from datetime import datetime, time as dtime

import os
from supabase import create_client, Client
from data_fetcher   import fetch_data
from smc_engine     import SMCEngine
from risk_manager   import RiskManager
from trade_executor import TradeExecutor
from news_filter    import is_high_impact_news_window
from dotenv         import load_dotenv

load_dotenv()

# ─────────────────────────────────────────────────────────────
# CONFIG — settings are now pulled from .env for maximum safety
# ─────────────────────────────────────────────────────────────
ACCOUNT_BALANCE   = float(os.getenv("ACCOUNT_BALANCE", 10000))
RISK_PERCENT      = float(os.getenv("RISK_PERCENT", 1.0))
MIN_RR            = float(os.getenv("MIN_RR", 2.0))
MAX_OPEN_TRADES   = int(os.getenv("MAX_OPEN_TRADES", 2))
SCAN_INTERVAL_SEC = int(os.getenv("SCAN_INTERVAL_SEC", 60))
DRY_RUN           = os.getenv("DRY_RUN", "false").lower() == "true"

# ─────────────────────────────────────────────────────────────
# PAIRS & TIMEFRAMES CONFIG
# ─────────────────────────────────────────────────────────────
SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD"]
HTF = "1h"  # Higher Timeframe for Order Blocks
LTF = "5m"  # Lower Timeframe for ChoCh and entries

# Supabase Config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = None

# if SUPABASE_URL and SUPABASE_KEY:
#     supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Trading sessions to allow (UTC hours) — avoid low-volume Asian session
ALLOWED_HOURS_UTC = list(range(7, 21))  # 07:00 → 21:00 UTC (London + NY)

# ─────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("bot.log", encoding="utf-8"),
    ]
)
log = logging.getLogger("SMC-Bot")


def is_trading_session() -> bool:
    """Returns True if we are inside an allowed trading session (UTC)."""
    current_hour = datetime.utcnow().hour
    return current_hour in ALLOWED_HOURS_UTC


def check_inducement(df, ob_index: int, direction: str) -> bool:
    """
    Checks whether price swept a minor liquidity pool (swing point)
    just before reaching the Order Block — this is the inducement confirmation.
    """
    lookback = df.iloc[max(0, ob_index - 20): ob_index]
    if lookback.empty:
        return False

    if direction == "buy":
        # Price should have swept a recent swing low before bouncing
        recent_swing_lows = lookback["swing_low"].dropna()
        if recent_swing_lows.empty:
            return False
        lowest_swept = recent_swing_lows.min()
        current_low  = df.iloc[ob_index]["low"]
        swept = current_low <= lowest_swept
        if swept:
            log.info(f"[Inducement] Liquidity sweep confirmed — low {current_low:.2f} swept {lowest_swept:.2f}")
        return swept

    else:  # sell
        recent_swing_highs = lookback["swing_high"].dropna()
        if recent_swing_highs.empty:
            return False
        highest_swept = recent_swing_highs.max()
        current_high  = df.iloc[ob_index]["high"]
        swept = current_high >= highest_swept
        if swept:
            log.info(f"[Inducement] Liquidity sweep confirmed — high {current_high:.2f} swept {highest_swept:.2f}")
        return swept


def find_valid_setups(htf_df, ltf_df) -> list:
    """
    Multi-timeframe analysis:
      - HTF (1H/4H) : identifies Order Blocks
      - LTF (15M)   : confirms the MSS (ChoCh) inside the OB
    Returns a list of valid trade signals.
    """
    signals = []

    for i in range(len(htf_df)):
        ob = htf_df.iloc[i]["order_block"]
        if not ob or str(ob) == "nan":
            continue

        # Parse OB zone from the string (e.g. "High Prob Bullish OB at 2350.50-2352.00")
        try:
            # Split by " at " to get the price range
            range_part = ob.split(" at ")[1]
            parts      = range_part.split("-")
            ob_low     = float(parts[0])
            ob_high    = float(parts[1])
            direction  = "buy" if "Bullish" in ob else "sell"
        except Exception as e:
            log.error(f"Error parsing OB string '{ob}': {e}")
            continue

        ob_mid = (ob_low + ob_high) / 2

        # Check last LTF candle is INSIDE or TOUCHING this OB zone
        last_ltf     = ltf_df.iloc[-1]
        
        # A tap happens if the candle's low is below the OB high AND the high is above the OB low
        price_in_ob  = (last_ltf["low"] <= ob_high) and (last_ltf["high"] >= ob_low)

        if not price_in_ob:
            continue

        log.info(f"[Setup] Price tapping HTF OB zone: {ob_low:.2f}–{ob_high:.2f} ({direction.upper()})")

        # Confirm Inducement (Liquidity sweep)
        if not check_inducement(ltf_df, len(ltf_df) - 1, direction):
            log.info("[Setup] No inducement confirmed — skipping.")
            continue

        # Confirm Market Structure Shift (ChoCh) on LTF (Lookback 20 candles for breathing room)
        recent_ltf = ltf_df.tail(20)
        choch_confirmed = recent_ltf["choch"].any()

        if not choch_confirmed:
            log.info("[Setup] No ChoCh confirmed on LTF — skipping.")
            continue

        log.info("✅ VALID SETUP FOUND — All 3 SMC conditions met!")

        entry      = last_ltf["close"]
        stop_loss  = ob_low - 2.0  if direction == "buy" else ob_high + 2.0  # 2-pip buffer below/above OB
        signals.append({
            "direction":  direction,
            "entry":      round(entry, 2),
            "stop_loss":  round(stop_loss, 2),
            "ob_zone":    f"{ob_low:.2f}–{ob_high:.2f}",
            "timestamp":  datetime.utcnow().isoformat(),
        })

    return signals


async def run_bot():
    log.info("🚀 SMC Multi-Pair Bot starting ...")
    log.info(f"   Mode        : {'DRY RUN ⚠️' if DRY_RUN else '🔴 LIVE TRADING'}")
    log.info(f"   Balance     : ${ACCOUNT_BALANCE:,.2f}")
    log.info(f"   Risk/Trade  : {RISK_PERCENT}%")
    log.info(f"   Min R:R     : 1:{MIN_RR}")
    log.info(f"   Max Trades  : {MAX_OPEN_TRADES}")
    log.info(f"   Pairs       : {', '.join(SYMBOLS)}")
    log.info(f"   Timeframes  : {HTF} (HTF) / {LTF} (LTF)")
    log.info("   Features    : 🛡️ News Filter, 🔒 Auto Break-Even, 📈 Trailing Stop-Loss active")

    executor = TradeExecutor(dry_run=DRY_RUN)
    await executor.connect()

    # Fetch REAL balance from MT5
    acc_info = await executor.get_account_info()
    current_balance = acc_info.get("balance", ACCOUNT_BALANCE)
    
    log.info(f"   Real Balance: ${current_balance:,.2f}")

    risk = RiskManager(
        account_balance=current_balance,
        risk_percent=RISK_PERCENT,
        min_rr=MIN_RR,
        max_open_trades=MAX_OPEN_TRADES,
    )

    open_trades = 0  # Simple counter (MetaApi gives real count in live mode)

    while True:
        try:
            log.info("─" * 50)
            log.info(f"Scanning at {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC ...")

            # ── Session filter ──────────────────────────────
            if not is_trading_session():
                log.info("Outside trading session — bot resting. 💤")
                await asyncio.sleep(SCAN_INTERVAL_SEC)
                continue

            # ── News Filter ──────────────────────────────
            if is_high_impact_news_window():
                log.warning("⚠️ High Impact News Window! Skipping setups to protect capital.")
                await asyncio.sleep(SCAN_INTERVAL_SEC)
                continue

            # ── Trade Management ──────────────────────────────
            # This moves SL to Break-Even at 1:1 RR, and trails the stop loss
            await executor.manage_active_trades(breakeven_rr=1.0)

            for symbol in SYMBOLS:
                log.info(f"🔍 Scanning {symbol} ...")
                
                # ── 1. Fetch multi-timeframe data ────────────────
                htf_df = fetch_data(symbol, HTF)   # Higher Time Frame
                ltf_df = fetch_data(symbol, LTF)   # Lower Time Frame

                if htf_df.empty or ltf_df.empty:
                    log.warning(f"Received empty data for {symbol}. Skipping...")
                    continue

                # ── 2. Run SMC engine on HTF ─────────────────────
                htf_engine = SMCEngine(htf_df)
                htf_engine.find_swing_points(window=5)
                htf_engine.detect_structure()
                htf_engine.find_order_blocks()

                # ── 3. Run SMC engine on LTF ─────────────────────
                ltf_engine = SMCEngine(ltf_df)
                ltf_engine.find_swing_points(window=3)
                ltf_engine.detect_structure()

                # ── 4. Find valid setups ─────────────────────────
                signals = find_valid_setups(htf_engine.df, ltf_engine.df)

                if not signals:
                    log.info(f"   No valid setups for {symbol}.")
                else:
                    for signal in signals:
                        log.info(f"   ✅ Signal ({symbol}) → {signal}")

                        # ── 5. Risk calculations ─────────────────
                        lot_size   = risk.calculate_lot_size(signal["entry"], signal["stop_loss"])
                        take_profit = risk.calculate_take_profit(
                            signal["entry"], signal["stop_loss"], signal["direction"]
                        )
                        gate = risk.validate_trade(lot_size, open_trades)

                        if not gate["valid"]:
                            log.warning(f"   Trade blocked: {gate['reason']}")
                            continue

                        # ── 6. Fire the order ────────────────────
                        result = await executor.place_order(
                            direction=signal["direction"],
                            lot_size=lot_size,
                            entry=signal["entry"],
                            stop_loss=signal["stop_loss"],
                            take_profit=take_profit,
                            comment=f"SMC-{symbol}-{signal['ob_zone']}",
                        )
                        log.info(f"   Order result: {result}")

                        if result.get("status") != "error":
                            open_trades += 1
                        
                        # ── 7. Push to Supabase Dashboard (DISABLED for standalone mode) ──
                        # if supabase:
                        #     try:
                        #         supabase.table("bot_signals").insert({
                        #             "symbol": "XAUUSD",
                        #             "direction": signal["direction"],
                        #             "entry_price": signal["entry"],
                        #             "stop_loss": signal["stop_loss"],
                        #             "take_profit": take_profit,
                        #             "ob_zone": signal["ob_zone"],
                        #             "status": "pending" if DRY_RUN else "active"
                        #         }).execute()
                        #         log.info("[Supabase] Signal pushed to dashboard.")
                        #     except Exception as e:
                        #         log.error(f"[Supabase] Error pushing signal: {e}")

        except KeyboardInterrupt:
            log.info("Bot stopped by user. 🛑")
            break
        except Exception as e:
            log.error(f"Error in main loop: {e}", exc_info=True)

        # ── Wait before next scan ────────────────────────────
        log.info(f"Next scan in {SCAN_INTERVAL_SEC}s ...")
        await asyncio.sleep(SCAN_INTERVAL_SEC)

    await executor.disconnect()
    log.info("Bot shut down cleanly. Goodbye! 👋")


if __name__ == "__main__":
    asyncio.run(run_bot())
