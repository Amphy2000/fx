import { useState, useMemo, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

// Drawdown gauge component
const DrawdownGauge = ({ label, usedPercent, remaining }: { label: string; usedPercent: number; remaining: number }) => {
  const severity = usedPercent >= 90 ? "critical" : usedPercent >= 75 ? "danger" : usedPercent >= 50 ? "warning" : "safe";
  const barColor = severity === "critical" ? "bg-destructive" : severity === "danger" ? "bg-destructive/80" : severity === "warning" ? "bg-chart-4" : "bg-success";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-black ${severity === "safe" ? "text-success" : severity === "warning" ? "text-chart-4" : "text-destructive"}`}>
            ${remaining.toFixed(0)}
          </span>
          <Badge className={`text-[9px] px-1.5 py-0 ${
            severity === "safe" ? "bg-success/10 text-success border-success/20" :
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

  // Settings that can be overridden per account (stored in localStorage)
  const [selectedFirm, setSelectedFirm] = useState("ftmo");
  const [assetClass, setAssetClass] = useState("forex");
  const [maxDailyDrawdown, setMaxDailyDrawdown] = useState(5);
  const [maxTotalDrawdown, setMaxTotalDrawdown] = useState(10);
  const [profitTargetPercent, setProfitTargetPercent] = useState(10);
  const [stopLossPips, setStopLossPips] = useState(20);
  const [riskPerTrade, setRiskPerTrade] = useState(1);
  const [manualAccountSize, setManualAccountSize] = useState(100000);

  // Challenge tracker
  const [startDate, setStartDate] = useState(() => localStorage.getItem("propFirmChallengeStart") || new Date().toISOString().split("T")[0]);
  const [challengeDays, setChallengeDays] = useState(30);

  // Fetch user + MT5 accounts
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("mt5_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setMt5Accounts(data as MT5Account[]);
        setSelectedAccountId(data[0].id);
      }
      setLoading(false);
    };
    init();
  }, []);

  // Load settings for selected account — auto-populate account size from MT5 balance if no saved settings
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
        // First time — auto-detect account size from MT5 balance
        const roundedBalance = Math.round(Number(account.balance) / 1000) * 1000 || 100000;
        setManualAccountSize(roundedBalance);
        setShowSetup(true); // Show rules so user can confirm the auto-detected values
      }
    } catch (e) { /* ignore */ }
  }, [selectedAccountId, mt5Accounts]);

  // Save settings
  useEffect(() => {
    if (!selectedAccountId) return;
    const settings = { selectedFirm, assetClass, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, riskPerTrade, manualAccountSize, startDate, challengeDays };
    localStorage.setItem(`prop_settings_${selectedAccountId}`, JSON.stringify(settings));
    localStorage.setItem("propFirmChallengeStart", startDate);
  }, [selectedAccountId, selectedFirm, assetClass, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, riskPerTrade, manualAccountSize, startDate, challengeDays]);

  // Realtime subscription for account updates
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("prop-mt5-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mt5_accounts" }, (payload) => {
        setMt5Accounts(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } as MT5Account : a));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const selectedAccount = mt5Accounts.find(a => a.id === selectedAccountId);
  const hasAccounts = mt5Accounts.length > 0;

  // Derive account values from MT5 data
  const accountSize = manualAccountSize;
  const currentBalance = selectedAccount?.balance || accountSize;
  const startOfDayBalance = selectedAccount?.start_of_day_balance || currentBalance;

  // Sync account
  const handleSync = useCallback(async () => {
    if (!selectedAccountId) return;
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("metaapi-sync", {
        body: { accountId: selectedAccountId },
      });
      if (error) throw error;
      toast.success("Account synced! Balance updated.");
      // Refetch
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

    // Challenge
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

    return {
      dailyRemaining, totalRemaining, remainingProfit, safeRisk, suggestedLots,
      dailyLimit, dailyProg: Math.max(0, Math.min(100, dailyProg)),
      totalProg: Math.max(0, Math.min(100, totalProg)),
      profitProgress, currentProfit, profitTarget,
      daysRemaining, dailyTargetNeeded, onTrack, timeProgress,
      isInDrawdown, drawdownAmount, drawdownPercent,
      lossesToDailyBreach, lossesToTotalBreach,
    };
  }, [accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, assetClass, riskPerTrade, startDate, challengeDays]);

  const copySize = () => {
    navigator.clipboard.writeText(calcs.suggestedLots.toFixed(2));
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    toast.success("Lot size copied!");
  };

  const overallSeverity = calcs.dailyProg >= 75 || calcs.totalProg >= 75 ? "danger" : calcs.dailyProg >= 50 || calcs.totalProg >= 50 ? "warning" : "safe";

  // No accounts connected state
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
                  Link your prop firm MT5 account to get automated balance tracking, drawdown alerts, and safe lot size calculations — zero manual input needed.
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
      <div className="container mx-auto p-4 md:p-6 max-w-5xl space-y-6 animate-in fade-in duration-500">

        {/* HEADER */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              overallSeverity === "danger" ? "bg-destructive/20" : overallSeverity === "warning" ? "bg-chart-4/20" : "bg-success/20"
            }`}>
              <Shield className={`h-5 w-5 ${
                overallSeverity === "danger" ? "text-destructive" : overallSeverity === "warning" ? "text-chart-4" : "text-success"
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
              <Button
                key={acc.id}
                variant={selectedAccountId === acc.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedAccountId(acc.id)}
                className="h-8 px-3 text-[10px] font-bold uppercase rounded-lg flex-shrink-0 gap-1.5"
              >
                {acc.last_sync_status === "success" ? (
                  <Wifi className="h-3 w-3 text-success" />
                ) : (
                  <WifiOff className="h-3 w-3 text-destructive" />
                )}
                {acc.account_name || acc.account_number}
              </Button>
            ))}
          </div>
        )}

        {/* LIVE BALANCE CARD */}
        <Card className="border-none rounded-2xl bg-card overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${selectedAccount?.last_sync_status === "success" ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Live Balance • {selectedAccount?.broker_name}
                </span>
              </div>
              {selectedAccount?.last_sync_at && (
                <span className="text-[9px] text-muted-foreground">
                  Synced {format(new Date(selectedAccount.last_sync_at), "HH:mm")}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-4">
              <p className="text-4xl font-black text-foreground">${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className={`text-sm font-bold ${calcs.currentProfit >= 0 ? "text-success" : "text-destructive"}`}>
                {calcs.currentProfit >= 0 ? "+" : ""}{calcs.currentProfit.toFixed(2)} ({((calcs.currentProfit / accountSize) * 100).toFixed(2)}%)
              </p>
            </div>
            {selectedAccount?.equity && selectedAccount.equity !== currentBalance && (
              <p className="text-xs text-muted-foreground mt-1">
                Equity: ${Number(selectedAccount.equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* COLLAPSIBLE RULES SETUP */}
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

        {/* HEALTH STATUS */}
        <Card className={`border-none rounded-2xl overflow-hidden ${
          overallSeverity === "danger" ? "bg-destructive/5 ring-1 ring-destructive/20" :
          overallSeverity === "warning" ? "bg-chart-4/5 ring-1 ring-chart-4/20" : "bg-card"
        }`}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Account Health</h2>
              {overallSeverity === "danger" && (
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: [0.8, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">
                    <AlertTriangle className="h-3 w-3 mr-1" /> DANGER
                  </Badge>
                </motion.div>
              )}
            </div>
            <DrawdownGauge label="Daily Drawdown" usedPercent={calcs.dailyProg} remaining={calcs.dailyRemaining} />
            <DrawdownGauge label="Total Drawdown" usedPercent={calcs.totalProg} remaining={calcs.totalRemaining} />
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
              <Zap className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                You can afford <span className="text-foreground font-bold">{Math.min(calcs.lossesToDailyBreach, calcs.lossesToTotalBreach)}</span> consecutive losses at current risk.
                {calcs.lossesToDailyBreach <= 3 && <span className="text-destructive font-bold"> Reduce size!</span>}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* LOT SIZE CALCULATOR */}
        <Card className="border-none rounded-2xl bg-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Safe Lot Size</p>
                <div className="flex items-center gap-4">
                  <h2 className="text-7xl md:text-8xl font-black tracking-tighter text-foreground">{calcs.suggestedLots.toFixed(2)}</h2>
                  <Button size="icon" variant="outline" className="h-12 w-12 rounded-xl" onClick={copySize}>
                    {hasCopied ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Risking ${calcs.safeRisk.toFixed(0)} ({riskPerTrade}%) with {stopLossPips}pip SL on {ASSET_CLASSES[assetClass]?.name}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-center min-w-[100px]">
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">Risk $</p>
                  <p className="text-xl font-black text-foreground">${calcs.safeRisk.toFixed(0)}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-center min-w-[100px]">
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">Daily Limit</p>
                  <p className="text-xl font-black text-foreground">${calcs.dailyLimit.toFixed(0)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CHALLENGE PROGRESS or RECOVERY */}
        {calcs.isInDrawdown ? (
          <Card className="border-none rounded-2xl overflow-hidden bg-destructive/5 ring-1 ring-destructive/20">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-destructive/20">
                  <Target className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground">Recovery Mode</h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    ${calcs.drawdownAmount.toFixed(0)} to recover ({calcs.drawdownPercent.toFixed(1)}% down)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-center">
                  <p className="text-2xl font-black text-destructive">-${calcs.drawdownAmount.toFixed(0)}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Current Gap</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-center">
                  <p className="text-2xl font-black text-chart-4">${calcs.totalRemaining.toFixed(0)}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Buffer Left</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-center">
                  <p className="text-2xl font-black text-primary">${calcs.dailyTargetNeeded.toFixed(0)}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Daily Target</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-chart-4/10 border border-chart-4/20">
                <p className="text-sm font-bold text-chart-4 mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Recovery Rules</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• Max {Math.min(riskPerTrade, 0.5)}% risk per trade during recovery</li>
                  <li>• Only take A+ setups – no revenge trades</li>
                  <li>• Stop after 2 consecutive losses</li>
                  <li>• Minimum 1:1.5 risk-reward ratio</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none rounded-2xl bg-card overflow-hidden">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-foreground">Challenge Progress</h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      {calcs.daysRemaining} days remaining
                    </p>
                  </div>
                </div>
                <Badge className={`text-[10px] px-2.5 py-0.5 ${calcs.onTrack ? "bg-success/10 text-success border-success/20" : "bg-chart-4/10 text-chart-4 border-chart-4/20"}`}>
                  {calcs.onTrack ? "ON TRACK" : "BEHIND"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-center">
                  <Calendar className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-2xl font-black text-foreground">{calcs.daysRemaining}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Days Left</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-center">
                  <Target className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-black text-primary">${calcs.remainingProfit.toFixed(0)}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">To Target</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-center">
                  <TrendingUp className="h-4 w-4 mx-auto text-success mb-1" />
                  <p className="text-2xl font-black text-success">${calcs.dailyTargetNeeded.toFixed(0)}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Per Day</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-muted-foreground uppercase">Profit Progress</span>
                  <span className={calcs.profitProgress >= 100 ? "text-success" : calcs.onTrack ? "text-primary" : "text-chart-4"}>
                    {calcs.profitProgress.toFixed(1)}%
                  </span>
                </div>
                <div className="relative">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min(calcs.profitProgress, 100)}%` }} transition={{ duration: 0.8 }} />
                  </div>
                  <div className="absolute top-0 w-0.5 h-3 bg-foreground/40 rounded-full" style={{ left: `${calcs.timeProgress}%` }} />
                </div>
                <p className="text-[9px] text-muted-foreground">White line = expected progress based on time</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">Conservative</p>
                  <p className="text-lg font-black text-foreground">${(calcs.dailyTargetNeeded * 0.8).toFixed(0)}</p>
                  <p className="text-[9px] text-muted-foreground">{Math.ceil(calcs.daysRemaining * 1.25)} days</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-[9px] text-primary uppercase font-bold">On Schedule</p>
                  <p className="text-lg font-black text-primary">${calcs.dailyTargetNeeded.toFixed(0)}</p>
                  <p className="text-[9px] text-muted-foreground">{calcs.daysRemaining} days</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">Aggressive</p>
                  <p className="text-lg font-black text-foreground">${(calcs.dailyTargetNeeded * 1.5).toFixed(0)}</p>
                  <p className="text-[9px] text-muted-foreground">{Math.ceil(calcs.daysRemaining * 0.67)} days</p>
                </div>
              </div>
              {calcs.profitProgress >= 100 && (
                <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                  <p className="text-sm font-bold text-success">🎉 Target Reached! Ready for next phase</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default PropFirmProtector;
