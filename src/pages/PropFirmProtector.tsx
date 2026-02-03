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
import { Shield, TrendingDown, Target, Activity, XCircle, Info, Zap, Calculator, BarChart2, Coins, Settings2, RefreshCcw, AlertTriangle } from "lucide-react";
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
  /* ... inside component ... */
  // New State for Objectives
  const [profitTarget, setProfitTarget] = useState<number>(110000); // e.g. 10% target
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false); // Tilt breaker

  // Persistence Update (add these to settings object if desired, or let them be session based)
  // For now, let's persist profitTarget but maybe not recovery mode (reset on reload is safer?)
  useEffect(() => {
    // ... existing load logic
    // const savedSettings = ...
    // setProfitTarget(parsed.profitTarget || 110000);
  }, []);

  /* ... update calculations ... */
  const calculations = useMemo(() => {
    // ... existing daily/total limit logic ...
    // [Use existing code from lines 181-213]
    // 1. Calculate Daily Limit
    let dailyLimitLevel = 0;
    if (drawdownType === 'balance') {
      dailyLimitLevel = startOfDayBalance - ((maxDailyDrawdown / 100) * startOfDayBalance);
    } else {
      dailyLimitLevel = startOfDayBalance - ((maxDailyDrawdown / 100) * startOfDayBalance);
    }

    const currentDailyLoss = startOfDayBalance - currentBalance;
    const dailyLossRemaining = Math.max(0, currentBalance - dailyLimitLevel);

    // 2. Calculate Total Limit
    let totalLimitLevel = 0;
    if (isTrailing) {
      const maxDrawdownAmount = (maxTotalDrawdown / 100) * accountSize;
      totalLimitLevel = highWaterMark - maxDrawdownAmount;
    } else {
      totalLimitLevel = accountSize - ((maxTotalDrawdown / 100) * accountSize);
    }

    const totalLossRemaining = Math.max(0, currentBalance - totalLimitLevel);

    // 3. Effective Limit & Lot Size
    const effectiveRiskAmount = Math.min(dailyLossRemaining, totalLossRemaining);

    const pipValueConfig = ASSET_CLASSES[assetClass as keyof typeof ASSET_CLASSES] || ASSET_CLASSES.forex;
    const pipValue = pipValueConfig.pipValue;

    // Allow user Risk Per Trade
    let riskAmountDesired = (currentBalance * (riskPerTrade / 100));

    // RECOVERY MODE LOGIC
    if (isRecoveryMode) {
      riskAmountDesired = riskAmountDesired * 0.5; // Half risk
    }

    const safeRiskAmount = Math.min(riskAmountDesired, effectiveRiskAmount * 0.95);
    const suggestedLotSize = safeRiskAmount / (stopLossPips * pipValue);

    // ... existing status logic ...
    const dailyProgress = ((startOfDayBalance - currentBalance) / (startOfDayBalance - dailyLimitLevel)) * 100;

    const allowedTotalDD = isTrailing ? (highWaterMark - totalLimitLevel) : ((maxTotalDrawdown / 100) * accountSize);
    const usedTotalDD = isTrailing ? (highWaterMark - currentBalance) : (accountSize - currentBalance);
    const totalProgress = (usedTotalDD / allowedTotalDD) * 100;

    const isBreached = currentBalance <= dailyLimitLevel || currentBalance <= totalLimitLevel;
    const isCritical = dailyLossRemaining < (effectiveRiskAmount * 0.2) || totalLossRemaining < (effectiveRiskAmount * 0.2);
    const isInDanger = dailyLossRemaining < (effectiveRiskAmount * 0.5);
    const isRecovering = currentBalance < accountSize;

    // OBJECTIVES LOGIC
    const distanceToTarget = Math.max(0, profitTarget - currentBalance);
    // Approx trades needed = Distance / (RiskAmount * RR)
    // Avg win amount = RiskAmount * simRR
    // But this assumes 100% winrate. With 50% winrate, net profit per trade = (WinAmt * 0.5) - (LossAmt * 0.5).
    // Expected Value per trade = (risk * simRR * (simWinRate/100)) - (risk * (1 - simWinRate/100))
    const riskAmt = safeRiskAmount;
    const evPerTrade = (riskAmt * simRR * (simWinRate / 100)) - (riskAmt * (1 - (simWinRate / 100)));
    const tradesToPass = evPerTrade > 0 ? Math.ceil(distanceToTarget / evPerTrade) : 999;

    return {
      dailyLimitLevel,
      dailyLossRemaining,
      totalLimitLevel,
      totalLossRemaining,
      effectiveRiskAmount,
      suggestedLotSize: Math.max(0, suggestedLotSize),
      dailyProgress: Math.max(0, Math.min(100, (currentDailyLoss / ((maxDailyDrawdown / 100) * startOfDayBalance)) * 100)),
      totalProgress: Math.max(0, Math.min(100, totalProgress)),
      isBreached,
      isCritical,
      isInDanger,
      isRecovering,
      riskUsedPct: (safeRiskAmount / currentBalance) * 100,
      pipValueName: pipValueConfig.name,
      distanceToTarget,
      tradesToPass,
      isRecoveryActive: isRecoveryMode
    };
  }, [accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, stopLossPips, assetClass, riskPerTrade, isTrailing, highWaterMark, drawdownType, isRecoveryMode, profitTarget, simRR, simWinRate]);

  /* ... UI Updates ... */
  // In Dashboard Right Column, add "Objectives" Card above Simulator Tabs?
  // Or inside Analysis Tab?
  // Let's add a compact "Mission Control" bar.



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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Account Size</Label>
                      <Input type="number" value={accountSize} onChange={e => setAccountSize(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-blue-600">Profit Target</Label>
                      <Input
                        type="number"
                        value={profitTarget}
                        onChange={e => setProfitTarget(Number(e.target.value))}
                        className="bg-blue-50/20 border-blue-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-orange-50 dark:bg-orange-950/20 p-2 rounded border border-orange-200">
                      <Label className="text-orange-700 dark:text-orange-400 flex flex-col cursor-pointer" htmlFor="recovery-mode">
                        <span className="font-semibold flex items-center gap-1.5"><Shield className="h-3 w-3" /> Recovery Mode</span>
                        <span className="text-[10px] opacity-80 font-normal">Halves risk to help regain confidence</span>
                      </Label>
                      <Switch
                        id="recovery-mode"
                        checked={isRecoveryMode}
                        onCheckedChange={setIsRecoveryMode}
                      />
                    </div>
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
            <Card className={`bg-primary text-primary-foreground overflow-hidden relative ${isRecoveryMode ? 'bg-orange-600' : ''}`}>
              {isRecoveryMode && <div className="absolute top-0 left-0 w-full bg-orange-800 text-white text-[10px] text-center font-bold tracking-widest uppercase py-0.5 z-20">Recovery Mode Active</div>}
              <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 -skew-x-12 transform translate-x-12" />
              <CardContent className="pt-6 relative z-10">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-primary-foreground/80 font-medium mb-1 flex items-center gap-2">
                      Safe Lot Size ({isRecoveryMode ? (riskPerTrade / 2).toFixed(1) : riskPerTrade}%)
                      {isRecoveryMode && <Shield className="h-4 w-4" />}
                    </h3>
                    <div className="text-6xl font-bold tracking-tighter">
                      {calculations.suggestedLotSize.toFixed(2)}
                    </div>
                    <p className="text-sm text-primary-foreground/70 mt-2">
                      Max Loss: -${calculations.effectiveRiskAmount.toFixed(0)}
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-4xl font-mono opacity-80">{stopLossPips}</div>
                    <div className="text-xs uppercase tracking-widest opacity-60">PIP SL</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. MISSION CONTROL Objectives */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="col-span-1 bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/50">
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Target</div>
                  <div className="text-lg font-bold text-blue-600">${profitTarget.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">${Math.max(0, calculations.distanceToTarget).toLocaleString()} away</div>
                </CardContent>
              </Card>
              <Card className="col-span-1 bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/50">
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Trades to Pass</div>
                  <div className="text-lg font-bold text-green-600">{calculations.tradesToPass > 100 ? "100+" : calculations.tradesToPass}</div>
                  <div className="text-[10px] text-muted-foreground">Est. Wins Needed</div>
                </CardContent>
              </Card>
              <Card className="col-span-1 bg-purple-50/50 border-purple-100 dark:bg-purple-900/10 dark:border-purple-900/50">
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Risk Power</div>
                  <div className="text-lg font-bold text-purple-600">{calculations.riskUsedPct.toFixed(1)}%</div>
                  <div className="text-[10px] text-muted-foreground">Of Daily Buffer</div>
                </CardContent>
              </Card>
            </div>

            {/* 3. SIMULATOR TABS */}
            <Tabs defaultValue="simulator" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="simulator">Future Simulator</TabsTrigger>
                <TabsTrigger value="analysis">Risk Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="simulator">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-500" />
                        Monte Carlo Survival View
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">Win Rate %</Label>
                          <Input
                            type="number"
                            className="w-16 h-8 text-xs"
                            value={simWinRate}
                            onChange={(e) => setSimWinRate(Number(e.target.value))}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">R:R</Label>
                          <Input
                            type="number"
                            className="w-16 h-8 text-xs"
                            value={simRR}
                            onChange={(e) => setSimRR(Number(e.target.value))}
                          />
                        </div>
                        <Button size="sm" onClick={runSimulation} disabled={isSimulating}>
                          {isSimulating ? "Simulating..." : "Run Sim"}
                        </Button>
                      </div>
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
                          <p>Ready to Simulate</p>
                          <p className="text-xs opacity-70 mt-1">Adjust Win Rate & RR above to test scenarios</p>
                        </div>
                        {userStats && userStats.tradeCount > 0 && (
                          <div className="absolute bottom-4 right-4 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            Auto-synced from {userStats.tradeCount} trades
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
                    <Alert variant={simulationStats && simulationStats.pass < 50 ? "destructive" : "default"}>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Honest Assessment</AlertTitle>
                      <AlertDescription>
                        {simulationStats ? (
                          simulationStats.pass < 50
                            ? "CRITICAL WARNING: Based on these stats, you are statistically likely to fail this challenge. You must improve Win Rate or RR before continuing."
                            : simulationStats.pass < 80
                              ? "CAUTION: Your strategy has an edge, but a bad streak could still wipe you out. Lower your risk per trade."
                              : "EXCELLENT: You have a strong statistical edge. Stick to the plan and don't over-leverage."
                        ) : "Run the simulator to get a statistical assessment."}
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Recommendations</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {riskPerTrade > 2 && (
                          <li className="flex items-start gap-2 text-red-500">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span><strong>High Risk Warning:</strong> Risking {riskPerTrade}% per trade is very aggressive for a prop firm. Recommended: 0.5% - 1%.</span>
                          </li>
                        )}
                        {simWinRate < 40 && simRR < 2 && (
                          <li className="flex items-start gap-2 text-orange-500">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span><strong>Negative Expectancy:</strong> A {simWinRate}% win rate with {simRR} RR is hard to sustain. Aim for at least 1:2.5 RR.</span>
                          </li>
                        )}
                        <li className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <span>Based on your daily limit, stop trading if you lose <strong>{Math.floor(calculations.effectiveRiskAmount / (currentBalance * (riskPerTrade / 100)))}</strong> trades in a row today.</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <span>To survive a worst-case streak of {simulationStats?.worstCaseStreak || 8} losses, ensure your buffer is at least <strong>${((simulationStats?.worstCaseStreak || 8) * (currentBalance * (riskPerTrade / 100))).toFixed(0)}</strong>.</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>


            </Tabs >

          </div >
        </div >
      </div >
    </Layout >
  );
};

export default PropFirmProtector;
