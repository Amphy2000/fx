import { useState, useMemo, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Target, Activity, Info, Zap, Settings2, RefreshCcw, AlertTriangle, Trash2, Edit3, Globe, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const PROP_FIRM_PRESETS = {
  custom: { name: "Custom", dailyDD: 5, totalDD: 10, type: 'balance', trailing: false, description: "Enter your own rules" },
  ftmo: { name: "FTMO", dailyDD: 5, totalDD: 10, type: 'balance', trailing: false, description: "Daily based on start of day balance" },
  fundedNext: { name: "Funded Next", dailyDD: 5, totalDD: 10, type: 'balance', trailing: false, description: "Balance based daily drawdown" },
  myForexFunds: { name: "My Forex Funds", dailyDD: 5, totalDD: 12, type: 'equity', trailing: true, description: "Equity based daily, Trailing total" },
  theForexFunder: { name: "The Funded Trader", dailyDD: 5, totalDD: 10, type: 'balance', trailing: true, description: "Drawdown trails profit" },
  e8Funding: { name: "E8 Funding", dailyDD: 5, totalDD: 8, type: 'balance', trailing: true, description: "Trailing drawdown system" },
  topTierTrader: { name: "Top Tier Trader", dailyDD: 3, totalDD: 6, type: 'equity', trailing: false, description: "Equity + High Water Mark strict" },
};

const ASSET_CLASSES = {
  forex: { name: "Forex Majors", pipValue: 10, description: "1 Lot = $10/pip" },
  gold: { name: "Gold (XAUUSD)", pipValue: 1, description: "1 Lot = $1/pip (1 cent move)" },
  indices: { name: "Indices (US30)", pipValue: 1, description: "Variable per broker" },
};

const PropFirmProtector = () => {
  const [selectedFirm, setSelectedFirm] = useState<string>("ftmo");
  const [assetClass, setAssetClass] = useState<string>("forex");

  // Use strings for inputs to allow empty state (preventing leading zeros)
  const [accountSize, setAccountSize] = useState<string>("100000");
  const [currentBalance, setCurrentBalance] = useState<string>("100000");
  const [startOfDayBalance, setStartOfDayBalance] = useState<string>("100000");
  const [maxDailyDrawdown, setMaxDailyDrawdown] = useState<number>(5);
  const [maxTotalDrawdown, setMaxTotalDrawdown] = useState<number>(10);
  const [stopLossPips, setStopLossPips] = useState<string>("20");
  const [riskPerTrade, setRiskPerTrade] = useState<number>(1);
  const [isTrailing, setIsTrailing] = useState<boolean>(false);
  const [highWaterMark, setHighWaterMark] = useState<number>(100000);

  const [currentAccountSlot, setCurrentAccountSlot] = useState<number>(0);
  const [accountNames, setAccountNames] = useState<string[]>(["Challenge 1"]);
  const [selectedMt5AccountId, setSelectedMt5AccountId] = useState<string | null>(null);

  // Simulator State
  const [simWinRate, setSimWinRate] = useState(50);
  const [simRR, setSimRR] = useState(2);
  const [useManualStats, setUseManualStats] = useState(true);
  const [simulationData, setSimulationData] = useState<any[]>([]);
  const [simulationStats, setSimulationStats] = useState<{ pass: number; breach: number; worstCaseStreak: number } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Sync with available MT5 accounts
  const { data: mt5Accounts } = useQuery({
    queryKey: ['mt5-accounts-list'],
    queryFn: async () => {
      try {
        const { data } = await supabase.from('mt5_accounts').select('id, broker_name, account_number').eq('is_active', true);
        return data || [];
      } catch (e) {
        return [];
      }
    }
  });

  // Persistent Loader
  useEffect(() => {
    try {
      const savedNames = localStorage.getItem("propFirmAccountNames");
      if (savedNames) {
        const parsed = JSON.parse(savedNames);
        if (Array.isArray(parsed) && parsed.length > 0) setAccountNames(parsed);
      }

      const savedSettings = localStorage.getItem(`propFirmSettings_slot_${currentAccountSlot}`);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed) {
          setSelectedFirm(parsed.selectedFirm || "ftmo");
          setAssetClass(parsed.assetClass || "forex");
          setAccountSize(String(parsed.accountSize || "100000"));
          setCurrentBalance(String(parsed.currentBalance || "100000"));
          setStartOfDayBalance(String(parsed.startOfDayBalance || "100000"));
          setMaxDailyDrawdown(parsed.maxDailyDrawdown || 5);
          setMaxTotalDrawdown(parsed.maxTotalDrawdown || 10);
          setStopLossPips(String(parsed.stopLossPips || "20"));
          setRiskPerTrade(parsed.riskPerTrade || 1);
          setSelectedMt5AccountId(parsed.selectedMt5AccountId || null);
        }
      }
    } catch (e) { console.error(e); }
  }, [currentAccountSlot]);

  // Persistent Saver
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const settings = {
          selectedFirm,
          assetClass,
          accountSize: Number(accountSize),
          currentBalance: Number(currentBalance),
          startOfDayBalance: Number(startOfDayBalance),
          maxDailyDrawdown,
          maxTotalDrawdown,
          stopLossPips: Number(stopLossPips),
          riskPerTrade,
          selectedMt5AccountId
        };
        localStorage.setItem(`propFirmSettings_slot_${currentAccountSlot}`, JSON.stringify(settings));
        localStorage.setItem("propFirmAccountNames", JSON.stringify(accountNames));
      } catch (e) { console.error(e); }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentAccountSlot, selectedFirm, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, stopLossPips, riskPerTrade, accountNames, selectedMt5AccountId]);

  // Sync Logic
  const { data: syncStats, refetch: refetchSync } = useQuery({
    queryKey: ['mt5-sync-stats', selectedMt5AccountId],
    enabled: !!selectedMt5AccountId,
    queryFn: async () => {
      const { data: trades } = await supabase.from('trades').select('profit_loss, close_time, result').eq('mt5_account_id', selectedMt5AccountId);
      if (!trades) return null;
      const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const todayPnL = trades.filter(t => t.close_time && new Date(t.close_time) >= startOfToday).reduce((sum, t) => sum + (t.profit_loss || 0), 0);
      const winCount = trades.filter(t => t.result === 'win').length;
      const lossCount = trades.filter(t => t.result === 'loss').length;
      const totalRated = winCount + lossCount;
      const winRate = totalRated > 0 ? (winCount / totalRated) * 100 : 50;
      return { totalPnL, todayPnL, winRate };
    }
  });

  useEffect(() => {
    if (syncStats && !useManualStats) {
      setCurrentBalance(String(Number(accountSize) + syncStats.totalPnL));
      setStartOfDayBalance(String(Number(accountSize) + syncStats.totalPnL - syncStats.todayPnL));
      setSimWinRate(Math.round(syncStats.winRate));
    }
  }, [syncStats, accountSize, useManualStats]);

  const addAccountSlot = () => {
    const newNames = [...accountNames, `Account ${accountNames.length + 1}`];
    setAccountNames(newNames);
    setCurrentAccountSlot(newNames.length - 1);
    toast.success("Account slot added");
  };

  const removeAccountSlot = () => {
    if (accountNames.length <= 1) {
      toast.error("At least one account is required");
      return;
    }
    if (window.confirm(`Delete "${accountNames[currentAccountSlot]}"?`)) {
      const deletedIdx = currentAccountSlot;

      // Clean up memory before state change
      localStorage.removeItem(`propFirmSettings_slot_${deletedIdx}`);

      // Shift settings
      for (let i = deletedIdx; i < accountNames.length - 1; i++) {
        const nextData = localStorage.getItem(`propFirmSettings_slot_${i + 1}`);
        if (nextData) localStorage.setItem(`propFirmSettings_slot_${i}`, nextData);
        else localStorage.removeItem(`propFirmSettings_slot_${i}`);
      }
      localStorage.removeItem(`propFirmSettings_slot_${accountNames.length - 1}`);

      // Update name state
      const newNames = accountNames.filter((_, idx) => idx !== deletedIdx);
      setAccountNames(newNames);
      setCurrentAccountSlot(0);

      toast.success("Account deleted");

      // Force refresh to clear any state ghosts
      setTimeout(() => window.location.reload(), 300);
    }
  };

  const renameAccount = () => {
    const newName = window.prompt("New name:", accountNames[currentAccountSlot]);
    if (newName && newName.trim()) {
      const newNames = [...accountNames];
      newNames[currentAccountSlot] = newName.trim();
      setAccountNames(newNames);
      toast.success("Renamed");
    }
  };

  const calculations = useMemo(() => {
    const sz = Number(accountSize) || 0;
    const cur = Number(currentBalance) || 0;
    const sod = Number(startOfDayBalance) || 0;
    const sl = Number(stopLossPips) || 0;

    const dailyBuffer = (maxDailyDrawdown / 100) * sod;
    const dailyLimitLevel = sod - dailyBuffer;
    const dailyLossRemaining = Math.max(0, cur - dailyLimitLevel);

    const totalBuffer = (maxTotalDrawdown / 100) * sz;
    const totalLimitLevel = isTrailing ? (highWaterMark - totalBuffer) : (sz - totalBuffer);
    const totalLossRemaining = Math.max(0, cur - totalLimitLevel);

    const maxDrawdownCapacity = Math.min(dailyLossRemaining, totalLossRemaining);
    const desiredRiskAmount = cur * (riskPerTrade / 100);
    const safeRiskAmount = Math.min(desiredRiskAmount, maxDrawdownCapacity * 0.95);

    const asset = ASSET_CLASSES[assetClass as keyof typeof ASSET_CLASSES] || ASSET_CLASSES.forex;
    const slPips = sl || 1;
    const suggestedLotSize = safeRiskAmount / (slPips * asset.pipValue);

    return {
      dailyLossRemaining,
      totalLossRemaining,
      maxDrawdownCapacity,
      safeRiskAmount,
      suggestedLotSize: cur > 0 ? Math.max(0, suggestedLotSize) : 0,
      dailyProgress: dailyBuffer > 0 ? Math.max(0, Math.min(100, ((sod - cur) / dailyBuffer) * 100)) : 0,
      totalProgress: totalBuffer > 0 ? Math.max(0, Math.min(100, ((isTrailing ? highWaterMark - cur : sz - cur) / totalBuffer) * 100)) : 0,
      dailyFloor: dailyLimitLevel,
      totalFloor: totalLimitLevel,
      isBlown: cur <= dailyLimitLevel || cur <= totalLimitLevel
    };
  }, [accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, stopLossPips, assetClass, riskPerTrade, isTrailing, highWaterMark]);

  const runSimulation = async () => {
    setIsSimulating(true);
    setSimulationData([]);
    await new Promise(r => setTimeout(r, 200));
    const ITERATIONS = 300;
    const TRADES = 20;
    let breachCount = 0;
    let worstStreak = 0;
    const samples: any[] = [];
    const sz = Number(accountSize);
    const sod = Number(startOfDayBalance);

    for (let i = 0; i < ITERATIONS; i++) {
      let bal = Number(currentBalance);
      let streak = 0;
      let survived = true;
      let path = [{ trade: 0, balance: bal }];
      for (let t = 1; t <= TRADES; t++) {
        if (Math.random() * 100 < simWinRate) {
          bal += (bal * (riskPerTrade / 100)) * simRR;
          streak = 0;
        } else {
          bal -= (bal * (riskPerTrade / 100));
          streak++;
          if (streak > worstStreak) worstStreak = streak;
        }
        const totalLimit = sz * (1 - maxTotalDrawdown / 100);
        const dailyLimit = sod - (sod * (maxDailyDrawdown / 100));
        if (bal < totalLimit || bal < dailyLimit) { survived = false; path.push({ trade: t, balance: bal }); break; }
        path.push({ trade: t, balance: bal });
      }
      if (!survived) breachCount++;
      if (i < 5) samples.push(path);
    }
    setSimulationData([]);
    const chartData = [];
    for (let t = 0; t <= TRADES; t++) {
      const point: any = { name: `T${t}` };
      samples.forEach((run, idx) => {
        const step = run.find((s: any) => s.trade === t);
        if (step) point[`run${idx}`] = step.balance;
      });
      chartData.push(point);
    }
    setSimulationData(chartData);
    setSimulationStats({ pass: Math.round(((ITERATIONS - breachCount) / ITERATIONS) * 100), breach: Math.round((breachCount / ITERATIONS) * 100), worstCaseStreak: worstStreak });
    setIsSimulating(false);
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Prop Firm Protector</h1>
            <p className="text-muted-foreground">Precision risk management for funding challenges.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/50">
            {accountNames.map((name, idx) => (
              <Button key={idx} variant={currentAccountSlot === idx ? "default" : "ghost"} size="sm" onClick={() => setCurrentAccountSlot(idx)} className="h-8 text-xs px-4">{name}</Button>
            ))}
            <Button variant="outline" size="sm" onClick={addAccountSlot} className="h-8 w-8 p-0 border-dashed"><Zap className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex items-center justify-between bg-muted/20 p-4 rounded-xl border border-dashed">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Shield className="h-5 w-5" /></div>
            <div>
              <h3 className="font-bold text-lg">{accountNames[currentAccountSlot] || "Main Account"}</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-widest opacity-60">Manage & Configure</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={renameAccount} className="h-9 gap-2 shadow-sm"><Edit3 className="h-4 w-4" /> Rename</Button>
            <Button variant="outline" size="sm" onClick={removeAccountSlot} className="h-9 gap-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /> Delete</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <Card className="border-t-4 border-t-primary shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/30"><CardTitle className="text-lg flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /> Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Cloud Data Source</Label>
                  <Select value={selectedMt5AccountId || "manual"} onValueChange={v => setSelectedMt5AccountId(v === "manual" ? null : v)}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Manual Entry" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Tracking</SelectItem>
                      {mt5Accounts?.map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.broker_name} ({acc.account_number})</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Note: Desktop EA is free. API sync in dev.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Firm Ruleset</Label>
                  <Select value={selectedFirm} onValueChange={v => { setSelectedFirm(v); const f = PROP_FIRM_PRESETS[v as keyof typeof PROP_FIRM_PRESETS]; if (f && v !== 'custom') { setMaxDailyDrawdown(f.dailyDD); setMaxTotalDrawdown(f.totalDD); setIsTrailing(f.trailing); } }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PROP_FIRM_PRESETS).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Original Challenge Size</Label>
                    <Input type="text" value={accountSize} onChange={e => setAccountSize(e.target.value.replace(/[^0-9.]/g, ""))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Day Start Equity</Label>
                    <Input type="text" value={startOfDayBalance} onChange={e => setStartOfDayBalance(e.target.value.replace(/[^0-9.]/g, ""))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex justify-between items-center text-xs font-bold uppercase">Your Current Balance / Equity {selectedMt5AccountId && <Button variant="ghost" size="sm" className="h-5 px-2 text-[9px] text-primary" onClick={() => refetchSync()}><RefreshCcw className="h-3 w-3 mr-1" /> Sync</Button>}</Label>
                  <Input type="text" value={currentBalance} onChange={e => setCurrentBalance(e.target.value.replace(/[^0-9.]/g, ""))} className="font-mono text-xl font-black bg-primary/5 border-primary/20" />
                  {calculations.isBlown && <p className="text-[10px] text-destructive font-bold">⚠️ BREACH DETECTED: You are below your {maxDailyDrawdown}% limit (${calculations.dailyFloor.toFixed(0)})</p>}
                </div>

                <div className="space-y-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="flex justify-between items-center text-xs font-bold text-primary"><span>RISK/TRADE</span><span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{riskPerTrade}%</span></div>
                  <Slider value={[riskPerTrade]} min={0.1} max={3} step={0.1} onValueChange={v => setRiskPerTrade(v[0])} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Stop Loss (Pips)</Label><Input type="text" value={stopLossPips} onChange={e => setStopLossPips(e.target.value.replace(/[^0-9.]/g, ""))} /></div>
                  <div className="space-y-1">
                    <Label className="text-xs">Asset Class</Label>
                    <Select value={assetClass} onValueChange={setAssetClass}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(ASSET_CLASSES).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-orange-500 overflow-hidden relative">
                <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Daily Room to Lose</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-black tracking-tighter">${calculations.dailyLossRemaining.toFixed(0)}</div>
                  <div className="flex justify-between items-center mt-3 text-[10px] font-bold">
                    <span className="opacity-60">DOLLAR FLOOR: ${calculations.dailyFloor.toFixed(0)}</span>
                    <span className={calculations.dailyProgress > 80 ? 'text-orange-500' : 'text-green-500'}>{calculations.dailyProgress > 80 ? '⚠️ DANGER' : 'HEALTHY'}</span>
                  </div>
                  <Progress value={calculations.dailyProgress} className={`h-1.5 mt-1 ${calculations.dailyProgress > 80 ? 'bg-orange-200' : ''}`} />
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-primary overflow-hidden relative">
                <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Total Breach Room</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-black tracking-tighter">${calculations.totalLossRemaining.toFixed(0)}</div>
                  <div className="flex justify-between items-center mt-3 text-[10px] font-bold">
                    <span className="opacity-60">BLOWOUT FLOOR: ${calculations.totalFloor.toFixed(0)}</span>
                  </div>
                  <Progress value={calculations.totalProgress} className="h-1.5 mt-1" />
                </CardContent>
              </Card>
            </div>

            <Card className="bg-primary text-primary-foreground border-none shadow-2xl overflow-hidden relative group">
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <Badge className="bg-white/10 text-white border-none rounded mb-2">RECOMMENDED LOT SIZE</Badge>
                    <div className="text-8xl font-black tracking-tighter">{calculations.suggestedLotSize.toFixed(2)}</div>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold opacity-60">Dollar Risk to Hit SL</span>
                        <span className="text-xl font-bold">${calculations.safeRiskAmount.toFixed(0)} <span className="text-sm font-normal opacity-60">({riskPerTrade}%)</span></span>
                      </div>
                      <div className="w-px h-10 bg-white/20 mx-2" />
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] uppercase font-bold opacity-60">Total Space Left Today</span>
                        <span className="text-xl font-bold">${calculations.maxDrawdownCapacity.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-black/20 p-6 rounded-3xl border border-white/10 text-center min-w-[140px] backdrop-blur-sm">
                    <p className="text-[10px] uppercase tracking-wider opacity-60 mb-1">Stop Loss</p>
                    <div className="text-5xl font-black">{stopLossPips}</div>
                    <p className="text-[10px] opacity-60 mt-1">PIPS</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="recovery" className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-14 bg-muted/30 p-1.5 rounded-2xl shadow-inner">
                <TabsTrigger value="recovery" className="gap-2 rounded-xl">Recovery Action</TabsTrigger>
                <TabsTrigger value="simulator" className="gap-2 rounded-xl">Stress Test</TabsTrigger>
                <TabsTrigger value="info" className="gap-2 rounded-xl">Protection Docs</TabsTrigger>
              </TabsList>
              <TabsContent value="recovery" className="mt-6"><Card className="border-primary/20 bg-primary/5"><CardHeader><CardTitle className="text-md flex items-center gap-2 font-black tracking-tight"><Target className="h-5 w-5 text-primary" /> Escape Plan</CardTitle></CardHeader><CardContent>
                {Number(currentBalance) >= Number(accountSize) ? (
                  <div className="py-14 text-center space-y-4"><Zap className="h-8 w-8 mx-auto text-yellow-500" /><h4 className="font-black text-xl">Balance Healthy</h4><p className="text-sm text-muted-foreground">You are in profit. Stay sharp!</p></div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4"><div className="p-5 rounded-2xl bg-background border"><p className="text-xs font-bold opacity-50 mb-1">Gap to Breakeven</p><p className="text-3xl font-black text-primary">${(Number(accountSize) - Number(currentBalance)).toFixed(0)}</p></div><div className="p-5 rounded-2xl bg-background border"><p className="text-xs font-bold opacity-50 mb-1">Room to Breach</p><p className="text-3xl font-black text-destructive">${calculations.totalLossRemaining.toFixed(0)}</p></div></div>
                  </div>
                )}
              </CardContent></Card></TabsContent>
              <TabsContent value="simulator" className="mt-6"><Card className="p-6">
                <div className="flex flex-row items-center justify-between mb-8"><CardTitle className="text-md font-bold">Survival Prediction</CardTitle><Button size="sm" onClick={runSimulation} disabled={isSimulating}>{isSimulating ? "..." : "Run Test"}</Button></div>
                {simulationStats ? (
                  <div className="space-y-8">
                    <div className="h-[180px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={simulationData}><CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} /><XAxis dataKey="name" hide /><YAxis hide domain={['auto', 'auto']} /><Tooltip /><Line type="monotone" dataKey="run0" stroke="#8884d8" dot={false} strokeWidth={3} /><Line type="monotone" dataKey="run1" stroke="#82ca9d" dot={false} strokeWidth={1} style={{ opacity: 0.3 }} /></LineChart></ResponsiveContainer></div>
                    <div className="grid grid-cols-3 gap-4"><div className="text-center p-4 rounded-2xl bg-green-500/5"><div className="text-3xl font-black text-green-600">{simulationStats.pass}%</div><div className="text-[10px] uppercase font-bold opacity-60">Survival Odds</div></div><div className="text-center p-4 rounded-2xl bg-red-500/5"><div className="text-3xl font-black text-red-600">{simulationStats.breach}%</div><div className="text-[10px] uppercase font-bold opacity-60">Breach Odds</div></div><div className="text-center p-4 rounded-2xl bg-orange-500/5"><div className="text-3xl font-black text-orange-600">{simulationStats.worstCaseStreak}</div><div className="text-[10px] uppercase font-bold opacity-60">Max Losing Streak</div></div></div>
                  </div>
                ) : <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-3xl opacity-50">Run analysis to see paths</div>}
              </Card></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PropFirmProtector;
