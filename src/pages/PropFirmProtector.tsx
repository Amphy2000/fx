import { useState, useMemo, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Shield,
  Copy,
  CheckCircle2,
  Target,
  Calendar,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  Zap,
  Trophy,
  RefreshCw,
  Wifi,
  WifiOff,
  Link2,
  Brain,
  Clock,
  Ban,
  Eye,
  Flame,
  ArrowDown,
  Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const PROP_FIRM_PRESETS: Record<string, { name: string; dailyDD: number; totalDD: number; profitTarget: number }> = {
  ftmo: { name: "FTMO", dailyDD: 5, totalDD: 10, profitTarget: 10 },
  fundedNext: { name: "Funded Next", dailyDD: 5, totalDD: 10, profitTarget: 10 },
  theForexFunder: { name: "The Funded Trader", dailyDD: 5, totalDD: 10, profitTarget: 10 },
  e8Funding: { name: "E8 Funding", dailyDD: 5, totalDD: 8, profitTarget: 8 },
  myForexFunds: { name: "My Forex Funds", dailyDD: 5, totalDD: 12, profitTarget: 8 },
  trueForexFunds: { name: "True Forex Funds", dailyDD: 5, totalDD: 10, profitTarget: 10 },
  custom: { name: "Custom", dailyDD: 5, totalDD: 10, profitTarget: 10 },
};

const ASSET_CLASSES: Record<string, { name: string; pipValue: number }> = {
  forex: { name: "Forex Majors", pipValue: 10 },
  gold: { name: "Gold (XAUUSD)", pipValue: 1 },
  indices: { name: "Indices (US30)", pipValue: 1 },
};

interface MT5Account {
  id: string;
  account_name: string | null;
  account_number: string;
  broker_name: string;
  server_name: string;
  balance: number | null;
  equity: number | null;
  start_of_day_balance: number | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  sync_error: string | null;
  is_active: boolean | null;
  auto_sync_enabled: boolean | null;
  account_type: string | null;
}

interface TradeRecord {
  id: string;
  pair: string;
  result: string | null;
  profit_loss: number | null;
  volume: number | null;
  emotion_before: string | null;
  session: string | null;
  open_time: string | null;
  close_time: string | null;
  created_at: string;
  r_multiple: number | null;
  mt5_account_id: string | null;
}

interface BehavioralInsight {
  type: "danger" | "warning" | "tip";
  icon: React.ReactNode;
  title: string;
  detail: string;
}

// Analyze trades to find behavioral patterns
function analyzeBehavior(trades: TradeRecord[], accountId: string | null): BehavioralInsight[] {
  const insights: BehavioralInsight[] = [];
  const accountTrades = accountId ? trades.filter(t => t.mt5_account_id === accountId) : trades;
  if (accountTrades.length < 3) return insights;

  // 1. Revenge trading detection — losses followed by immediate larger trades
  const sorted = [...accountTrades].sort((a, b) => new Date(a.open_time || a.created_at).getTime() - new Date(b.open_time || b.created_at).getTime());
  let revengeCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.result === "loss" && curr.volume && prev.volume && curr.volume > prev.volume * 1.3) {
      revengeCount++;
    }
  }
  if (revengeCount >= 2) {
    insights.push({
      type: "danger",
      icon: <Flame className="h-4 w-4" />,
      title: "Revenge Trading Detected",
      detail: `You increased lot size after a loss ${revengeCount} times. This is the #1 reason traders breach accounts. Use the safe lot size below — every trade, no exceptions.`,
    });
  }

  // 2. Worst trading hour
  const hourlyPnL: Record<number, { total: number; count: number }> = {};
  accountTrades.forEach(t => {
    const time = t.open_time || t.created_at;
    if (!time) return;
    const hour = new Date(time).getUTCHours();
    if (!hourlyPnL[hour]) hourlyPnL[hour] = { total: 0, count: 0 };
    hourlyPnL[hour].total += t.profit_loss || 0;
    hourlyPnL[hour].count++;
  });
  const worstHour = Object.entries(hourlyPnL)
    .filter(([, v]) => v.count >= 3 && v.total < 0)
    .sort((a, b) => a[1].total - b[1].total)[0];
  if (worstHour) {
    const h = parseInt(worstHour[0]);
    const loss = Math.abs(worstHour[1].total);
    insights.push({
      type: "warning",
      icon: <Clock className="h-4 w-4" />,
      title: `Avoid Trading at ${h}:00–${h + 1}:00 UTC`,
      detail: `You've lost $${loss.toFixed(0)} total during this hour across ${worstHour[1].count} trades. Consider blocking this time slot.`,
    });
  }

  // 3. Worst pair
  const pairPnL: Record<string, { total: number; wins: number; losses: number }> = {};
  accountTrades.forEach(t => {
    if (!t.pair) return;
    if (!pairPnL[t.pair]) pairPnL[t.pair] = { total: 0, wins: 0, losses: 0 };
    pairPnL[t.pair].total += t.profit_loss || 0;
    if (t.result === "win") pairPnL[t.pair].wins++;
    if (t.result === "loss") pairPnL[t.pair].losses++;
  });
  const worstPair = Object.entries(pairPnL)
    .filter(([, v]) => (v.wins + v.losses) >= 3 && v.total < 0)
    .sort((a, b) => a[1].total - b[1].total)[0];
  if (worstPair) {
    const wr = worstPair[1].wins / (worstPair[1].wins + worstPair[1].losses) * 100;
    insights.push({
      type: "warning",
      icon: <Ban className="h-4 w-4" />,
      title: `Stop Trading ${worstPair[0]}`,
      detail: `${wr.toFixed(0)}% win rate, -$${Math.abs(worstPair[1].total).toFixed(0)} P/L. Remove this pair from your watchlist during the challenge.`,
    });
  }

  // 4. Best pair
  const bestPair = Object.entries(pairPnL)
    .filter(([, v]) => (v.wins + v.losses) >= 3 && v.total > 0)
    .sort((a, b) => b[1].total - a[1].total)[0];
  if (bestPair) {
    const wr = bestPair[1].wins / (bestPair[1].wins + bestPair[1].losses) * 100;
    insights.push({
      type: "tip",
      icon: <Target className="h-4 w-4" />,
      title: `Focus on ${bestPair[0]}`,
      detail: `${wr.toFixed(0)}% win rate, +$${bestPair[1].total.toFixed(0)} profit. This is your edge — stick to it.`,
    });
  }

  // 5. Emotional pattern
  const emotionPnL: Record<string, { total: number; count: number }> = {};
  accountTrades.forEach(t => {
    if (!t.emotion_before) return;
    if (!emotionPnL[t.emotion_before]) emotionPnL[t.emotion_before] = { total: 0, count: 0 };
    emotionPnL[t.emotion_before].total += t.profit_loss || 0;
    emotionPnL[t.emotion_before].count++;
  });
  const worstEmotion = Object.entries(emotionPnL)
    .filter(([, v]) => v.count >= 2 && v.total < 0)
    .sort((a, b) => a[1].total - b[1].total)[0];
  if (worstEmotion) {
    insights.push({
      type: "danger",
      icon: <Brain className="h-4 w-4" />,
      title: `Don't Trade When "${worstEmotion[0]}"`,
      detail: `You lose an average of $${Math.abs(worstEmotion[1].total / worstEmotion[1].count).toFixed(0)} per trade when feeling ${worstEmotion[0]}. Walk away.`,
    });
  }

  // 6. Consecutive loss pattern
  let maxConsecLosses = 0;
  let currentConsec = 0;
  sorted.forEach(t => {
    if (t.result === "loss") { currentConsec++; maxConsecLosses = Math.max(maxConsecLosses, currentConsec); }
    else currentConsec = 0;
  });
  if (maxConsecLosses >= 3) {
    insights.push({
      type: "warning",
      icon: <ArrowDown className="h-4 w-4" />,
      title: `Stop After 2 Consecutive Losses`,
      detail: `Your worst streak was ${maxConsecLosses} losses in a row. Set a hard rule: 2 losses = done for the day.`,
    });
  }

  // 7. Overtrading detection
  const dailyCounts: Record<string, number> = {};
  accountTrades.forEach(t => {
    const day = new Date(t.open_time || t.created_at).toISOString().split("T")[0];
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  });
  const overTradeDays = Object.entries(dailyCounts).filter(([, c]) => c > 5);
  if (overTradeDays.length >= 2) {
    // Check if overtrading days are net negative
    const overtradeResults = overTradeDays.map(([day]) => {
      const dayTrades = accountTrades.filter(t => (t.open_time || t.created_at).startsWith(day));
      return dayTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    });
    const avgOvertradeResult = overtradeResults.reduce((a, b) => a + b, 0) / overtradeResults.length;
    if (avgOvertradeResult < 0) {
      insights.push({
        type: "danger",
        icon: <Activity className="h-4 w-4" />,
        title: "Overtrading Costs You Money",
        detail: `Days with 5+ trades average -$${Math.abs(avgOvertradeResult).toFixed(0)}. Set a max of 3–4 trades per day.`,
      });
    }
  }

  return insights;
}

// Drawdown gauge component
const DrawdownGauge = ({ label, usedPercent, remaining }: { label: string; usedPercent: number; remaining: number }) => {
  const severity = usedPercent >= 90 ? "critical" : usedPercent >= 75 ? "danger" : usedPercent >= 50 ? "warning" : "safe";
  const barColor = severity === "critical" ? "bg-destructive" : severity === "danger" ? "bg-destructive/80" : severity === "warning" ? "bg-chart-4" : "bg-primary";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-black ${severity === "safe" ? "text-primary" : severity === "warning" ? "text-chart-4" : "text-destructive"}`}>
            ${remaining.toFixed(0)}
          </span>
          <Badge className={`text-[9px] px-1.5 py-0 ${
            severity === "safe" ? "bg-primary/10 text-primary border-primary/20" :
            severity === "warning" ? "bg-chart-4/10 text-chart-4 border-chart-4/20" :
            "bg-destructive/10 text-destructive border-destructive/20"
          }`}>
            {usedPercent.toFixed(0)}% used
          </Badge>
        </div>
      </div>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`absolute left-0 top-0 h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(usedPercent, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <div className="absolute left-[50%] top-0 h-full w-px bg-chart-4/30" />
        <div className="absolute left-[75%] top-0 h-full w-px bg-destructive/30" />
        <div className="absolute left-[90%] top-0 h-full w-px bg-destructive/60" />
      </div>
    </div>
  );
};

const PropFirmProtector = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [mt5Accounts, setMt5Accounts] = useState<MT5Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [trades, setTrades] = useState<TradeRecord[]>([]);

  // Settings
  const [selectedFirm, setSelectedFirm] = useState("ftmo");
  const [assetClass, setAssetClass] = useState("forex");
  const [maxDailyDrawdown, setMaxDailyDrawdown] = useState(5);
  const [maxTotalDrawdown, setMaxTotalDrawdown] = useState(10);
  const [profitTargetPercent, setProfitTargetPercent] = useState(10);
  const [stopLossPips, setStopLossPips] = useState(20);
  const [riskPerTrade, setRiskPerTrade] = useState(1);
  const [manualAccountSize, setManualAccountSize] = useState(100000);
  const [startDate, setStartDate] = useState(() => localStorage.getItem("propFirmChallengeStart") || new Date().toISOString().split("T")[0]);
  const [challengeDays, setChallengeDays] = useState(30);

  // Fetch user + MT5 accounts + trades
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [accountsRes, tradesRes] = await Promise.all([
        supabase.from("mt5_accounts").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("trades").select("id, pair, result, profit_loss, volume, emotion_before, session, open_time, close_time, created_at, r_multiple, mt5_account_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
      ]);

      if (accountsRes.data && accountsRes.data.length > 0) {
        setMt5Accounts(accountsRes.data as MT5Account[]);
        setSelectedAccountId(accountsRes.data[0].id);
      }
      if (tradesRes.data) setTrades(tradesRes.data as TradeRecord[]);
      setLoading(false);
    };
    init();
  }, []);

  // Load/save settings
  useEffect(() => {
    if (!selectedAccountId) return;
    const account = mt5Accounts.find(a => a.id === selectedAccountId);
    try {
      const saved = localStorage.getItem(`prop_settings_${selectedAccountId}`);
      if (saved) {
        const p = JSON.parse(saved);
        setSelectedFirm(p.selectedFirm || "ftmo");
        setAssetClass(p.assetClass || "forex");
        setMaxDailyDrawdown(Number(p.maxDailyDrawdown) || 5);
        setMaxTotalDrawdown(Number(p.maxTotalDrawdown) || 10);
        setProfitTargetPercent(Number(p.profitTargetPercent) || 10);
        setStopLossPips(Number(p.stopLossPips) || 20);
        setRiskPerTrade(Number(p.riskPerTrade) || 1);
        setManualAccountSize(Number(p.manualAccountSize) || Number(account?.balance) || 100000);
        setStartDate(p.startDate || new Date().toISOString().split("T")[0]);
        setChallengeDays(Number(p.challengeDays) || 30);
      } else if (account?.balance) {
        const roundedBalance = Math.round(Number(account.balance) / 1000) * 1000 || 100000;
        setManualAccountSize(roundedBalance);
        setShowSetup(true);
      }
    } catch { /* ignore */ }
  }, [selectedAccountId, mt5Accounts]);

  useEffect(() => {
    if (!selectedAccountId) return;
    const settings = { selectedFirm, assetClass, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, riskPerTrade, manualAccountSize, startDate, challengeDays };
    localStorage.setItem(`prop_settings_${selectedAccountId}`, JSON.stringify(settings));
    localStorage.setItem("propFirmChallengeStart", startDate);
  }, [selectedAccountId, selectedFirm, assetClass, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, riskPerTrade, manualAccountSize, startDate, challengeDays]);

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("prop-mt5-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mt5_accounts" }, (payload) => {
        setMt5Accounts(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } as MT5Account : a));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const selectedAccount = mt5Accounts.find(a => a.id === selectedAccountId);
  const hasAccounts = mt5Accounts.length > 0;
  const accountSize = manualAccountSize;
  const currentBalance = selectedAccount?.balance || accountSize;
  const startOfDayBalance = selectedAccount?.start_of_day_balance || currentBalance;

  const handleSync = useCallback(async () => {
    if (!selectedAccountId) return;
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("metaapi-sync", { body: { accountId: selectedAccountId } });
      if (error) throw error;
      toast.success("Account synced!");
      const { data } = await supabase.from("mt5_accounts").select("*").eq("id", selectedAccountId).single();
      if (data) setMt5Accounts(prev => prev.map(a => a.id === data.id ? data as MT5Account : a));
    } catch (e: any) {
      toast.error("Sync failed", { description: e.message });
    }
    setSyncing(false);
  }, [selectedAccountId]);

  // All calculations
  const calcs = useMemo(() => {
    const accSize = accountSize;
    const currBal = currentBalance;
    const startBal = startOfDayBalance;

    const dailyLimit = startBal * (maxDailyDrawdown / 100);
    const dailyFloor = startBal - dailyLimit;
    const dailyRemaining = Math.max(0, currBal - dailyFloor);
    const totalLimit = accSize * (maxTotalDrawdown / 100);
    const totalFloor = accSize - totalLimit;
    const totalRemaining = Math.max(0, currBal - totalFloor);

    const profitTarget = accSize * (profitTargetPercent / 100);
    const currentProfit = currBal - accSize;
    const remainingProfit = Math.max(0, profitTarget - currentProfit);
    const profitProgress = Math.max(0, Math.min(100, (currentProfit / profitTarget) * 100));

    const riskAmt = currBal * (riskPerTrade / 100);
    const maxDrawdownPossible = Math.min(dailyRemaining, totalRemaining);
    const safeRisk = Math.min(riskAmt, maxDrawdownPossible * 0.95);
    const asset = ASSET_CLASSES[assetClass] || ASSET_CLASSES.forex;
    const sl = stopLossPips || 1;
    const suggestedLots = Math.max(0, safeRisk / (sl * asset.pipValue));

    const dailyProg = dailyLimit > 0 ? ((startBal - currBal) / dailyLimit) * 100 : 0;
    const totalProg = totalLimit > 0 ? ((accSize - currBal) / totalLimit) * 100 : 0;

    const start = new Date(startDate);
    const now = new Date();
    const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, challengeDays - daysElapsed);
    const timeProgress = Math.min(100, (daysElapsed / challengeDays) * 100);
    const dailyTargetNeeded = daysRemaining > 0 ? remainingProfit / daysRemaining : 0;
    const onTrack = profitProgress >= timeProgress * 0.8;

    const isInDrawdown = currentProfit < 0;
    const drawdownAmount = Math.abs(Math.min(0, currentProfit));
    const drawdownPercent = (drawdownAmount / accSize) * 100;

    const lossesToDailyBreach = safeRisk > 0 ? Math.floor(dailyRemaining / safeRisk) : 99;
    const lossesToTotalBreach = safeRisk > 0 ? Math.floor(totalRemaining / safeRisk) : 99;

    // Breach probability — simple heuristic based on drawdown used and time pressure
    const drawdownPressure = Math.max(dailyProg, totalProg) / 100;
    const timePressure = profitProgress < timeProgress * 0.5 ? 0.3 : 0;
    const breachProb = Math.min(95, Math.round((drawdownPressure * 60 + timePressure * 100)));

    return {
      dailyRemaining, totalRemaining, remainingProfit, safeRisk, suggestedLots,
      dailyLimit, dailyProg: Math.max(0, Math.min(100, dailyProg)),
      totalProg: Math.max(0, Math.min(100, totalProg)),
      profitProgress, currentProfit, profitTarget,
      daysRemaining, dailyTargetNeeded, onTrack, timeProgress,
      isInDrawdown, drawdownAmount, drawdownPercent,
      lossesToDailyBreach, lossesToTotalBreach, breachProb,
    };
  }, [accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, assetClass, riskPerTrade, startDate, challengeDays]);

  // Behavioral insights
  const behavioralInsights = useMemo(() => analyzeBehavior(trades, selectedAccountId), [trades, selectedAccountId]);

  const copySize = () => {
    navigator.clipboard.writeText(calcs.suggestedLots.toFixed(2));
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    toast.success("Lot size copied!");
  };

  const overallSeverity = calcs.dailyProg >= 75 || calcs.totalProg >= 75 ? "danger" : calcs.dailyProg >= 50 || calcs.totalProg >= 50 ? "warning" : "safe";
  const minLives = Math.min(calcs.lossesToDailyBreach, calcs.lossesToTotalBreach);

  // No accounts state
  if (!loading && !hasAccounts) {
    return (
      <Layout>
        <div className="container mx-auto p-6 max-w-2xl">
          <Card className="border-none rounded-2xl bg-card text-center">
            <CardContent className="p-10 space-y-6">
              <div className="p-4 rounded-2xl bg-primary/10 w-fit mx-auto">
                <Link2 className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-foreground">Connect Your MT5 Account</h1>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  Link your prop firm MT5 account to get automated behavioral analysis, drawdown protection, and personalized insights that help you pass challenges.
                </p>
              </div>
              <Button size="lg" className="font-bold" onClick={() => navigate("/integrations")}>
                <Wifi className="h-4 w-4 mr-2" />
                Connect MT5 Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 max-w-5xl space-y-5 animate-in fade-in duration-500">

        {/* HEADER */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              overallSeverity === "danger" ? "bg-destructive/20" : overallSeverity === "warning" ? "bg-chart-4/20" : "bg-primary/20"
            }`}>
              <Shield className={`h-5 w-5 ${
                overallSeverity === "danger" ? "text-destructive" : overallSeverity === "warning" ? "text-chart-4" : "text-primary"
              }`} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-foreground">Prop Guardian</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {selectedAccount?.account_name || selectedAccount?.account_number} • {PROP_FIRM_PRESETS[selectedFirm]?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="text-[10px] font-bold uppercase gap-1">
              <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing" : "Sync"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSetup(!showSetup)} className="text-[10px] font-bold uppercase gap-1">
              <ChevronDown className={`h-3 w-3 transition-transform ${showSetup ? "rotate-180" : ""}`} />
              Rules
            </Button>
          </div>
        </header>

        {/* ACCOUNT SELECTOR */}
        {mt5Accounts.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {mt5Accounts.map(acc => (
              <Button key={acc.id} variant={selectedAccountId === acc.id ? "default" : "ghost"} size="sm"
                onClick={() => setSelectedAccountId(acc.id)}
                className="h-8 px-3 text-[10px] font-bold uppercase rounded-lg flex-shrink-0 gap-1.5">
                {acc.last_sync_status === "success" ? <Wifi className="h-3 w-3 text-primary" /> : <WifiOff className="h-3 w-3 text-destructive" />}
                {acc.account_name || acc.account_number}
              </Button>
            ))}
          </div>
        )}

        {/* COLLAPSIBLE RULES */}
        <AnimatePresence>
          {showSetup && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <Card className="border-border/40">
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Prop Firm</Label>
                      <Select value={selectedFirm} onValueChange={v => {
                        setSelectedFirm(v);
                        const f = PROP_FIRM_PRESETS[v];
                        if (f) { setMaxDailyDrawdown(f.dailyDD); setMaxTotalDrawdown(f.totalDD); setProfitTargetPercent(f.profitTarget); }
                      }}>
                        <SelectTrigger className="h-9 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(PROP_FIRM_PRESETS).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Asset</Label>
                      <Select value={assetClass} onValueChange={setAssetClass}>
                        <SelectTrigger className="h-9 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(ASSET_CLASSES).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Challenge Start</Label>
                      <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 font-bold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Account Size</Label>
                      <Input type="number" value={manualAccountSize} onChange={e => setManualAccountSize(Number(e.target.value) || 100000)} className="h-9 font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Stop Loss (pips)</Label>
                      <Input type="number" value={stopLossPips} onChange={e => setStopLossPips(Number(e.target.value) || 20)} className="h-9 font-bold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Challenge Days</Label>
                      <Input type="number" value={challengeDays} onChange={e => setChallengeDays(Number(e.target.value) || 30)} className="h-9 font-bold" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                      <span>Risk per Trade</span><span className="text-primary">{riskPerTrade}%</span>
                    </div>
                    <Slider value={[riskPerTrade]} min={0.1} max={3} step={0.1} onValueChange={v => setRiskPerTrade(v[0])} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TOP ROW: Lives Left + Lot Size — the two things that matter BEFORE every trade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LIVES LEFT — unique metric no prop firm shows */}
          <Card className={`border-none rounded-2xl overflow-hidden ${
            minLives <= 2 ? "bg-destructive/5 ring-1 ring-destructive/20" : minLives <= 4 ? "bg-chart-4/5 ring-1 ring-chart-4/20" : "bg-card"
          }`}>
            <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Lives Remaining</p>
              <motion.p
                className={`text-7xl font-black ${minLives <= 2 ? "text-destructive" : minLives <= 4 ? "text-chart-4" : "text-foreground"}`}
                key={minLives}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                {minLives}
              </motion.p>
              <p className="text-xs text-muted-foreground mt-2">
                consecutive losses before breach at {riskPerTrade}% risk
              </p>
              {minLives <= 2 && (
                <motion.div
                  className="mt-3 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <p className="text-[11px] font-bold text-destructive">⚠️ Reduce lot size or stop trading today</p>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* SAFE LOT SIZE */}
          <Card className="border-none rounded-2xl bg-card overflow-hidden">
            <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Safe Lot Size</p>
              <div className="flex items-center gap-3">
                <motion.p className="text-7xl font-black tracking-tighter text-foreground"
                  key={calcs.suggestedLots.toFixed(2)}
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  {calcs.suggestedLots.toFixed(2)}
                </motion.p>
                <Button size="icon" variant="outline" className="h-11 w-11 rounded-xl" onClick={copySize}>
                  {hasCopied ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ${calcs.safeRisk.toFixed(0)} risk • {stopLossPips}pip SL • {ASSET_CLASSES[assetClass]?.name}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* BEHAVIORAL INSIGHTS — the killer differentiator */}
        {behavioralInsights.length > 0 && (
          <Card className="border-none rounded-2xl bg-card overflow-hidden">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Your Blind Spots</h2>
                <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 ml-auto">
                  {behavioralInsights.length} found
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Patterns from your trade history that prop firms won't tell you
              </p>
              <div className="space-y-2">
                {behavioralInsights.map((insight, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className={`p-3.5 rounded-xl border ${
                      insight.type === "danger" ? "bg-destructive/5 border-destructive/15" :
                      insight.type === "warning" ? "bg-chart-4/5 border-chart-4/15" :
                      "bg-primary/5 border-primary/15"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg mt-0.5 flex-shrink-0 ${
                        insight.type === "danger" ? "bg-destructive/10 text-destructive" :
                        insight.type === "warning" ? "bg-chart-4/10 text-chart-4" :
                        "bg-primary/10 text-primary"
                      }`}>
                        {insight.icon}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold ${
                          insight.type === "danger" ? "text-destructive" :
                          insight.type === "warning" ? "text-chart-4" :
                          "text-primary"
                        }`}>
                          {insight.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.detail}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ACCOUNT HEALTH — compact */}
        <Card className={`border-none rounded-2xl overflow-hidden ${
          overallSeverity === "danger" ? "bg-destructive/5 ring-1 ring-destructive/20" :
          overallSeverity === "warning" ? "bg-chart-4/5 ring-1 ring-chart-4/20" : "bg-card"
        }`}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Drawdown Status</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${selectedAccount?.last_sync_status === "success" ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
                <span className="text-[9px] text-muted-foreground">
                  ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {selectedAccount?.last_sync_at && ` • ${format(new Date(selectedAccount.last_sync_at), "HH:mm")}`}
                </span>
              </div>
            </div>
            <DrawdownGauge label="Daily Drawdown" usedPercent={calcs.dailyProg} remaining={calcs.dailyRemaining} />
            <DrawdownGauge label="Total Drawdown" usedPercent={calcs.totalProg} remaining={calcs.totalRemaining} />
          </CardContent>
        </Card>

        {/* CHALLENGE PROGRESS — compact */}
        <Card className="border-none rounded-2xl bg-card overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {calcs.isInDrawdown ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Recovery Mode</h2>
                  </>
                ) : (
                  <>
                    <Trophy className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Challenge Progress</h2>
                  </>
                )}
              </div>
              <Badge className={`text-[10px] px-2.5 py-0.5 ${calcs.onTrack ? "bg-primary/10 text-primary border-primary/20" : "bg-chart-4/10 text-chart-4 border-chart-4/20"}`}>
                {calcs.profitProgress >= 100 ? "TARGET HIT 🎉" : calcs.onTrack ? "ON TRACK" : "BEHIND"}
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-muted-foreground uppercase">
                  {calcs.isInDrawdown ? `$${calcs.drawdownAmount.toFixed(0)} to recover` : `$${calcs.remainingProfit.toFixed(0)} to target`}
                </span>
                <span className={calcs.profitProgress >= 100 ? "text-primary" : calcs.currentProfit >= 0 ? "text-primary" : "text-destructive"}>
                  {calcs.currentProfit >= 0 ? "+" : ""}{calcs.currentProfit.toFixed(0)} ({calcs.profitProgress.toFixed(0)}%)
                </span>
              </div>
              <div className="relative">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div className={`h-full rounded-full ${calcs.isInDrawdown ? "bg-destructive" : "bg-primary"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(Math.max(calcs.profitProgress, 0), 100)}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <div className="absolute top-0 w-0.5 h-3 bg-foreground/30 rounded-full" style={{ left: `${calcs.timeProgress}%` }} />
              </div>
            </div>

            {/* Key stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-center">
                <Calendar className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xl font-black text-foreground">{calcs.daysRemaining}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Days Left</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-center">
                <TrendingUp className="h-3.5 w-3.5 mx-auto text-primary mb-1" />
                <p className="text-xl font-black text-primary">${calcs.dailyTargetNeeded.toFixed(0)}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Per Day</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-center">
                <Zap className="h-3.5 w-3.5 mx-auto text-chart-4 mb-1" />
                <p className="text-xl font-black text-chart-4">{calcs.breachProb}%</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Breach Risk</p>
              </div>
            </div>

            {/* Recovery rules when in drawdown */}
            {calcs.isInDrawdown && (
              <div className="p-3 rounded-xl bg-chart-4/10 border border-chart-4/20">
                <p className="text-xs font-bold text-chart-4 mb-1.5 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Recovery Rules</p>
                <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                  <li>• Max {Math.min(riskPerTrade, 0.5).toFixed(1)}% risk — no exceptions</li>
                  <li>• A+ setups only — skip anything below</li>
                  <li>• 2 consecutive losses = done for the day</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* NO TRADES YET — prompt */}
        {trades.length < 3 && (
          <Card className="border-dashed border-2 border-border/40 rounded-2xl bg-transparent">
            <CardContent className="p-6 text-center space-y-2">
              <Brain className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-bold text-foreground">More trades = smarter insights</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Prop Guardian analyzes your trading patterns to find your blind spots — the habits that cause breaches. Keep trading and syncing for personalized coaching.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default PropFirmProtector;
