import { useState, useMemo, useEffect } from "react";
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
import { Shield, Target, Activity, Info, Zap, Settings2, RefreshCcw, AlertTriangle, Trash2, Edit3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

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
  forex: { name: "Forex Majors", pipValue: 10, description: "EURUSD, GBPUSD (Standard Lot)" },
  gold: { name: "Gold (XAUUSD)", pipValue: 10, description: "1 Lot = $10 per 10-cent move (Standard)" },
  indices: { name: "Indices (US30)", pipValue: 5, description: "Variable (Approx $5/point)" },
};

const PropFirmProtector = () => {
  const [selectedFirm, setSelectedFirm] = useState<string>("ftmo");
  const [assetClass, setAssetClass] = useState<string>("forex");
  const [accountSize, setAccountSize] = useState<number>(100000);
  const [currentBalance, setCurrentBalance] = useState<number>(100000);
  const [startOfDayBalance, setStartOfDayBalance] = useState<number>(100000);
  const [maxDailyDrawdown, setMaxDailyDrawdown] = useState<number>(5);
  const [maxTotalDrawdown, setMaxTotalDrawdown] = useState<number>(10);
  const [stopLossPips, setStopLossPips] = useState<number>(20);
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
      const { data } = await supabase.from('mt5_accounts').select('id, broker_name, account_number').eq('is_active', true);
      return data || [];
    }
  });

  // Load persistence
  useEffect(() => {
    const savedNames = localStorage.getItem("propFirmAccountNames");
    if (savedNames) setAccountNames(JSON.parse(savedNames));

    const savedSettings = localStorage.getItem(`propFirmSettings_slot_${currentAccountSlot}`);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSelectedFirm(parsed.selectedFirm || "ftmo");
      setAssetClass(parsed.assetClass || "forex");
      setAccountSize(parsed.accountSize || 100000);
      setCurrentBalance(parsed.currentBalance || 100000);
      setStartOfDayBalance(parsed.startOfDayBalance || 100000);
      setMaxDailyDrawdown(parsed.maxDailyDrawdown || 5);
      setMaxTotalDrawdown(parsed.maxTotalDrawdown || 10);
      setStopLossPips(parsed.stopLossPips || 20);
      setRiskPerTrade(parsed.riskPerTrade || 1);
      setSelectedMt5AccountId(parsed.selectedMt5AccountId || null);
    }
  }, [currentAccountSlot]);

  // Save persistence
  useEffect(() => {
    const settings = { selectedFirm, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, stopLossPips, riskPerTrade, selectedMt5AccountId };
    localStorage.setItem(`propFirmSettings_slot_${currentAccountSlot}`, JSON.stringify(settings));
    localStorage.setItem("propFirmAccountNames", JSON.stringify(accountNames));
  }, [currentAccountSlot, selectedFirm, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, stopLossPips, riskPerTrade, accountNames, selectedMt5AccountId]);

  // Real-time calculation from synced trades
  const { data: syncStats, refetch: refetchSync } = useQuery({
    queryKey: ['mt5-sync-stats', selectedMt5AccountId],
    enabled: !!selectedMt5AccountId,
    queryFn: async () => {
      const { data: trades } = await supabase
        .from('trades')
        .select('profit_loss, close_time, result')
        .eq('mt5_account_id', selectedMt5AccountId);

      if (!trades) return null;

      const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayPnL = trades
        .filter(t => t.close_time && new Date(t.close_time) >= startOfToday)
        .reduce((sum, t) => sum + (t.profit_loss || 0), 0);

      const winCount = trades.filter(t => t.result === 'win').length;
      const lossCount = trades.filter(t => t.result === 'loss').length;
      const winRate = (winCount + lossCount) > 0 ? (winCount / (winCount + lossCount)) * 100 : 50;

      return { totalPnL, todayPnL, winRate, tradeCount: trades.length };
    }
  });

  // Apply Sync Stats
  useEffect(() => {
    if (syncStats && !useManualStats) {
      setCurrentBalance(accountSize + syncStats.totalPnL);
      setStartOfDayBalance(accountSize + syncStats.totalPnL - syncStats.todayPnL);
      setSimWinRate(Math.round(syncStats.winRate));
    }
  }, [syncStats, accountSize, useManualStats]);

  const addAccountSlot = () => {
    const newNames = [...accountNames, `Account ${accountNames.length + 1}`];
    setAccountNames(newNames);
    setCurrentAccountSlot(newNames.length - 1);
    toast.success("New account slot added");
  };

  const removeAccountSlot = () => {
    if (accountNames.length <= 1) {
      toast.error("You must have at least one account.");
      return;
    }
    if (confirm(`Are you sure you want to remove "${accountNames[currentAccountSlot]}"?`)) {
      const newNames = accountNames.filter((_, idx) => idx !== currentAccountSlot);
      // Clean up localStorage for this slot
      localStorage.removeItem(`propFirmSettings_slot_${currentAccountSlot}`);
      setAccountNames(newNames);
      setCurrentAccountSlot(0);
      toast.success("Account removed");
    }
  };

  const renameAccount = () => {
    const newName = prompt("Enter new account name:", accountNames[currentAccountSlot]);
    if (newName && newName.trim()) {
      const newNames = [...accountNames];
      newNames[currentAccountSlot] = newName.trim();
      setAccountNames(newNames);
    }
  };

  const handleFirmChange = (firmKey: string) => {
    setSelectedFirm(firmKey);
    const firm = PROP_FIRM_PRESETS[firmKey as keyof typeof PROP_FIRM_PRESETS];
    if (firm && firmKey !== "custom") {
      setMaxDailyDrawdown(firm.dailyDD);
      setMaxTotalDrawdown(firm.totalDD);
      setIsTrailing(firm.trailing);
    }
  };

  const calculations = useMemo(() => {
    const dailyLimitLevel = startOfDayBalance - ((maxDailyDrawdown / 100) * startOfDayBalance);
    const dailyLossRemaining = Math.max(0, currentBalance - dailyLimitLevel);

    const totalLimitLevel = isTrailing
      ? (highWaterMark - ((maxTotalDrawdown / 100) * accountSize))
      : (accountSize - ((maxTotalDrawdown / 100) * accountSize));

    const totalLossRemaining = Math.max(0, currentBalance - totalLimitLevel);
    const effectiveRiskAmount = Math.min(dailyLossRemaining, totalLossRemaining);

    const pipValue = ASSET_CLASSES[assetClass as keyof typeof ASSET_CLASSES]?.pipValue || 10;
    const safeRiskAmount = Math.min((currentBalance * (riskPerTrade / 100)), effectiveRiskAmount * 0.95);
    const suggestedLotSize = safeRiskAmount / (stopLossPips * pipValue);

    return {
      dailyLossRemaining,
      totalLossRemaining,
      effectiveRiskAmount,
      suggestedLotSize: Math.max(0, suggestedLotSize),
      dailyProgress: Math.max(0, Math.min(100, ((startOfDayBalance - currentBalance) / ((maxDailyDrawdown / 100) * startOfDayBalance)) * 100)),
      totalProgress: Math.max(0, Math.min(100, ((isTrailing ? highWaterMark - currentBalance : accountSize - currentBalance) / ((maxTotalDrawdown / 100) * accountSize)) * 100)),
    };
  }, [accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, stopLossPips, assetClass, riskPerTrade, isTrailing, highWaterMark]);

  const runSimulation = async () => {
    setIsSimulating(true);
    setSimulationData([]);
    await new Promise(r => setTimeout(r, 200));

    const ITERATIONS = 300;
    const TRADES = 20;
    let breachCount = 0;
    let passCount = 0;
    let worstStreak = 0;
    const samples: any[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
      let bal = currentBalance;
      let streak = 0;
      let survived = true;
      let path = [{ trade: 0, balance: bal }];

      for (let t = 1; t <= TRADES; t++) {
        if (Math.random() * 100 < simWinRate) {
          // Apply RR
          bal += (bal * (riskPerTrade / 100)) * simRR;
          streak = 0;
        } else {
          bal -= (bal * (riskPerTrade / 100));
          streak++;
          if (streak > worstStreak) worstStreak = streak;
        }

        // Check Daily & Total Breach
        const isTotalBreach = bal < (accountSize * (1 - maxTotalDrawdown / 100));
        // Simple daily breach approx for sim
        const isDailyBreach = (startOfDayBalance - bal) > (startOfDayBalance * (maxDailyDrawdown / 100));

        if (isTotalBreach || isDailyBreach) {
          survived = false;
          path.push({ trade: t, balance: bal });
          break;
        }
        path.push({ trade: t, balance: bal });
      }
      if (!survived) breachCount++; else passCount++;
      if (i < 5) samples.push(path);
    }

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
    setSimulationStats({ pass: (passCount / ITERATIONS) * 100, breach: (breachCount / ITERATIONS) * 100, worstCaseStreak: worstStreak });
    setIsSimulating(false);
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Prop Firm Protector</h1>
            <p className="text-muted-foreground">Monitor drawdown and pass your challenges with precision.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/50">
            {accountNames.map((name, idx) => (
              <Button
                key={idx}
                variant={currentAccountSlot === idx ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentAccountSlot(idx)}
                className={`h-8 text-xs px-4 ${currentAccountSlot === idx ? 'shadow-sm' : ''}`}
              >
                {name}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={addAccountSlot} className="h-8 w-8 p-0 border-dashed"><Zap className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Account Header Actions */}
        <div className="flex items-center justify-between bg-muted/20 p-4 rounded-xl border border-dashed">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{accountNames[currentAccountSlot]}</h3>
              <p className="text-xs text-muted-foreground">Managing slot {currentAccountSlot + 1} of {accountNames.length}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={renameAccount} className="h-9 gap-2">
              <Edit3 className="h-4 w-4" /> Rename
            </Button>
            <Button variant="outline" size="sm" onClick={removeAccountSlot} className="h-9 gap-2 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Column */}
          <div className="space-y-6">
            <Card className="border-t-4 border-t-primary shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" /> Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="flex justify-between">
                    MT5 Connection
                    <a href="/mt5-setup" className="text-[10px] text-primary underline">Setup Help</a>
                  </Label>
                  <Select value={selectedMt5AccountId || "manual"} onValueChange={v => setSelectedMt5AccountId(v === "manual" ? null : v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Manual Entry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Entry (Default)</SelectItem>
                      {mt5Accounts?.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.broker_name} - {acc.account_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mt5Accounts && mt5Accounts.length === 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">No MT5 accounts found. Go to <a href="/integrations" className="text-primary underline">Integrations</a> to link one for free.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Prop Firm Preset</Label>
                  <Select value={selectedFirm} onValueChange={handleFirmChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PROP_FIRM_PRESETS).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Account Size</Label><Input type="number" value={accountSize} onChange={e => setAccountSize(Number(e.target.value))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Day Start Equity</Label><Input type="number" value={startOfDayBalance} onChange={e => setStartOfDayBalance(Number(e.target.value))} /></div>
                </div>

                <div className="space-y-2">
                  <Label className="flex justify-between items-center">
                    Current Equity
                    {selectedMt5AccountId && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-primary" onClick={() => refetchSync()}>
                        <RefreshCcw className="h-3 w-3 mr-1" /> Sync Live
                      </Button>
                    )}
                  </Label>
                  <Input type="number" value={currentBalance} onChange={e => setCurrentBalance(Number(e.target.value))} className="font-mono text-xl font-black bg-primary/5 border-primary/20" />
                </div>

                <div className="space-y-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <div className="flex justify-between items-center text-xs font-bold text-primary">
                    <span>RISK PER TRADE</span>
                    <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{riskPerTrade}%</span>
                  </div>
                  <Slider value={[riskPerTrade]} min={0.1} max={3} step={0.1} onValueChange={v => setRiskPerTrade(v[0])} />
                  <p className="text-[10px] text-muted-foreground text-center">Recommended: 0.5% - 1.0%</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Stop Loss (Pips)</Label><Input type="number" value={stopLossPips} onChange={e => setStopLossPips(Number(e.target.value))} /></div>
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

          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-background to-muted/20 overflow-hidden relative border-l-4 border-l-orange-500">
                <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Daily Breach Room</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-black tracking-tighter">${calculations.dailyLossRemaining.toFixed(0)}</div>
                  <div className="flex items-center justify-between mt-3 text-[10px]">
                    <span className="text-muted-foreground">Used: {calculations.dailyProgress.toFixed(1)}%</span>
                    <span className="font-bold">{calculations.dailyProgress > 80 ? '⚠️ High Risk' : 'SAFE'}</span>
                  </div>
                  <Progress value={calculations.dailyProgress} className={`h-1.5 mt-1 ${calculations.dailyProgress > 80 ? 'bg-orange-200' : ''}`} />
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-background to-muted/20 overflow-hidden relative border-l-4 border-l-primary">
                <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Total Breach Room</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-black tracking-tighter">${calculations.totalLossRemaining.toFixed(0)}</div>
                  <div className="flex items-center justify-between mt-3 text-[10px]">
                    <span className="text-muted-foreground">Used: {calculations.totalProgress.toFixed(1)}%</span>
                    <span className="font-bold">STABLE</span>
                  </div>
                  <Progress value={calculations.totalProgress} className="h-1.5 mt-1" />
                </CardContent>
              </Card>
            </div>

            <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative">
              <div className="absolute right-0 top-0 h-full w-1/4 bg-white/5 skew-x-12 translate-x-10" />
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] font-bold opacity-70">Calculated Safe Lot Size</p>
                    <div className="text-8xl font-black tracking-tighter drop-shadow-lg">{calculations.suggestedLotSize.toFixed(2)}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-none rounded-md">
                        Risk: ${calculations.effectiveRiskAmount.toFixed(0)}
                      </Badge>
                      <span className="text-sm opacity-60">({riskPerTrade}% of Balance)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-black/10 p-6 rounded-2xl border border-white/10 text-center min-w-[140px]">
                    <div>
                      <p className="text-[10px] uppercase opacity-50 mb-1">Stop Loss</p>
                      <div className="text-4xl font-black">{stopLossPips}</div>
                      <p className="text-[10px] uppercase opacity-50 mt-1">PIPS</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="recovery" className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-14 bg-muted/30 p-1.5 rounded-2xl">
                <TabsTrigger value="recovery" className="gap-2 rounded-xl data-[state=active]:shadow-md"><Target className="h-4 w-4" />Recovery Plan</TabsTrigger>
                <TabsTrigger value="simulator" className="gap-2 rounded-xl data-[state=active]:shadow-md"><Activity className="h-4 w-4" />Survival Test</TabsTrigger>
                <TabsTrigger value="info" className="gap-2 rounded-xl data-[state=active]:shadow-md"><Info className="h-4 w-4" />Advantage</TabsTrigger>
              </TabsList>

              <TabsContent value="recovery" className="mt-6">
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader><CardTitle className="text-md flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> drawdown Escape Route</CardTitle></CardHeader>
                  <CardContent>
                    {currentBalance >= accountSize ? (
                      <div className="py-12 text-center space-y-4">
                        <div className="h-16 w-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto text-yellow-600">
                          <Zap className="h-8 w-8" />
                        </div>
                        <div>
                          <h4 className="font-black text-xl">Account in Profit</h4>
                          <p className="text-sm text-muted-foreground">Recovery mode is currently inactive. Focus on hitting your profit target!</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-background border border-border shadow-sm">
                            <p className="text-xs text-muted-foreground font-bold uppercase mb-1">Recovery Target</p>
                            <p className="text-3xl font-black text-primary">${(accountSize - currentBalance).toFixed(0)}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Amount needed to reach Breakeven</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-background border border-border shadow-sm">
                            <p className="text-xs text-muted-foreground font-bold uppercase mb-1">Survival Buffer</p>
                            <p className="text-3xl font-black text-destructive">${calculations.totalLossRemaining.toFixed(0)}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Distance to account breach</p>
                          </div>
                        </div>
                        <Alert className="bg-background border-primary/30">
                          <AlertTriangle className="h-5 w-5 text-primary" />
                          <AlertTitle className="font-bold">Strategic Recovery Plan</AlertTitle>
                          <AlertDescription className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            To eliminate the risk of a breach, immediately reduce trade risk to <strong className="text-primary">0.5%</strong>.
                            Assuming a <strong className="text-primary">1:3 RR</strong> strategy, you need approximately <strong className="text-primary">{Math.ceil((accountSize - currentBalance) / (currentBalance * 0.005 * 3))}</strong> wins to recover the account safely.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="simulator" className="mt-6">
                <Card className="overflow-hidden">
                  <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b bg-muted/10">
                    <div>
                      <CardTitle className="text-md">Monte Carlo Stress Test</CardTitle>
                      <CardDescription>Predicting the next 20 trades survival odds.</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Manual Stress?</Label>
                        <Switch checked={useManualStats} onCheckedChange={setUseManualStats} />
                      </div>
                      <Button size="sm" onClick={runSimulation} disabled={isSimulating} className="h-8 shadow-md">
                        {isSimulating ? "Simulating..." : "Run Analysis"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="md:col-span-1 space-y-4">
                        <div className="space-y-3 p-4 bg-muted/30 rounded-xl border">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold">Win Rate %</Label>
                            <Input
                              type="number"
                              value={simWinRate}
                              onChange={e => setSimWinRate(Number(e.target.value))}
                              disabled={!useManualStats}
                              className="h-8 font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold">Risk:Reward (1:X)</Label>
                            <Input
                              type="number"
                              value={simRR}
                              onChange={e => setSimRR(Number(e.target.value))}
                              disabled={!useManualStats}
                              className="h-8 font-bold"
                              step="0.1"
                            />
                          </div>
                          {!useManualStats && (
                            <p className="text-[9px] text-primary italic">Currently using synced performance stats.</p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground italic leading-tight">
                          <p>Stress testing tracks both <strong>Equity Drawdown</strong> and <strong>Daily Limits</strong> across hundreds of random sequences.</p>
                        </div>
                      </div>
                      <div className="md:col-span-3 space-y-6">
                        {simulationStats ? (
                          <div className="space-y-6">
                            <div className="h-[200px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={simulationData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                  <XAxis dataKey="name" hide />
                                  <YAxis hide domain={['auto', 'auto']} />
                                  <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                  />
                                  <ReferenceLine y={accountSize * (1 - maxTotalDrawdown / 100)} stroke="red" strokeDasharray="3 3" opacity={0.3} />
                                  <Line type="monotone" dataKey="run0" stroke="#8884d8" dot={false} strokeWidth={2.5} />
                                  <Line type="monotone" dataKey="run1" stroke="#82ca9d" dot={false} strokeWidth={1} style={{ opacity: 0.4 }} />
                                  <Line type="monotone" dataKey="run2" stroke="#6366f1" dot={false} strokeWidth={1} style={{ opacity: 0.3 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center p-3 rounded-2xl bg-green-500/5 border border-green-500/10">
                                <div className="text-2xl font-black text-green-600">{simulationStats.pass}%</div>
                                <div className="text-[10px] uppercase font-bold text-muted-foreground">Survival</div>
                              </div>
                              <div className="text-center p-3 rounded-2xl bg-red-500/5 border border-red-500/10">
                                <div className="text-2xl font-black text-red-600">{simulationStats.breach}%</div>
                                <div className="text-[10px] uppercase font-bold text-muted-foreground">Breach</div>
                              </div>
                              <div className="text-center p-3 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                                <div className="text-2xl font-black text-orange-600">{simulationStats.worstCaseStreak}</div>
                                <div className="text-[10px] uppercase font-bold text-muted-foreground">Bad Streak</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-[250px] flex items-center justify-center border-2 border-dashed rounded-2xl text-muted-foreground text-sm bg-muted/20">
                            <div className="text-center space-y-2">
                              <Activity className="h-10 w-10 mx-auto opacity-20" />
                              <p>Click "Run Analysis" to test your survival odds</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="info" className="mt-6">
                <Card className="bg-muted/20"><CardContent className="pt-8 space-y-4 text-sm leading-relaxed">
                  <h4 className="font-black text-lg flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> The Protector Advantage</h4>
                  <ul className="space-y-4 text-muted-foreground">
                    <li className="flex gap-4">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 text-xs font-bold">1</div>
                      <p><strong>Proactive vs. Reactive:</strong> Prop Firm dashboards only tell you that you've *already* failed. This engine tells you the exact lot size to ensure you never violate your daily buffer.</p>
                    </li>
                    <li className="flex gap-4">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 text-xs font-bold">2</div>
                      <p><strong>Compound Risk Precision:</strong> Standard calculators ignore your daily "High Water Mark". We calculate your safe lot based on the lowest point of your daily and total limits combined.</p>
                    </li>
                    <li className="flex gap-4">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 text-xs font-bold">3</div>
                      <p><strong>Dynamic Recovery:</strong> When your account moves into negative equity, the psychological pressure leads to over-leveraging. Our recovery planner gives you a math-based escape route to stay calm.</p>
                    </li>
                  </ul>
                </CardContent></Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PropFirmProtector;
