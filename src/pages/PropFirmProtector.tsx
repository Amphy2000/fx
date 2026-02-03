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
import { Shield, AlertTriangle, TrendingDown, Target, DollarSign, Activity, CheckCircle2, XCircle, Info, Zap, Calculator, BarChart2, Coins } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Popular prop firm presets with their rules
const PROP_FIRM_PRESETS = {
  custom: { name: "Custom", dailyDD: 0, totalDD: 0, description: "Enter your own rules" },
  ftmo: { name: "FTMO", dailyDD: 5, totalDD: 10, description: "Most popular prop firm" },
  fundedNext: { name: "Funded Next", dailyDD: 5, totalDD: 10, description: "Fast payouts" },
  myForexFunds: { name: "My Forex Funds", dailyDD: 5, totalDD: 12, description: "Flexible rules" },
  theForexFunder: { name: "The Funded Trader", dailyDD: 5, totalDD: 10, description: "Multiple account sizes" },
  e8Funding: { name: "E8 Funding", dailyDD: 5, totalDD: 8, description: "Strict but fair" },
  trueForexFunds: { name: "True Forex Funds", dailyDD: 5, totalDD: 10, description: "Good for beginners" },
  topTierTrader: { name: "Top Tier Trader", dailyDD: 3, totalDD: 6, description: "Very strict rules" },
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
  const [accountSize, setAccountSize] = useState<number>(100000);
  const [currentBalance, setCurrentBalance] = useState<number>(100000);
  const [maxDailyDrawdown, setMaxDailyDrawdown] = useState<number>(5);
  const [maxTotalDrawdown, setMaxTotalDrawdown] = useState<number>(10);
  const [stopLossPips, setStopLossPips] = useState<number>(20);
  const [todaysLoss, setTodaysLoss] = useState<number>(0);

  // Simulator State
  const [simWinRate, setSimWinRate] = useState(50);
  const [simRR, setSimRR] = useState(2);
  const [simRisk, setSimRisk] = useState(1);
  const [simulationResult, setSimulationResult] = useState<{ pass: number; breach: number } | null>(null);

  // Persistence: Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("propFirmSettings");
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSelectedFirm(parsed.selectedFirm || "ftmo");
      setAssetClass(parsed.assetClass || "forex");
      setAccountSize(parsed.accountSize || 100000);
      setCurrentBalance(parsed.currentBalance || 100000);
      setMaxDailyDrawdown(parsed.maxDailyDrawdown || 5);
      setMaxTotalDrawdown(parsed.maxTotalDrawdown || 10);
      setStopLossPips(parsed.stopLossPips || 20);
      // We don't load todaysLoss here blindly, we prefer the DB sync, but we can fallback
      if (parsed.todaysLoss !== undefined) setTodaysLoss(parsed.todaysLoss);
    }
  }, []);

  // Persistence: Save settings on change
  useEffect(() => {
    const settings = {
      selectedFirm,
      assetClass,
      accountSize,
      currentBalance,
      maxDailyDrawdown,
      maxTotalDrawdown,
      stopLossPips,
      todaysLoss // Save it too
    };
    localStorage.setItem("propFirmSettings", JSON.stringify(settings));
  }, [selectedFirm, assetClass, accountSize, currentBalance, maxDailyDrawdown, maxTotalDrawdown, stopLossPips, todaysLoss]);

  // Fetch User Stats & TODAY'S P&L
  const { data: userStats } = useQuery({
    queryKey: ['user-stats-prop'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // 1. Fetch Today's Trades for Daily Loss Sync
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todaysTrades } = await supabase
        .from('trades')
        .select('profit_loss')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      let diffInfo = null;
      if (todaysTrades) {
        const netPnL = todaysTrades.reduce((acc, t) => acc + (t.profit_loss || 0), 0);
        const calculatedLoss = -netPnL; // Negative P&L = Positive Loss
        diffInfo = calculatedLoss;
      }

      // 2. Fetch All Trades for Simulator Stats
      const { data: trades } = await supabase
        .from('trades')
        .select('result, profit_loss')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!trades || trades.length === 0) return { winRate: 50, rr: 2, todayLossCalc: diffInfo };

      const wins = trades.filter(t => t.result === 'win').length;
      const winRate = (wins / trades.length) * 100;

      const winningTrades = trades.filter(t => t.profit_loss && t.profit_loss > 0);
      const losingTrades = trades.filter(t => t.profit_loss && t.profit_loss < 0);

      const avgWin = winningTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / (winningTrades.length || 1);
      const avgLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / (losingTrades.length || 1));

      const rr = avgLoss > 0 ? avgWin / avgLoss : 1.5;

      return { winRate, rr, todayLossCalc: diffInfo };
    }
  });

  // Sync state with Fetched Data
  useEffect(() => {
    if (userStats) {
      setSimWinRate(Math.round(userStats.winRate));
      setSimRR(Number(userStats.rr.toFixed(1)));

      // Auto-update todaysLoss from DB if available
      if (userStats.todayLossCalc !== null && userStats.todayLossCalc !== undefined) {
        setTodaysLoss(userStats.todayLossCalc);
      }
    }
  }, [userStats]);

  // When firm changes, update the DD values
  const handleFirmChange = (firmKey: string) => {
    setSelectedFirm(firmKey);
    const firm = PROP_FIRM_PRESETS[firmKey as keyof typeof PROP_FIRM_PRESETS];
    if (firm && firmKey !== "custom") {
      setMaxDailyDrawdown(firm.dailyDD);
      setMaxTotalDrawdown(firm.totalDD);
    }
  };

  const calculations = useMemo(() => {
    // Daily drawdown is calculated from starting balance of the day (account size for simplicity in this MVP)
    // NOTE: In real prop firms, daily DD often resets at 5PM EST relative to EQUITY or BALANCE.
    // We assume 'accountSize' here acts as the 'Daily Starting Balance'.
    const dailyLossLimit = (maxDailyDrawdown / 100) * accountSize;
    const dailyLossRemaining = Math.max(0, dailyLossLimit - todaysLoss);

    // Total drawdown from initial account size
    const totalLossLimit = (maxTotalDrawdown / 100) * accountSize;
    const totalLossUsed = accountSize - currentBalance;
    const totalLossRemaining = Math.max(0, totalLossLimit - totalLossUsed);

    // The effective limit is whichever is smaller
    const effectiveLossRemaining = Math.min(dailyLossRemaining, totalLossRemaining);
    const isLimitedByDaily = dailyLossRemaining <= totalLossRemaining;

    const dailyProgress = (todaysLoss / dailyLossLimit) * 100;
    const totalProgress = (totalLossUsed / totalLossLimit) * 100;

    // Risk status
    const isInDanger = dailyProgress >= 70 || totalProgress >= 70;
    const isCritical = dailyProgress >= 90 || totalProgress >= 90;
    const isBreached = dailyProgress >= 100 || totalProgress >= 100;

    // Recovery mode
    const isInRecovery = currentBalance < accountSize;
    const recoveryNeeded = accountSize - currentBalance;
    const recoveryPercent = ((accountSize - currentBalance) / accountSize) * 100;

    // Lot size calculation
    const pipValueConfig = ASSET_CLASSES[assetClass as keyof typeof ASSET_CLASSES] || ASSET_CLASSES.forex;
    const pipValue = pipValueConfig.pipValue;

    const maxLotSize = effectiveLossRemaining / (stopLossPips * pipValue);

    // Conservative risk suggestions based on status
    let suggestedRiskPercent = 1;

    if (isBreached) {
      suggestedRiskPercent = 0;
    } else if (isCritical) {
      suggestedRiskPercent = 0.25;
    } else if (isInDanger) {
      suggestedRiskPercent = 0.5;
    } else if (isInRecovery) {
      suggestedRiskPercent = 0.5;
    } else {
      suggestedRiskPercent = 1;
    }

    const suggestedLotSize = (currentBalance * (suggestedRiskPercent / 100)) / (stopLossPips * pipValue);

    // Number of trades possible at suggested risk
    const tradesRemaining = effectiveLossRemaining / (suggestedLotSize * stopLossPips * pipValue);

    return {
      dailyLossLimit,
      dailyLossRemaining,
      totalLossLimit,
      totalLossUsed,
      totalLossRemaining,
      effectiveLossRemaining,
      isLimitedByDaily,
      dailyProgress,
      totalProgress,
      isInDanger,
      isCritical,
      isBreached,
      isInRecovery,
      recoveryNeeded,
      recoveryPercent,
      maxLotSize,
      suggestedRiskPercent,
      suggestedLotSize,
      tradesRemaining: isFinite(tradesRemaining) ? tradesRemaining : 0,
      pipValueName: pipValueConfig.name
    };
  }, [accountSize, currentBalance, maxDailyDrawdown, maxTotalDrawdown, stopLossPips, todaysLoss, assetClass]);

  const runSimulation = () => {
    let breachCount = 0;
    let passCount = 0; // "Pass" here is simpler: survive 50 trades without breach? Or hit target?
    // Let's assume hitting +10% is passing.

    const ITERATIONS = 1000;
    const TRADES_PER_CHALLENGE = 50;

    for (let i = 0; i < ITERATIONS; i++) {
      let balance = accountSize;
      let equityHigh = accountSize; // For trailing drawdown if needed (keeping simple for now)
      let failed = false;
      let passed = false;

      for (let t = 0; t < TRADES_PER_CHALLENGE; t++) {
        const isWin = Math.random() * 100 < simWinRate;
        const riskAmount = balance * (simRisk / 100);

        if (isWin) {
          balance += riskAmount * simRR;
        } else {
          balance -= riskAmount;
        }

        // Check Max Total Drawdown
        if (balance <= accountSize * (1 - maxTotalDrawdown / 100)) {
          failed = true;
          break;
        }

        // Check Profit Target (Typical 10%)
        if (balance >= accountSize * 1.10) {
          passed = true; // Optimization: We could stop here, or continue to see if they blow it later?
          // Prop firm rules usually stop once you hit target. This is generous.
          break;
        }
      }

      if (failed) breachCount++;
      else if (passed) passCount++;
    }

    setSimulationResult({
      pass: (passCount / ITERATIONS) * 100,
      breach: (breachCount / ITERATIONS) * 100
    });
  };

  const getStatusColor = () => {
    if (calculations.isBreached) return "bg-red-500";
    if (calculations.isCritical) return "bg-red-400";
    if (calculations.isInDanger) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${getStatusColor()} shadow-lg`}>
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Prop Firm Protector</h1>
              <p className="text-muted-foreground">Advanced Risk Guard & Simulator</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1 h-8 text-sm">
              {userStats ? `Real Win Rate: ${userStats.winRate.toFixed(1)}%` : "Log trades to see real stats"}
            </Badge>
          </div>
        </div>

        {/* Breach Alert */}
        {calculations.isBreached && (
          <Alert variant="destructive" className="animate-pulse border-2 border-red-600">
            <XCircle className="h-5 w-5" />
            <AlertTitle className="text-lg font-bold">⚠️ STOP TRADING NOW!</AlertTitle>
            <AlertDescription className="text-base font-semibold">
              Prop Firm Violation Detected. Trading now will result in account termination.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="calculator">Risk Calculator</TabsTrigger>
            <TabsTrigger value="simulator">Survival Simulator</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-6 mt-4">
            {/* Inputs Section */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-primary" />
                  Account Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Prop Firm</Label>
                    <Select value={selectedFirm} onValueChange={handleFirmChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Firm" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(PROP_FIRM_PRESETS).map(([key, firm]) => (
                          <SelectItem key={key} value={key}>
                            <span>{firm.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">
                              (Max DD: {firm.totalDD}%)
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Asset Class (For Lot Size)</Label>
                    <Select value={assetClass} onValueChange={setAssetClass}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ASSET_CLASSES).map(([key, asset]) => (
                          <SelectItem key={key} value={key}>{asset.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Account Size</Label>
                    <div className="flex gap-1 flex-wrap">
                      {ACCOUNT_SIZE_PRESETS.slice(0, 4).map((preset) => (
                        <Badge
                          key={preset.value}
                          variant={accountSize === preset.value ? "default" : "secondary"}
                          className="cursor-pointer transition-all hover:scale-105"
                          onClick={() => {
                            setAccountSize(preset.value);
                            if (currentBalance === accountSize || currentBalance > preset.value) {
                              setCurrentBalance(preset.value);
                            }
                          }}
                        >
                          {preset.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {selectedFirm === "custom" && (
                    <>
                      <div className="space-y-2">
                        <Label>Max Daily DD (%)</Label>
                        <Input type="number" value={maxDailyDrawdown} onChange={e => setMaxDailyDrawdown(Number(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Total DD (%)</Label>
                        <Input type="number" value={maxTotalDrawdown} onChange={e => setMaxTotalDrawdown(Number(e.target.value))} />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Current Equity ($)</Label>
                    <Input
                      type="number"
                      className="font-mono"
                      value={currentBalance}
                      onChange={e => setCurrentBalance(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Stop Loss (Pips)</Label>
                    <Input
                      type="number"
                      className="font-mono"
                      value={stopLossPips}
                      onChange={e => setStopLossPips(Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className={calculations.dailyProgress >= 70 ? "border-yellow-500 shadow-md" : "shadow-sm"}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Daily Limit</CardTitle>
                    <span className="font-mono font-bold text-lg">${calculations.dailyLossRemaining.toFixed(0)}</span>
                  </div>
                  <CardDescription>Risk remaining for today</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={Math.min(calculations.dailyProgress, 100)} className={`h-3 ${calculations.dailyProgress > 80 ? "bg-red-100" : ""}`} />
                  <p className="text-xs text-right text-muted-foreground">{calculations.dailyProgress.toFixed(1)}% Used</p>
                </CardContent>
              </Card>

              <Card className={calculations.totalProgress >= 70 ? "border-yellow-500 shadow-md" : "shadow-sm"}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Total Limit</CardTitle>
                    <span className="font-mono font-bold text-lg text-primary">${calculations.totalLossRemaining.toFixed(0)}</span>
                  </div>
                  <CardDescription>buffer from account breach</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={Math.min(calculations.totalProgress, 100)} className="h-3" />
                  <p className="text-xs text-right text-muted-foreground">{calculations.totalProgress.toFixed(1)}% Used</p>
                </CardContent>
              </Card>
            </div>

            {/* Safe Zone Result */}
            <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left space-y-1">
                    <h3 className="text-lg font-medium text-muted-foreground">Recommended Lot Size</h3>
                    <div className="text-5xl font-bold tracking-tighter text-foreground">
                      {calculations.suggestedLotSize.toFixed(2)}
                    </div>
                    <p className="text-sm font-medium text-primary">
                      Safe for {calculations.pipValueName}
                    </p>
                  </div>

                  <div className="flex gap-8 text-center">
                    <div>
                      <div className="text-2xl font-bold font-mono">
                        {Math.floor(calculations.tradesRemaining)}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Trades Left</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-mono">
                        {calculations.suggestedRiskPercent}%
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Risk Level</div>
                    </div>
                  </div>
                </div>

                {calculations.isInRecovery && (
                  <Alert className="mt-6 border-yellow-500 bg-yellow-500/10">
                    <TrendingDown className="h-4 w-4 text-yellow-500" />
                    <AlertTitle className="text-yellow-500 font-bold">Recovery Mode Active</AlertTitle>
                    <AlertDescription>
                      You are down {calculations.recoveryPercent.toFixed(1)}%. Risk has been automatically reduced to preserve capital.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulator" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-purple-500" />
                  Monte Carlo Survival Simulator
                </CardTitle>
                <CardDescription>
                  Simulates 1000 challenge attempts based on your trading stats to see if you'll pass or blow up.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Win Rate (%)</Label>
                      <div className="flex items-center gap-4">
                        <Slider value={[simWinRate]} min={10} max={90} step={1} onValueChange={v => setSimWinRate(v[0])} className="flex-1" />
                        <span className="w-12 font-mono text-right">{simWinRate}%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Risk Per Trade (%)</Label>
                      <div className="flex items-center gap-4">
                        <Slider value={[simRisk]} min={0.1} max={5} step={0.1} onValueChange={v => setSimRisk(v[0])} className="flex-1" />
                        <span className="w-12 font-mono text-right">{simRisk}%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Reward:Risk Ratio</Label>
                      <div className="flex items-center gap-4">
                        <Slider value={[simRR]} min={0.5} max={10} step={0.1} onValueChange={v => setSimRR(v[0])} className="flex-1" />
                        <span className="w-12 font-mono text-right">{simRR}:1</span>
                      </div>
                    </div>
                    <Button onClick={runSimulation} className="w-full gap-2">
                      <BarChart2 className="h-4 w-4" />
                      Run Simulation
                    </Button>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-center p-6 bg-muted/20 rounded-xl border-2 border-dashed">
                    {simulationResult ? (
                      <div className="text-center space-y-6 w-full">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                            <div className="text-sm font-medium text-green-600 mb-1">Pass Probability</div>
                            <div className="text-4xl font-bold text-green-500">{simulationResult.pass.toFixed(1)}%</div>
                          </div>
                          <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                            <div className="text-sm font-medium text-red-600 mb-1">Blow-up Probability</div>
                            <div className="text-4xl font-bold text-red-500">{simulationResult.breach.toFixed(1)}%</div>
                          </div>
                        </div>

                        <div className="text-left text-sm bg-background p-4 rounded-lg border">
                          <p className="font-semibold mb-2 flex items-center gap-2">
                            <Info className="h-4 w-4 text-primary" />
                            Simulation Analysis
                          </p>
                          <ul className="space-y-1 text-muted-foreground list-disc pl-4">
                            {simulationResult.breach > 50 && (
                              <li className="text-red-500">
                                <strong>High Risk:</strong> You are more likely to blow this account than pass.
                                Decrease risk to {(simRisk / 2).toFixed(1)}% immediately.
                              </li>
                            )}
                            {simulationResult.pass > 80 && (
                              <li className="text-green-500">
                                <strong>Great Odds:</strong> Your stats are solid for this challenge. Stick to your plan.
                              </li>
                            )}
                            {simWinRate < 40 && simRR < 1.5 && (
                              <li>Your Win Rate and RR are difficult to sustain. Focus on A+ setups.</li>
                            )}
                            <li>Simulated 1000 attempts of 50 trades each.</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Coins className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>Adjust settings and click Run Simulation</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </Layout>
  );
};

export default PropFirmProtector;
