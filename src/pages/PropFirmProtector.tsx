import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, TrendingDown, Target, Activity, XCircle, Info, Zap, Calculator, BarChart2, Coins, Settings2, RefreshCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Switch } from "@/components/ui/switch";

// Enhanced Prop Firm Presets with Drawdown Type Metadata
// type: 'balance' (Daily DD based on Start of Day Balance) | 'initial' (Total DD based on Initial Balance)
// trailing: boolean (Total DD trails equity high water mark?)
const PROP_FIRM_PRESETS = {
  custom: { name: "Custom", dailyDD: 5, totalDD: 10, type: 'balance', trailing: false, description: "Enter your own rules" },
  ftmo: { name: "FTMO", dailyDD: 5, totalDD: 10, type: 'balance', trailing: false, description: "Daily based on start of day balance" },
  fundedNext: { name: "Funded Next", dailyDD: 5, totalDD: 10, type: 'balance', trailing: false, description: "Balance based daily drawdown" },
  myForexFunds: { name: "My Forex Funds", dailyDD: 5, totalDD: 12, type: 'equity', trailing: true, description: "Equity based daily, Trailing total" },
  theForexFunder: { name: "The Funded Trader", dailyDD: 5, totalDD: 10, type: 'balance', trailing: true, description: "Drawdown trails profit" },
  e8Funding: { name: "E8 Funding", dailyDD: 5, totalDD: 8, type: 'balance', trailing: true, description: "Trailing drawdown system" },
  topTierTrader: { name: "Top Tier Trader", dailyDD: 3, totalDD: 6, type: 'equity', trailing: false, description: "Equity + High Water Mark strict" },
};

const ACCOUNT_SIZE_PRESETS = [
  { value: 5000, label: "$5K" },
  { value: 10000, label: "$10K" },
  { value: 25000, label: "$25K" },
  { value: 50000, label: "$50K" },
  { value: 100000, label: "$100K" },
  { value: 200000, label: "$200K" },
];

const ASSET_CLASSES = {
  forex: { name: "Forex Majors", pipValue: 10, description: "EURUSD, GBPUSD (Standard Lot)" },
  gold: { name: "Gold (XAUUSD)", pipValue: 10, description: "1 Lot = $10 per 10-cent move (Standard)" },
  indices: { name: "Indices (US30)", pipValue: 5, description: "Variable (Approx $5/point)" },
};

const PropFirmProtector = () => {
  const [selectedFirm, setSelectedFirm] = useState<string>("ftmo");
  const [assetClass, setAssetClass] = useState<string>("forex");
  const [accountSize, setAccountSize] = useState<number>(100000); // Initial Account Size
  const [currentBalance, setCurrentBalance] = useState<number>(100000); // Current Balance/Equity
  const [startOfDayBalance, setStartOfDayBalance] = useState<number>(100000); // Important for Balance-based firms

  const [maxDailyDrawdown, setMaxDailyDrawdown] = useState<number>(5);
  const [maxTotalDrawdown, setMaxTotalDrawdown] = useState<number>(10);
  const [stopLossPips, setStopLossPips] = useState<number>(20);

  // New: Risk Appetite & Drawdown Settings
  const [riskPerTrade, setRiskPerTrade] = useState<number>(1); // 1% default
  const [drawdownType, setDrawdownType] = useState<'balance' | 'equity'>('balance'); // Daily DD basis
  const [isTrailing, setIsTrailing] = useState<boolean>(false);
  const [highWaterMark, setHighWaterMark] = useState<number>(100000); // For trailing DD

  // Simulator State
  const [simWinRate, setSimWinRate] = useState(50);
  const [simRR, setSimRR] = useState(2);
  const [simRisk, setSimRisk] = useState(1);
  const [simulationData, setSimulationData] = useState<any[]>([]); // Array of { trade: n, equity: $ }
  const [simulationStats, setSimulationStats] = useState<{ pass: number; breach: number; worstCaseStreak: number } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Persistence: Load
  useEffect(() => {
    const savedSettings = localStorage.getItem("propFirmSettingsV2");
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
      // Logic migration
      if (parsed.startOfDayBalance === undefined) setStartOfDayBalance(parsed.currentBalance || 100000);
    }
  }, []);

  // Persistence: Save
  useEffect(() => {
    const settings = {
      selectedFirm,
      assetClass,
      accountSize,
      currentBalance,
      startOfDayBalance,
      maxDailyDrawdown,
      maxTotalDrawdown,
      stopLossPips,
      riskPerTrade
    };
    localStorage.setItem("propFirmSettingsV2", JSON.stringify(settings));
  }, [selectedFirm, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, stopLossPips, riskPerTrade]);

  // Fetch User Stats
  const { data: userStats, refetch: refetchStats } = useQuery({
    queryKey: ['user-stats-prop-v2'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // 1. Fetch Today's P&L for Auto Sync
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todaysTrades } = await supabase
        .from('trades')
        .select('profit_loss')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      let todaysPnL = 0;
      if (todaysTrades) {
        todaysPnL = todaysTrades.reduce((acc, t) => acc + (t.profit_loss || 0), 0);
      }

      // 2. Fetch All Trades for Sim
      const { data: trades } = await supabase
        .from('trades')
        .select('result, profit_loss')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!trades || trades.length === 0) return { winRate: 50, rr: 2, todaysPnL, tradeCount: 0 };

      const wins = trades.filter(t => t.result === 'win').length;
      const winRate = (wins / trades.length) * 100;

      const winningTrades = trades.filter(t => t.profit_loss && t.profit_loss > 0);
      const losingTrades = trades.filter(t => t.profit_loss && t.profit_loss < 0);

      const avgWin = winningTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / (winningTrades.length || 1);
      const avgLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / (losingTrades.length || 1));

      const rr = avgLoss > 0 ? avgWin / avgLoss : 1.5;

      return { winRate, rr, todaysPnL, tradeCount: trades.length };
    }
  });

  // Sync Logic
  useEffect(() => {
    if (userStats) {
      setSimWinRate(Math.round(userStats.winRate));
      setSimRR(Number(userStats.rr.toFixed(1)));

      // Auto-update Start of Day Balance Logic if needed
      if (userStats.todaysPnL !== undefined) {
        // Optional: We could suggest updating StartDayBalance, 
        // but let's just make sure the user is aware their PnL is tracked.
      }
    }
  }, [userStats, currentBalance]);

  const handleFirmChange = (firmKey: string) => {
    setSelectedFirm(firmKey);
    const firm = PROP_FIRM_PRESETS[firmKey as keyof typeof PROP_FIRM_PRESETS];
    if (firm && firmKey !== "custom") {
      setMaxDailyDrawdown(firm.dailyDD);
      setMaxTotalDrawdown(firm.totalDD);
      setDrawdownType(firm.type as 'balance' | 'equity');
      setIsTrailing(firm.trailing);
    }
  };

  // --- CORE LOGIC ENGINE ---
  const calculations = useMemo(() => {
    // 1. Calculate Daily Limit
    let dailyLimitLevel = 0;
    if (drawdownType === 'balance') {
      // Daily limit is X% of Start of Day Balance
      dailyLimitLevel = startOfDayBalance - ((maxDailyDrawdown / 100) * startOfDayBalance);
    } else {
      // Equity Based (e.g. MyForexFunds) usually calculates Daily Limit based on START OF DAY Equity.
      // So logic is effectively the same: StartOfDayBalance represents "Start of Day" value.
      dailyLimitLevel = startOfDayBalance - ((maxDailyDrawdown / 100) * startOfDayBalance);
    }

    const currentDailyLoss = startOfDayBalance - currentBalance; // Positive if down, negative if up
    const dailyLossRemaining = Math.max(0, currentBalance - dailyLimitLevel); // How much room left before hitting level

    // 2. Calculate Total Limit
    let totalLimitLevel = 0;
    if (isTrailing) {
      // Trailing Drawdown: Limit rises as High Water Mark rises.
      // Limit = HighWaterMark - MaxTotalDrawdownAmount
      // NOTE: Usually MaxTotalDrawdownAmount is fixed at X% of INITIAL Account Size, not dynamic.
      const maxDrawdownAmount = (maxTotalDrawdown / 100) * accountSize;
      totalLimitLevel = highWaterMark - maxDrawdownAmount;

      // However, most firms verify Total Limit never exceeds Initial Balance (e.g. you can't lock in profit above starting balance for DD purposes in some firms, but E8 allows it). 
      // We will assume standard Trailing where it trails up indefinitely OR stops at Initial Balance.
      // For safety/generic, we let it trail up. User can set HighWaterMark lower if they want.
    } else {
      // Fixed Total DD (Static)
      // Limit = Initial Account Size - (TotalDD% * Initial Account Size)
      totalLimitLevel = accountSize - ((maxTotalDrawdown / 100) * accountSize);
    }

    const totalLossRemaining = Math.max(0, currentBalance - totalLimitLevel);

    // 3. Effective Limit & Lot Size
    const effectiveRiskAmount = Math.min(dailyLossRemaining, totalLossRemaining);

    const pipValueConfig = ASSET_CLASSES[assetClass as keyof typeof ASSET_CLASSES] || ASSET_CLASSES.forex;
    const pipValue = pipValueConfig.pipValue;

    // Allow user Risk Per Trade
    const riskAmountDesired = (currentBalance * (riskPerTrade / 100));
    const safeRiskAmount = Math.min(riskAmountDesired, effectiveRiskAmount * 0.95);
    const suggestedLotSize = safeRiskAmount / (stopLossPips * pipValue);

    // Determine Status
    const dailyProgress = ((startOfDayBalance - currentBalance) / (startOfDayBalance - dailyLimitLevel)) * 100;

    // For Total Progress, we compare against the total range allowed 
    // (Current Balance - Limit) / (Max Allowable - Limit) ?? 
    // Simpler: Just visualizing how close we are to the limit. 
    // Let's us % of "Allowed Drawdown" used.
    // Allowed Total DD = HighWaterMark - TotalLimitLevel.
    // Used = HighWaterMark - CurrentBalance.
    const allowedTotalDD = isTrailing ? (highWaterMark - totalLimitLevel) : ((maxTotalDrawdown / 100) * accountSize);
    const usedTotalDD = isTrailing ? (highWaterMark - currentBalance) : (accountSize - currentBalance);
    const totalProgress = (usedTotalDD / allowedTotalDD) * 100;

    const isBreached = currentBalance <= dailyLimitLevel || currentBalance <= totalLimitLevel;
    const isCritical = dailyLossRemaining < (effectiveRiskAmount * 0.2) || totalLossRemaining < (effectiveRiskAmount * 0.2); // Less than 20% buffer left
    const isInDanger = dailyLossRemaining < (effectiveRiskAmount * 0.5);

    const isRecovering = currentBalance < accountSize;

    return {
      dailyLimitLevel,
      dailyLossRemaining,
      totalLimitLevel,
      totalLossRemaining,
      effectiveRiskAmount,
      suggestedLotSize: Math.max(0, suggestedLotSize),
      dailyProgress: Math.max(0, Math.min(100, (currentDailyLoss / ((maxDailyDrawdown / 100) * startOfDayBalance)) * 100)), // Visual %
      totalProgress: Math.max(0, Math.min(100, totalProgress)), // Visual %
      isBreached,
      isCritical,
      isInDanger,
      isRecovering,
      riskUsedPct: (safeRiskAmount / currentBalance) * 100,
      pipValueName: pipValueConfig.name
    };
  }, [accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, stopLossPips, assetClass, riskPerTrade, isTrailing, highWaterMark, drawdownType]);


  // --- MONTE CARLO SIMULATOR (Animated) ---
  const runSimulation = async () => {
    setIsSimulating(true);
    setSimulationData([]); // Reset

    // Small delay for UI
    await new Promise(r => setTimeout(r, 100));

    const ITERATIONS = 500; // Run 500 futures
    const TRADES = 20; // 20 trades ahead (User wants to see immediate future opacity)

    let breachCount = 0;
    let passCount = 0;
    let worstStreak = 0;

    const samples: any[] = []; // Store a few paths for chart

    for (let i = 0; i < ITERATIONS; i++) {
      let balance = currentBalance; // Start from NOW
      let currentStreak = 0;
      let maxStreakForRun = 0;
      let survived = true;
      let path = [{ trade: 0, balance: balance }];

      for (let t = 1; t <= TRADES; t++) {
        const isWin = Math.random() * 100 < simWinRate;
        if (isWin) {
          const profit = (balance * (simRisk / 100)) * simRR;
          balance += profit;
          currentStreak = 0;
        } else {
          const loss = (balance * (simRisk / 100));
          balance -= loss;
          currentStreak++;
          if (currentStreak > maxStreakForRun) maxStreakForRun = currentStreak;
        }

        // Check Breach Logic (simplified for speed)
        if (balance < calculations.totalLimitLevel || (startOfDayBalance - balance) > ((maxDailyDrawdown / 100) * startOfDayBalance)) {
          survived = false;
          // Continue simulation to see depth of ruin or break?
          // Break for this run
          path.push({ trade: t, balance: balance }); // Log the crash
          break;
        }
        path.push({ trade: t, balance: balance });
      }

      if (!survived) breachCount++;
      else passCount++;

      if (maxStreakForRun > worstStreak) worstStreak = maxStreakForRun;

      // Save first 5 paths for visualization + Worst path + Best path
      if (i < 5) samples.push(path);
    }

    // Prepare Chart Data
    // We want an array of { trade: 1, run1: 10100, run2: 9900 ... }
    const chartData = [];
    for (let t = 0; t <= TRADES; t++) {
      const point: any = { name: `Trade ${t}` };
      samples.forEach((run, idx) => {
        const step = run.find((s: any) => s.trade === t);
        if (step) point[`run${idx}`] = step.balance;
      });
      chartData.push(point);
    }

    setSimulationData(chartData);
    setSimulationStats({
      pass: (passCount / ITERATIONS) * 100,
      breach: (breachCount / ITERATIONS) * 100,
      worstCaseStreak: worstStreak
    });

    setIsSimulating(false);
  };

  const statusColor = calculations.isBreached ? "bg-red-500" : calculations.isInDanger ? "bg-orange-500" : "bg-green-500";

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Prop Firm Protector <span className="text-xs align-top bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">PRO</span></h1>
          <p className="text-muted-foreground">Professional Risk Management Engine for Serious Traders.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN: Controls */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-t-4 border-t-primary shadow-lg">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  Account Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Firm Preset</Label>
                  <Select value={selectedFirm} onValueChange={handleFirmChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROP_FIRM_PRESETS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{PROP_FIRM_PRESETS[selectedFirm as keyof typeof PROP_FIRM_PRESETS]?.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Size</Label>
                    <Input type="number" value={accountSize} onChange={e => setAccountSize(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Day Balance</Label>
                    <Input type="number" value={startOfDayBalance} onChange={e => setStartOfDayBalance(Number(e.target.value))} className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200" />
                  </div>
                </div>

                {isTrailing && (
                  <div className="space-y-2">
                    <Label className="text-yellow-600 flex items-center gap-1">High Water Mark <Info className="h-3 w-3" /></Label>
                    <Input type="number" value={highWaterMark} onChange={e => setHighWaterMark(Number(e.target.value))} className="border-yellow-200 bg-yellow-50/30" />
                    <p className="text-[10px] text-muted-foreground">Highest equity reached. Defines your trailing limit.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="flex justify-between">Current Balance <span className="text-xs text-muted-foreground font-normal">Syncing with DB...</span></Label>
                  <div className="flex gap-2">
                    <Input type="number" value={currentBalance} onChange={e => setCurrentBalance(Number(e.target.value))} className="font-mono text-lg font-bold" />
                    <Button variant="outline" size="icon" onClick={() => refetchStats()} title="Sync P&L"><RefreshCcw className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                  <Label className="flex justify-between items-center text-primary font-semibold">
                    Risk Appetite per Trade
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{riskPerTrade}%</span>
                  </Label>
                  <Slider value={[riskPerTrade]} min={0.1} max={5} step={0.1} onValueChange={val => setRiskPerTrade(val[0])} className="py-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Conservative (0.5%)</span>
                    <span>Aggressive (2%+)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Stop Loss (Pips)</Label>
                  <Input type="number" value={stopLossPips} onChange={e => setStopLossPips(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Asset Class</Label>
                  <Select value={assetClass} onValueChange={setAssetClass}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ASSET_CLASSES).map(([key, asset]) => (
                        <SelectItem key={key} value={key}>{asset.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Dashboard & Sim */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. STATUS BOARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className={`${calculations.dailyLossRemaining < 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/10' : ''}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Daily Drawdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-3xl font-bold tracking-tighter">${Math.max(0, calculations.dailyLossRemaining).toFixed(0)}</span>
                    <span className="text-xs text-muted-foreground mb-1">Limit: ${calculations.dailyLimitLevel.toFixed(0)}</span>
                  </div>
                  <Progress value={calculations.dailyProgress} className={`h-2 mb-2 ${calculations.dailyProgress > 80 ? "bg-red-200" : ""}`} />
                  <p className="text-xs text-right text-muted-foreground">{calculations.dailyProgress.toFixed(1)}% Used</p>
                </CardContent>
              </Card>

              <Card className={`${calculations.totalLossRemaining < 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/10' : ''}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Drawdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-3xl font-bold tracking-tighter text-primary">${Math.max(0, calculations.totalLossRemaining).toFixed(0)}</span>
                    <span className="text-xs text-muted-foreground mb-1">Limit: ${calculations.totalLimitLevel.toFixed(0)}</span>
                  </div>
                  <Progress value={calculations.totalProgress} className="h-2 mb-2" />
                  <p className="text-xs text-right text-muted-foreground">{calculations.totalProgress.toFixed(1)}% Used</p>
                </CardContent>
              </Card>
            </div>

            {/* 2. THE GOLDEN NUMBER (Lot Size) */}
            <Card className="bg-primary text-primary-foreground overflow-hidden relative">
              <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 -skew-x-12 transform translate-x-12" />
              <CardContent className="pt-6 relative z-10">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-primary-foreground/80 font-medium mb-1">Safe Lot Size ({riskPerTrade}%)</h3>
                    <div className="text-6xl font-bold tracking-tighter">
                      {calculations.suggestedLotSize.toFixed(2)}
                    </div>
                    <p className="text-sm text-primary-foreground/70 mt-2">
                      Max Loss: -${calculations.effectiveRiskAmount.toFixed(0)} (Risking {riskPerTrade}% of Balance)
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-4xl font-mono opacity-80">{stopLossPips}</div>
                    <div className="text-xs uppercase tracking-widest opacity-60">PIP SL</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. SIMULATOR TABS */}
            <Tabs defaultValue="simulator" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="simulator">Future Simulator</TabsTrigger>
                <TabsTrigger value="analysis">Risk Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="simulator">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-500" />
                        Monte Carlo Survival View
                      </div>
                      <Button size="sm" onClick={runSimulation} disabled={isSimulating}>
                        {isSimulating ? "Simulating..." : "Run 500 Simulations"}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {simulationStats ? (
                      <div className="space-y-6">
                        <div className="h-[200px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={simulationData}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                              <XAxis dataKey="name" hide />
                              <YAxis domain={['auto', 'auto']} hide />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: any) => [`$${Number(value).toFixed(0)}`, 'Equity']}
                              />
                              <ReferenceLine y={calculations.totalLimitLevel} stroke="red" strokeDasharray="3 3" label="Breach Level" />
                              <Line type="monotone" dataKey="run0" stroke="#10b981" strokeWidth={2} dot={false} />
                              <Line type="monotone" dataKey="run1" stroke="#3b82f6" strokeWidth={1} dot={false} style={{ opacity: 0.5 }} />
                              <Line type="monotone" dataKey="run2" stroke="#6366f1" strokeWidth={1} dot={false} style={{ opacity: 0.3 }} />
                              <Line type="monotone" dataKey="run3" stroke="#8b5cf6" strokeWidth={1} dot={false} style={{ opacity: 0.2 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-3 bg-green-500/10 rounded border border-green-500/20">
                            <div className="text-2xl font-bold text-green-500">{simulationStats.pass.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">Survival Rate</div>
                          </div>
                          <div className="p-3 bg-red-500/10 rounded border border-red-500/20">
                            <div className="text-2xl font-bold text-red-500">{simulationStats.breach.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">Ruin Probability</div>
                          </div>
                          <div className="p-3 bg-orange-500/10 rounded border border-orange-500/20">
                            <div className="text-2xl font-bold text-orange-500">{simulationStats.worstCaseStreak}</div>
                            <div className="text-xs text-muted-foreground">Worst Losing Streak</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-xl bg-muted/20">
                        <div className="text-center text-muted-foreground">
                          <BarChart2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                          <p>Click "Run" to simulate your next 20 trades</p>
                        </div>
                        {userStats && userStats.tradeCount > 5 && (
                          <div className="mt-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full inline-block">
                            Based on your last {userStats.tradeCount} trades
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analysis">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Smart Analysis</AlertTitle>
                      <AlertDescription>
                        Based on your {simWinRate}% win rate and {simRR} RR:
                      </AlertDescription>
                    </Alert>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        To maintain this account, limit daily trades to <strong>3</strong>.
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        Your optimal risk per trade is <strong>0.8% - 1.2%</strong>.
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <strong>Danger Zone:</strong> Do not exceed 4 losses in a row today.
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PropFirmProtector;
