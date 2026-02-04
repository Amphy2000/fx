import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
import { Shield, Target, Activity, Info, Zap, Settings2, RefreshCcw, AlertTriangle, Trash2, Edit3, Globe, TrendingUp, Calendar, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const PROP_FIRM_PRESETS = {
    custom: { name: "Custom", dailyDD: 5, totalDD: 10, target: 10, description: "Enter your own rules" },
    ftmo: { name: "FTMO", dailyDD: 5, totalDD: 10, target: 10, description: "Daily based on start of day balance" },
    fundedNext: { name: "Funded Next", dailyDD: 5, totalDD: 10, target: 10, description: "Balance based daily drawdown" },
    myForexFunds: { name: "The Funded Trader", dailyDD: 5, totalDD: 10, target: 10, description: "Drawdown trails profit" },
    e8Funding: { name: "E8 Funding", dailyDD: 5, totalDD: 8, target: 8, description: "Trailing drawdown system" },
};

const ASSET_CLASSES = {
    forex: { name: "Forex Majors", pipValue: 10 },
    gold: { name: "Gold (XAUUSD)", pipValue: 1 },
    indices: { name: "Indices (US30)", pipValue: 1 },
};

const PropFirmProtector = () => {
    const [selectedFirm, setSelectedFirm] = useState<string>("ftmo");
    const [assetClass, setAssetClass] = useState<string>("forex");
    const [accountSize, setAccountSize] = useState<number>(100000);
    const [currentBalance, setCurrentBalance] = useState<number>(100000);
    const [startOfDayBalance, setStartOfDayBalance] = useState<number>(100000);
    const [maxDailyDrawdown, setMaxDailyDrawdown] = useState<number>(5);
    const [maxTotalDrawdown, setMaxTotalDrawdown] = useState<number>(10);
    const [profitTargetPercent, setProfitTargetPercent] = useState<number>(10);
    const [stopLossPips, setStopLossPips] = useState<number>(20);
    const [riskPerTrade, setRiskPerTrade] = useState<number>(1);
    const [isTrailing, setIsTrailing] = useState<boolean>(false);
    const [highWaterMark, setHighWaterMark] = useState<number>(100000);

    const [currentAccountSlot, setCurrentAccountSlot] = useState<number>(0);
    const [accountNames, setAccountNames] = useState<string[]>(["Challenge 1"]);
    const [selectedMt5AccountId, setSelectedMt5AccountId] = useState<string | null>(null);

    const isSavingLocked = useRef(false);

    // Simulator State
    const [simWinRate, setSimWinRate] = useState(50);
    const [simRR, setSimRR] = useState(2);
    const [useManualStats, setUseManualStats] = useState(true);
    const [simulationData, setSimulationData] = useState<any[]>([]);
    const [simulationStats, setSimulationStats] = useState<{ pass: number; breach: number; worstCaseStreak: number } | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);

    // Sync Accounts
    const { data: mt5Accounts } = useQuery({
        queryKey: ['mt5-accounts-list'],
        queryFn: async () => {
            const { data } = await supabase.from('mt5_accounts').select('id, broker_name, account_number').eq('is_active', true);
            return data || [];
        }
    });

    // Load Persistence
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
                    setAccountSize(parsed.accountSize || 100000);
                    setCurrentBalance(parsed.currentBalance || 100000);
                    setStartOfDayBalance(parsed.startOfDayBalance || 100000);
                    setMaxDailyDrawdown(parsed.maxDailyDrawdown || 5);
                    setMaxTotalDrawdown(parsed.maxTotalDrawdown || 10);
                    setProfitTargetPercent(parsed.profitTargetPercent || 10);
                    setStopLossPips(parsed.stopLossPips || 20);
                    setRiskPerTrade(parsed.riskPerTrade || 1);
                    setSelectedMt5AccountId(parsed.selectedMt5AccountId || null);
                }
            }
        } catch (e) { console.error(e); }
    }, [currentAccountSlot]);

    // Save Persistence
    useEffect(() => {
        if (isSavingLocked.current) return;
        const timer = setTimeout(() => {
            const settings = { selectedFirm, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, riskPerTrade, selectedMt5AccountId };
            localStorage.setItem(`propFirmSettings_slot_${currentAccountSlot}`, JSON.stringify(settings));
        }, 500);
        return () => clearTimeout(timer);
    }, [currentAccountSlot, selectedFirm, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, riskPerTrade, selectedMt5AccountId]);

    useEffect(() => {
        if (!isSavingLocked.current) localStorage.setItem("propFirmAccountNames", JSON.stringify(accountNames));
    }, [accountNames]);

    // Calculations
    const calculations = useMemo(() => {
        const dailyLimit = startOfDayBalance * (maxDailyDrawdown / 100);
        const dailyFloor = startOfDayBalance - dailyLimit;
        const dailyLossRemaining = Math.max(0, currentBalance - dailyFloor);

        const totalLimit = accountSize * (maxTotalDrawdown / 100);
        const totalFloor = accountSize - totalLimit;
        const totalLossRemaining = Math.max(0, currentBalance - totalFloor);

        const profitTargetAmount = accountSize * (profitTargetPercent / 100);
        const remainingProfit = Math.max(0, (accountSize + profitTargetAmount) - currentBalance);

        const riskAmount = currentBalance * (riskPerTrade / 100);
        const maxDrawdownPossible = Math.min(dailyLossRemaining, totalLossRemaining);
        const safeRiskAmount = Math.min(riskAmount, maxDrawdownPossible * 0.95);

        const asset = ASSET_CLASSES[assetClass as keyof typeof ASSET_CLASSES] || ASSET_CLASSES.forex;
        const suggestedLotSize = safeRiskAmount / (stopLossPips * asset.pipValue);

        // Pass Projection
        const winRate = simWinRate / 100;
        const avgWinValue = safeRiskAmount * simRR;
        const avgLossValue = safeRiskAmount;
        const expectedValuePerTrade = (winRate * avgWinValue) - ((1 - winRate) * avgLossValue);
        const tradesToTarget = expectedValuePerTrade > 0 ? Math.ceil(remainingProfit / expectedValuePerTrade) : Infinity;

        return {
            dailyLossRemaining,
            totalLossRemaining,
            remainingProfit,
            safeRiskAmount,
            suggestedLotSize: Math.max(0, suggestedLotSize),
            tradesToTarget,
            dailyProgress: dailyLimit > 0 ? Math.max(0, Math.min(100, ((startOfDayBalance - currentBalance) / dailyLimit) * 100)) : 0,
            totalProgress: totalLimit > 0 ? Math.max(0, Math.min(100, ((accountSize - currentBalance) / totalLimit) * 100)) : 0,
        };
    }, [accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, assetClass, riskPerTrade, simWinRate, simRR]);

    const addAccountSlot = () => {
        const newNames = [...accountNames, `Account ${accountNames.length + 1}`];
        setAccountNames(newNames);
        setCurrentAccountSlot(newNames.length - 1);
        toast.success("New account added!");
    };

    const removeAccountSlot = () => {
        if (accountNames.length <= 1) return toast.error("At least one account is required");
        if (window.confirm(`Delete "${accountNames[currentAccountSlot]}"?`)) {
            isSavingLocked.current = true;
            const deletedIdx = currentAccountSlot;
            const newNames = accountNames.filter((_, idx) => idx !== deletedIdx);
            for (let i = deletedIdx; i < accountNames.length - 1; i++) {
                const nextData = localStorage.getItem(`propFirmSettings_slot_${i + 1}`);
                if (nextData) localStorage.setItem(`propFirmSettings_slot_${i}`, nextData);
            }
            localStorage.removeItem(`propFirmSettings_slot_${accountNames.length - 1}`);
            localStorage.setItem("propFirmAccountNames", JSON.stringify(newNames));
            setAccountNames(newNames);
            setCurrentAccountSlot(0);
            toast.success("Account deleted!");
            setTimeout(() => isSavingLocked.current = false, 1000);
        }
    };

    const runSimulation = async () => {
        setIsSimulating(true);
        setSimulationData([]);
        await new Promise(r => setTimeout(r, 200));
        const ITERATIONS = 300;
        const TRADES = 20;
        let breachCount = 0;
        const samples: any[] = [];
        for (let i = 0; i < ITERATIONS; i++) {
            let bal = currentBalance;
            let survived = true;
            let path = [{ trade: 0, balance: bal }];
            for (let t = 1; t <= TRADES; t++) {
                if (Math.random() * 100 < simWinRate) bal += (bal * (riskPerTrade / 100)) * simRR;
                else bal -= (bal * (riskPerTrade / 100));
                if (bal < accountSize * (1 - maxTotalDrawdown / 100) || bal < startOfDayBalance * (1 - maxDailyDrawdown / 100)) {
                    survived = false;
                    path.push({ trade: t, balance: bal });
                    break;
                }
                path.push({ trade: t, balance: bal });
            }
            if (!survived) breachCount++;
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
        setSimulationStats({ pass: Math.round(((ITERATIONS - breachCount) / ITERATIONS) * 100), breach: Math.round((breachCount / ITERATIONS) * 100), worstCaseStreak: 0 });
        setIsSimulating(false);
    };

    const handleNumInput = (val: string, setter: (n: number) => void) => {
        if (val === "") {
            setter(0);
            return;
        }
        const num = parseFloat(val);
        if (!isNaN(num)) setter(num);
    };

    return (
        <Layout>
            <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
                {/* Slot Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Prop Firm Protector</h1>
                        <Badge variant="outline" className="text-primary border-primary mt-1">v2.0 Advanced Guard</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/50">
                        {accountNames.map((name, idx) => (
                            <Button key={idx} variant={currentAccountSlot === idx ? "default" : "ghost"} size="sm" onClick={() => setCurrentAccountSlot(idx)} className="h-8 text-xs px-4">{name}</Button>
                        ))}
                        <Button variant="outline" size="sm" onClick={addAccountSlot} className="h-8 w-8 p-0 border-dashed"><Zap className="h-4 w-4" /></Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Controls */}
                    <div className="space-y-6">
                        <Card className="border-t-4 border-t-primary overflow-hidden">
                            <CardHeader className="pb-3 border-b bg-muted/30">
                                <CardTitle className="text-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /> Setup</div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const n = window.prompt("New name:", accountNames[currentAccountSlot]); if (n) { const list = [...accountNames]; list[currentAccountSlot] = n; setAccountNames(list); } }}><Edit3 className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={removeAccountSlot}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Firm Preset</Label>
                                    <Select value={selectedFirm} onValueChange={v => { setSelectedFirm(v); const f = PROP_FIRM_PRESETS[v as keyof typeof PROP_FIRM_PRESETS]; if (f && v !== 'custom') { setMaxDailyDrawdown(f.dailyDD); setMaxTotalDrawdown(f.totalDD); setProfitTargetPercent(f.target); } }}>
                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>{Object.entries(PROP_FIRM_PRESETS).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Account Size</Label><Input className="h-8" value={accountSize === 0 ? "" : accountSize} type="number" onChange={e => handleNumInput(e.target.value, setAccountSize)} /></div>
                                    <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Day Start Equity</Label><Input className="h-8" value={startOfDayBalance === 0 ? "" : startOfDayBalance} type="number" onChange={e => handleNumInput(e.target.value, setStartOfDayBalance)} /></div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-primary">Current Live Equity</Label>
                                    <Input className="h-10 text-xl font-bold bg-primary/5" value={currentBalance === 0 ? "" : currentBalance} type="number" onChange={e => handleNumInput(e.target.value, setCurrentBalance)} />
                                </div>

                                <div className="space-y-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                    <div className="flex justify-between items-center text-xs font-bold text-primary"><span>RISK/TRADE</span><span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{riskPerTrade}%</span></div>
                                    <Slider value={[riskPerTrade]} min={0.1} max={3} step={0.1} onValueChange={v => setRiskPerTrade(v[0])} />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Stop Loss (Pips)</Label><Input className="h-8" value={stopLossPips === 0 ? "" : stopLossPips} type="number" onChange={e => handleNumInput(e.target.value, setStopLossPips)} /></div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Asset</Label>
                                        <Select value={assetClass} onValueChange={setAssetClass}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ASSET_CLASSES).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent></Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Volatility Guard */}
                        <Card className="bg-amber-500/10 border-amber-500/20">
                            <CardContent className="pt-4 flex items-start gap-3">
                                <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-amber-800 uppercase">Volatility Guard</p>
                                    <p className="text-[10px] text-amber-700 mt-1">High Impact News (NFP/CPI) expected in next 24h. Use 50% reduced risk to stay safe.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-orange-500 shadow-sm">
                                <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Daily Breach Room</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-black tracking-tighter">${calculations.dailyLossRemaining.toFixed(0)}</div>
                                    <Progress value={calculations.dailyProgress} className="h-2 mt-4" />
                                    <p className="text-[9px] font-bold uppercase mt-2 opacity-50">Usage: {calculations.dailyProgress.toFixed(1)}%</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-blue-500 shadow-sm">
                                <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Distance to Target</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-black tracking-tighter text-blue-600">${calculations.remainingProfit.toFixed(0)}</div>
                                    <Progress value={Math.max(0, 100 - (calculations.remainingProfit / (accountSize * (profitTargetPercent / 100)) * 100))} className="h-2 mt-4 bg-blue-100" />
                                    <p className="text-[9px] font-bold uppercase mt-2 opacity-50">Target: {profitTargetPercent}% of Initial</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="md:col-span-2 bg-primary text-primary-foreground border-none shadow-2xl overflow-hidden relative group">
                                <CardContent className="pt-8 pb-8">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                        <div>
                                            <Badge variant="secondary" className="bg-white/15 text-white border-none mb-3">SAFE LOT SIZE</Badge>
                                            <div className="text-9xl font-black tracking-tighter drop-shadow-2xl">{calculations.suggestedLotSize.toFixed(2)}</div>
                                            <div className="mt-4 flex flex-wrap gap-4">
                                                <div className="flex flex-col"><span className="text-[10px] uppercase font-bold opacity-60">Risk Amount</span><span className="text-xl font-bold">${calculations.safeRiskAmount.toFixed(0)}</span></div>
                                                <div className="flex flex-col"><span className="text-[10px] uppercase font-bold opacity-60">Pips</span><span className="text-xl font-bold">{stopLossPips}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-900 text-white border-none shadow-xl border-t-4 border-t-green-500">
                                <CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-widest font-black text-green-500">Pass Projection</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="pt-2">
                                        <p className="text-xs opacity-60 font-bold uppercase">Estimated Trades</p>
                                        <div className="text-5xl font-black tracking-tighter">{calculations.tradesToTarget === Infinity ? "???" : calculations.tradesToTarget}</div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[10px] border-b border-white/10 pb-1"><span>Win Rate</span><span className="font-bold">{simWinRate}%</span></div>
                                        <div className="flex justify-between text-[10px] border-b border-white/10 pb-1"><span>Target Reach</span><span className="font-bold text-green-400">Phase 1</span></div>
                                        <p className="text-[8px] opacity-40 italic">Based on your simulation stats and current risk profile.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Tabs defaultValue="recovery" className="w-full">
                            <TabsList className="w-full grid grid-cols-3 h-12 bg-muted/40 p-1 rounded-xl">
                                <TabsTrigger value="recovery" className="rounded-lg">Recovery Path</TabsTrigger>
                                <TabsTrigger value="simulator" className="rounded-lg">Stress Test</TabsTrigger>
                                <TabsTrigger value="rules" className="rounded-lg">Rules Guard</TabsTrigger>
                            </TabsList>

                            <TabsContent value="recovery" className="mt-4">
                                <Card>
                                    <CardHeader><CardTitle className="text-md flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> drawdown Escape Route</CardTitle></CardHeader>
                                    <CardContent>
                                        {currentBalance >= accountSize ? (
                                            <div className="py-12 text-center opacity-40"><Zap className="h-10 w-10 mx-auto mb-2" /><p className="font-bold">No Recovery Needed</p></div>
                                        ) : (
                                            <div className="space-y-4">
                                                <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>Reduce risk to <strong>0.5%</strong>. TARGET: 1:3 RR. You need ~<strong>{Math.ceil(calculations.remainingProfit / (calculations.safeRiskAmount * 3))}</strong> wins to recover safely.</AlertDescription></Alert>
                                                <div className="h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${100 - calculations.totalProgress}%` }} /></div>
                                                <p className="text-[10px] text-center opacity-50 uppercase font-black">Account Survival Health</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="simulator" className="mt-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between py-4">
                                        <CardTitle className="text-md">Monte Carlo Predictor</CardTitle>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2"><Label className="text-[10px]">Manual?</Label><Switch checked={useManualStats} onCheckedChange={setUseManualStats} /></div>
                                            <Button size="sm" onClick={runSimulation} disabled={isSimulating} className="h-8">{isSimulating ? "..." : "Launch"}</Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Win Rate %</Label><Input value={simWinRate} type="number" onChange={e => handleNumInput(e.target.value, setSimWinRate)} className="h-8 font-bold" /></div>
                                            <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Win RR</Label><Input value={simRR} type="number" onChange={e => handleNumInput(e.target.value, setSimRR)} className="h-8 font-bold" /></div>
                                        </div>
                                        {simulationData.length > 0 && (
                                            <div className="h-[150px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={simulationData}><CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} /><XAxis dataKey="name" hide /><YAxis hide domain={['auto', 'auto']} /><Line type="monotone" dataKey="run0" stroke="#8884d8" dot={false} strokeWidth={2} /><Line type="monotone" dataKey="run1" stroke="#82ca9d" dot={false} strokeWidth={1} style={{ opacity: 0.3 }} /></LineChart></ResponsiveContainer></div>
                                        )}
                                        {simulationStats && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="text-center p-3 rounded-xl bg-green-500/5 font-black"><div className="text-2xl text-green-600">{simulationStats.pass}%</div><div className="text-[8px] opacity-60 uppercase">Survival Odds</div></div>
                                                <div className="text-center p-3 rounded-xl bg-red-500/5 font-black"><div className="text-2xl text-red-600">{simulationStats.breach}%</div><div className="text-[8px] opacity-60 uppercase">Breach Odds</div></div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="rules" className="mt-4">
                                <Card><CardContent className="pt-6 space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl"><Shield className="h-5 w-5 text-primary" /><div className="text-xs"><strong>Daily Floor Protection:</strong> We calculate your floor at ${calculations.dailyLossRemaining.toFixed(0)}</div></div>
                                    <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl"><Calendar className="h-5 w-5 text-primary" /><div className="text-xs"><strong>Weekend Hold:</strong> Verify your firm allows holding before market close.</div></div>
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
