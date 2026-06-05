# 🤖 SMC Gold Bot — FREE STANDALONE EDITION

> **100% Free XAUUSD (Gold) Algorithmic Trading Bot**  
> **NO MetaApi Required | NO Subscriptions | NO Funding Needed**  
> Strategy: Smart Money Concepts (SMC) + FVG (Fair Value Gaps)

---

## 📂 Standalone Setup (Zero Cost)

This bot is now a **single standalone entity**. It talks directly to your MetaTrader 5 terminal on your laptop using the official (free) MT5 library.

### Step 1 — Setup MetaTrader 5 (Laptop)
1. Install **MetaTrader 5** (Desktop version) on your Windows laptop.
2. Log into your **Prop Firm Account** or a **Free Demo Account**.
3. Go to **Tools -> Options -> Expert Advisors**.
4. Check **"Allow Algorithmic Trading"**.
5. Keep the MT5 app open while the bot is running.

### Step 2 — Install the Bot
Open your terminal in the `bot/` folder and run:
```bash
pip install -r requirements.txt
```

### Step 3 — Run the Bot
```bash
python main_bot.py
```

---

## 🛡️ Prop Firm Strategy Rules
- **HTF Order Blocks**: Scans 1H/4H for major institutional zones.
- **FVG Confirmation**: Only trades "High Probability" zones followed by imbalances.
- **LTF Confirmation**: Waits for a 15M/5M Change of Character (ChoCh).
- **Session Filter**: Only trades during London/New York overlap.
- **Risk Control**: 1% risk per trade with automatic lot sizing.

---

## 🔧 Config (.env)
You only need to fill this in if you want the dashboard integration. Otherwise, the bot works fine without it!
```env
ACCOUNT_BALANCE=10000
RISK_PERCENT=1.0
DRY_RUN=false
```

---

*Note: This bot is a standalone entity. It runs locally on your machine and costs $0 to operate.*
