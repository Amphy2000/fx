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
import { Shield, Target, Activity, Info, Zap, Settings2, RefreshCcw, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

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

  // Sync with available MT5 accounts
  const { data: mt5Accounts } = useQuery({
    queryKey: ['mt5-accounts-list'],
    queryFn: async () => {
      const { data } = await supabase.from('mt5_accounts').select('id, broker_name, account_number');
      return data || [];
    }
  });

  // Simulator State
  const [simWinRate, setSimWinRate] = useState(50);
  const [simRR, setSimRR] = useState(2);
  const [simulationData, setSimulationData] = useState<any[]>([]);
  const [simulationStats, setSimulationStats] = useState<{ pass: number; breach: number; worstCaseStreak: number } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

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
    }
  }, [currentAccountSlot]);

  // Save persistence
  useEffect(() => {
    const settings = { selectedFirm, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, stopLossPips, riskPerTrade };
    localStorage.setItem(`propFirmSettings_slot_${currentAccountSlot}`, JSON.stringify(settings));
    localStorage.setItem("propFirmAccountNames", JSON.stringify(accountNames));
  }, [currentAccountSlot, selectedFirm, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, stopLossPips, riskPerTrade, accountNames]);

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
      const winRate = trades.length > 0 ? (winCount / (winCount + lossCount || 1)) * 100 : 50;

      return { totalPnL, todayPnL, winRate, tradeCount: trades.length };
    }
  });

  // Apply Sync Stats
  useEffect(() => {
    if (syncStats) {
      setCurrentBalance(accountSize + syncStats.totalPnL);
      setStartOfDayBalance(accountSize + syncStats.totalPnL - syncStats.todayPnL);
      setSimWinRate(Math.round(syncStats.winRate));
    }
  }, [syncStats, accountSize]);

  const addAccountSlot = () => {
    const newNames = [...accountNames, `Account ${accountNames.length + 1}`];
    setAccountNames(newNames);
    setCurrentAccountSlot(newNames.length - 1);
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

    const ITERATIONS = 200;
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
          bal += (bal * (riskPerTrade / 100)) * simRR;
          streak = 0;
        } else {
          bal -= (bal * (riskPerTrade / 100));
          streak++;
          if (streak > worstStreak) worstStreak = streak;
        }
        if (bal < accountSize * (1 - maxTotalDrawdown / 100)) {
          survived = false;
          path.push({ trade: t, balance: bal });
          break;
        }
        path.push({ trade: t, balance: bal });
      }
      if (!survived) breachCount++; else passCount++;
      if (i < 3) samples.push(path);
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
            <p className="text-muted-foreground">The ultimate risk engine for passing challenges.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-1.5 rounded-xl border">
            {accountNames.map((name, idx) => (
              <Button key={idx} variant={currentAccountSlot === idx ? "default" : "ghost"} size="sm" onClick={() => setCurrentAccountSlot(idx)} className="h-8 text-xs">{name}</Button>
            ))}
            <Button variant="outline" size="sm" onClick={addAccountSlot} className="h-8 w-8 p-0"><Zap className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Column */}
          <div className="space-y-6">
            <Card className="border-t-4 border-t-primary shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Settings2 className="h-5 w-5" />Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>MT5 Sync</Label>
                  <Select value={selectedMt5AccountId || "manual"} onValueChange={v => setSelectedMt5AccountId(v === "manual" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Manual" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                      {mt5Accounts?.map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.broker_name} - {acc.account_number}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Firm Preset</Label>
                  <Select value={selectedFirm} onValueChange={handleFirmChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PROP_FIRM_PRESETS).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Account Size</Label><Input type="number" value={accountSize} onChange={e => setAccountSize(Number(e.target.value))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Day Start</Label><Input type="number" value={startOfDayBalance} onChange={e => setStartOfDayBalance(Number(e.target.value))} /></div>
                </div>
                <div className="space-y-2">
                  <Label className="flex justify-between">Current Balance <Button variant="ghost" size="sm" className="h-auto p-0 text-primary" onClick={() => refetchSync()}><RefreshCcw className="h-3 w-3 mr-1" />Sync</Button></Label>
                  <Input type="number" value={currentBalance} onChange={e => setCurrentBalance(Number(e.target.value))} className="font-mono text-lg font-bold" />
                </div>
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <Label className="flex justify-between text-xs font-semibold">Risk Per Trade <span>{riskPerTrade}%</span></Label>
                  <Slider value={[riskPerTrade]} min={0.1} max={3} step={0.1} onValueChange={v => setRiskPerTrade(v[0])} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Stop Loss (Pips)</Label><Input type="number" value={stopLossPips} onChange={e => setStopLossPips(Number(e.target.value))} /></div>
                  <div className="space-y-1">
                    <Label className="text-xs">Asset</Label>
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
              <Card className="bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Daily Remaining</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">${calculations.dailyLossRemaining.toFixed(0)}</div>
                  <Progress value={calculations.dailyProgress} className="h-1.5 mt-3" />
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Total Remaining</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">${calculations.totalLossRemaining.toFixed(0)}</div>
                  <Progress value={calculations.totalProgress} className="h-1.5 mt-3" />
                </CardContent>
              </Card>
            </div>

            <Card className="bg-primary text-primary-foreground border-none">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs uppercase opacity-70">Safe Lot Size</p>
                    <div className="text-7xl font-black">{calculations.suggestedLotSize.toFixed(2)}</div>
                    <p className="text-sm opacity-80 mt-1">Risking ${calculations.effectiveRiskAmount.toFixed(0)} ({riskPerTrade}%)</p>
                  </div>
                  <div className="text-right">
                    <Shield className="h-12 w-12 opacity-20 ml-auto" />
                    <p className="text-xs mt-2 font-mono">STOP LOSS: {stopLossPips} PIPS</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="recovery" className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-12">
                <TabsTrigger value="recovery" className="gap-2"><Target className="h-4 w-4" />Recovery</TabsTrigger>
                <TabsTrigger value="simulator" className="gap-2"><Activity className="h-4 w-4" />Simulator</TabsTrigger>
                <TabsTrigger value="info" className="gap-2"><Info className="h-4 w-4" />Guidance</TabsTrigger>
              </TabsList>

              <TabsContent value="recovery" className="mt-4">
                <Card>
                  <CardHeader><CardTitle className="text-md">Drawdown Recovery Strategy</CardTitle></CardHeader>
                  <CardContent>
                    {currentBalance >= accountSize ? (
                      <div className="py-10 text-center space-y-2">
                        <Zap className="h-10 w-10 mx-auto text-yellow-500" />
                        <h4 className="font-bold">You are in the Green!</h4>
                        <p className="text-sm text-muted-foreground">Keep your current risk. No recovery needed.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <p className="text-xs text-muted-foreground">Target to BE</p>
                            <p className="text-2xl font-bold">${(accountSize - currentBalance).toFixed(0)}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10">
                            <p className="text-xs text-muted-foreground">Breach Buffer</p>
                            <p className="text-2xl font-bold text-destructive">${calculations.totalLossRemaining.toFixed(0)}</p>
                          </div>
                        </div>
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Action Plan</AlertTitle>
                          <AlertDescription className="text-sm">
                            To recover safely, drop risk to <strong>0.5%</strong>. With a 1:3 RR, you need <strong>{Math.ceil((accountSize - currentBalance) / (currentBalance * 0.005 * 3))}</strong> wins to reach Breakeven.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="simulator" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-md">Monte Carlo Survival (20 Trades)</CardTitle>
                    <Button size="sm" onClick={runSimulation} disabled={isSimulating}>{isSimulating ? "Simulating..." : "Run"}</Button>
                  </CardHeader>
                  <CardContent>
                    {simulationStats ? (
                      <div className="space-y-6">
                        <div className="h-[180px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={simulationData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                              <XAxis dataKey="name" hide />
                              <YAxis hide domain={['auto', 'auto']} />
                              <Tooltip />
                              <Line type="monotone" dataKey="run0" stroke="#8884d8" dot={false} strokeWidth={2} />
                              <Line type="monotone" dataKey="run1" stroke="#82ca9d" dot={false} strokeWidth={1} style={{ opacity: 0.5 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 rounded-lg bg-muted"><div className="text-lg font-bold">{simulationStats.pass}%</div><div className="text-[10px] uppercase text-muted-foreground">Survival</div></div>
                          <div className="text-center p-2 rounded-lg bg-muted"><div className="text-lg font-bold">{simulationStats.breach}%</div><div className="text-[10px] uppercase text-muted-foreground">Breach</div></div>
                          <div className="text-center p-2 rounded-lg bg-muted"><div className="text-lg font-bold">{simulationStats.worstCaseStreak}</div><div className="text-[10px] uppercase text-muted-foreground">Losing Streak</div></div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[180px] flex items-center justify-center border-2 border-dashed rounded-xl text-muted-foreground text-sm">Run simulation to see paths</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="info" className="mt-4">
                <Card><CardContent className="pt-6 space-y-3 text-sm">
                  <p className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Why this is better than your Prop Dashboard:</p>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li><strong>Proactive, not Reactive:</strong> Dashboards tell you *that* you failed. This tells you *how* to trade so you don't.</li>
                    <li><strong>Exact Math:</strong> Most traders "eyeball" lot sizes. This tool accounts for your daily buffer down to the cent.</li>
                    <li><strong>Recovery Mode:</strong> Strategy automatically shifts to protection when you enter drawdown.</li>
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
