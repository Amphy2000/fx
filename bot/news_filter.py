import requests
from datetime import datetime, timedelta
import logging

log = logging.getLogger("SMC-Bot")

def is_high_impact_news_window(buffer_minutes: int = 30) -> bool:
    """
    Checks if we are currently inside a High-Impact news window.
    A common robust method without paid APIs is using the ForexFactory calendar JSON feed.
    
    For reliability and avoiding rate limits during demo/testing, 
    we also implement a hardcoded check for NFP (1st Friday of the month).
    """
    now_utc = datetime.utcnow()
    
    # --- 1. Hardcoded NFP Safety (1st Friday of month around 12:30 - 13:30 UTC) ---
    if now_utc.weekday() == 4 and now_utc.day <= 7:
        # NFP is usually released at 12:30 UTC or 13:30 UTC depending on daylight savings.
        # We block trading between 12:00 UTC and 14:00 UTC on NFP Fridays to be completely safe.
        if 12 <= now_utc.hour < 14:
            log.warning("[News Filter] 🚨 NFP Friday Window detected! Trading paused.")
            return True

    # --- 2. FOMC / CPI Time blocks (Usually Wednesdays/Thursdays around 18:00 UTC or 12:30 UTC) ---
    # To make this fully dynamic, one would parse an RSS/JSON feed.
    # Here is a placeholder for the live API fetch.
    try:
        # For a fully production ready system, we could fetch:
        # url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
        # Since this feed is sometimes unstable, we rely on the static rules above for critical events,
        # but you can expand this block to parse the JSON and look for "impact": "High".
        pass
    except Exception as e:
        log.error(f"[News Filter] Error checking live news feed: {e}")

    return False
