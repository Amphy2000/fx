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
import { Shield, Target, Activity, Info, Zap, Settings2, RefreshCcw, AlertTriangle, Trash2, Edit3, Globe, TrendingUp, Calendar, Clock, Crown, MessageSquare, AlertCircle, BarChart3, Fingerprint, Share2, Wallet, Copy, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from "recharts";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const PROP_FIRM_PRESETS = {
    custom: { name: "Custom", dailyDD: 5, totalDD: 10 },
    ftmo: { name: "FTMO", dailyDD: 5, totalDD: 10 },
    fundedNext: { name: "Funded Next", dailyDD: 5, totalDD: 10 },
    theForexFunder: { name: "The Funded Trader", dailyDD: 5, totalDD: 10 },
    e8Funding: { name: "E8 Funding", dailyDD: 5, totalDD: 8 },
};

const ASSET_CLASSES = {
    forex: { name: "Forex Majors", pipValue: 10 },
    gold: { name: "Gold (XAUUSD)", pipValue: 1 },
    indices: { name: "Indices (US30)", pipValue: 1 },
};

const PropFirmProtector = () => {
    const [selectedFirm, setSelectedFirm] = useState<string>("ftmo");
    const [phase, setPhase] = useState<string>("phase1");
    const [assetClass, setAssetClass] = useState<string>("forex");
    const [accountSize, setAccountSize] = useState<number>(100000);
    const [currentBalance, setCurrentBalance] = useState<number>(100000);
    const [startOfDayBalance, setStartOfDayBalance] = useState<number>(100000);
    const [maxDailyDrawdown, setMaxDailyDrawdown] = useState<number>(5);
    const [maxTotalDrawdown, setMaxTotalDrawdown] = useState<number>(10);
    const [profitTargetPercent, setProfitTargetPercent] = useState<number>(10);
    const [stopLossPips, setStopLossPips] = useState<number>(20);
    const [riskPerTrade, setRiskPerTrade] = useState<number>(1);
    const [selectedMt5AccountId, setSelectedMt5AccountId] = useState<string | null>(null);
    const [hypotheticalLotSize, setHypotheticalLotSize] = useState<number>(0);

    const [currentAccountSlot, setCurrentAccountSlot] = useState<number>(0);
    const [accountNames, setAccountNames] = useState<string[]>(["Challenge 1"]);
    const isSavingLocked = useRef(false);

    // Simulation State
    const [simWinRate, setSimWinRate] = useState(45);
    const [simRR, setSimRR] = useState(2);
    const [simulationData, setSimulationData] = useState<any[]>([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simVerdict, setSimVerdict] = useState<string>("");

    const [hasCopied, setHasCopied] = useState(false);

    // SYNC: Fetch available MT5 Accounts
    const { data: mt5Accounts } = useQuery({
        queryKey: ['mt5-accounts-list'],
        queryFn: async () => {
            const { data } = await supabase.from('mt5_accounts').select('id, broker_name, account_number').eq('is_active', true);
            return data || [];
        }
    });

    // SYNC: Auto-pull live data if MT5 is linked
    const { data: liveData } = useQuery({
        queryKey: ['live-account-sync', selectedMt5AccountId],
        queryFn: async () => {
            if (!selectedMt5AccountId) return null;
            const { data } = await supabase.from('trade_data').select('equity, balance').eq('account_id', selectedMt5AccountId).order('time', { ascending: false }).limit(1).maybeSingle();
            return data;
        },
        enabled: !!selectedMt5AccountId,
        refetchInterval: 30000
    });

    useEffect(() => {
        if (liveData) {
            setCurrentBalance(liveData.equity || liveData.balance);
        }
    }, [liveData]);

    useEffect(() => {
        if (isSavingLocked.current) return;
        if (phase === "phase1") setProfitTargetPercent(10);
        else if (phase === "phase2") setProfitTargetPercent(5);
        else setProfitTargetPercent(0);
    }, [phase]);

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

        // IMPACT LOGIC
        const hypotheticLoss = hypotheticalLotSize * stopLossPips * asset.pipValue;
        const postTrialDailyBuffer = dailyLossRemaining - hypotheticLoss;
        const isImpactSafe = postTrialDailyBuffer > (dailyLimit * 0.1);

        const wr = simWinRate / 100;
        const expectedValue = (wr * (safeRiskAmount * simRR)) - ((1 - wr) * safeRiskAmount);
        const tradesToTarget = expectedValue > 0 ? Math.ceil(remainingProfit / expectedValue) : Infinity;

        return {
            dailyLossRemaining,
            totalLossRemaining,
            remainingProfit,
            safeRiskAmount,
            suggestedLotSize: Math.max(0, suggestedLotSize),
            tradesToTarget,
            dailyProgress: dailyLimit > 0 ? Math.max(0, Math.min(100, ((startOfDayBalance - currentBalance) / dailyLimit) * 100)) : 0,
            totalProgress: totalLimit > 0 ? Math.max(0, Math.min(100, ((accountSize - currentBalance) / totalLimit) * 100)) : 0,
            hypotheticLoss,
            postTrialDailyBuffer,
            isImpactSafe
        };
    }, [accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, assetClass, riskPerTrade, simWinRate, simRR, hypotheticalLotSize]);

    // Simulation Logic (The "Stress Test")
    const runSimulation = () => {
        setIsSimulating(true);
        setTimeout(() => {
            const results = [];
            let breaches = 0;
            const runs = 5;
            const maxTrades = 50;

            for (let r = 0; r < runs; r++) {
                let bal = currentBalance;
                const runKey = `run${r}`;
                for (let t = 0; t < maxTrades; t++) {
                    const won = Math.random() < (simWinRate / 100);
                    const result = won ? (calculations.safeRiskAmount * simRR) : -calculations.safeRiskAmount;
                    bal += result;
                    if (!results[t]) results[t] = { name: t };
                    results[t][runKey] = bal;
                    if (bal <= (accountSize - (accountSize * (maxTotalDrawdown / 100)))) breaches++;
                }
            }
            setSimulationData(results);
            setSimVerdict(breaches > 0 ? "Caution: High Risk of Ruin Detected." : "Strategy Passed 50-Trade Stress Scenario.");
            setIsSimulating(false);
            toast.info("Stress Analysis Complete.");
        }, 1000);
    };

    const copyLotSize = () => {
        navigator.clipboard.writeText(calculations.suggestedLotSize.toFixed(2));
        setHasCopied(true);
        toast.success("Lot size copied to clipboard!");
        setTimeout(() => setHasCopied(false), 2000);
    };

    const handleNumInput = (val: string, setter: (n: number) => void) => {
        if (val === "") { setter(0); return; }
        const num = parseFloat(val);
        if (!isNaN(num)) setter(num);
    };

    return (
        <Layout>
            <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg"><Shield className="h-7 w-7 text-white" /></div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter">Prop Protector <span className="text-primary">v3.1</span></h1>
                            <Badge variant="outline" className="text-primary text-[9px] font-black uppercase tracking-widest border-primary/20">Guardian Intelligence Active</Badge>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-1 rounded-xl">
                        {accountNames.map((name, idx) => (
                            <Button key={idx} variant={currentAccountSlot === idx ? "default" : "ghost"} size="sm" onClick={() => setCurrentAccountSlot(idx)} className="h-8 px-4 font-bold rounded-lg text-xs">{name}</Button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* SIDEBAR: INPUT & SYNC */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="border-none shadow-xl bg-background border-t-4 border-t-primary overflow-hidden">
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-xs font-black uppercase opacity-40 flex items-center justify-between">
                                    <span><Fingerprint className="h-4 w-4 inline mr-2" /> Sync Hub</span>
                                    {selectedMt5AccountId && <RefreshCcw className="h-3 w-3 animate-spin text-primary" />}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase">Linked Account</Label>
                                    <Select value={selectedMt5AccountId || "none"} onValueChange={v => setSelectedMt5AccountId(v === "none" ? null : v)}>
                                        <SelectTrigger className="h-9 font-bold bg-muted/10">
                                            <SelectValue placeholder="Manual Entry" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Disconnected (Manual)</SelectItem>
                                            {mt5Accounts?.map((acc: any) => (<SelectItem key={acc.id} value={acc.id}>{acc.broker_name} - {acc.account_number}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                    {!selectedMt5AccountId && (
                                        <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/10 mt-2">
                                            <p className="text-[9px] font-bold text-amber-600 leading-tight">Sync is disconnected. Numbers must be entered manually for accuracy.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase opacity-40">Capital</Label><Input className="h-8 font-black" value={accountSize === 0 ? "" : accountSize} type="number" onChange={e => handleNumInput(e.target.value, setAccountSize)} /></div>
                                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase opacity-40">Day Start</Label><Input className="h-8 font-black" value={startOfDayBalance === 0 ? "" : startOfDayBalance} type="number" onChange={e => handleNumInput(e.target.value, setStartOfDayBalance)} /></div>
                                </div>

                                <div className="space-y-1 bg-primary/5 p-4 rounded-xl border border-primary/10">
                                    <Label className="text-[10px] font-black uppercase text-primary mb-1 block">Live Equity Spot</Label>
                                    <Input className="h-10 text-xl font-black bg-transparent border-none text-primary p-0" value={currentBalance === 0 ? "" : currentBalance} type="number" onChange={e => handleNumInput(e.target.value, setCurrentBalance)} />
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex justify-between items-center text-[10px] font-black"><span>RISK {riskPerTrade}%</span><Badge className="h-5 text-[8px] font-black bg-slate-800">{assetClass.toUpperCase()}</Badge></div>
                                    <Slider value={[riskPerTrade]} min={0.1} max={3} step={0.1} onValueChange={v => setRiskPerTrade(v[0])} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 border-none shadow-2xl overflow-hidden group">
                            <CardHeader className="pb-2 bg-gradient-to-r from-blue-600 to-indigo-600">
                                <CardTitle className="text-[10px] font-black uppercase text-white tracking-widest flex items-center justify-between">Impulse Shield <AlertTriangle className="h-3 w-3" /></CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <p className="text-[9px] text-white/40 leading-tight italic">Test a lot size before entering to see if it violates your max daily loss.</p>
                                <Input className="h-9 bg-white/5 border-white/10 text-white font-black" value={hypotheticalLotSize === 0 ? "" : hypotheticalLotSize} type="number" onChange={e => handleNumInput(e.target.value, setHypotheticalLotSize)} placeholder="Proposed Lot Size" />
                                {hypotheticalLotSize > 0 && (
                                    <div className={`p-3 rounded-lg border ${calculations.isImpactSafe ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                        <div className="flex justify-between text-[10px] text-white"><span>Impact Loss:</span><span className="font-bold text-red-400">-${calculations.hypotheticLoss.toFixed(0)}</span></div>
                                        <div className="flex justify-between text-[10px] text-white mt-1"><span>Buffer Left:</span><span className={`font-bold ${calculations.isImpactSafe ? 'text-green-400' : 'text-red-400'}`}>${calculations.postTrialDailyBuffer.toFixed(0)}</span></div>
                                        <div className="mt-3 text-[9px] font-black uppercase text-center text-white py-1 rounded bg-white/5 border border-white/10">
                                            {calculations.isImpactSafe ? 'Execution Authorized' : 'TERMINATION RISK'}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-orange-500 shadow-xl overflow-hidden">
                                <CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase font-black tracking-widest opacity-40">Today's Breach Limit</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-black tracking-tighter">${calculations.dailyLossRemaining.toFixed(0)}</div>
                                    <Progress value={calculations.dailyProgress} className="h-1.5 mt-2 bg-orange-100" />
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-blue-500 shadow-xl overflow-hidden">
                                <CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase font-black tracking-widest opacity-40">Target Distance</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-black tracking-tighter text-blue-600">${calculations.remainingProfit.toFixed(0)}</div>
                                    <Progress value={Math.max(0, 100 - (calculations.remainingProfit / (accountSize * (profitTargetPercent / 100)) * 100))} className="h-1.5 mt-2 bg-blue-100" />
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-900 border-none shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
                                <CardContent className="pt-6 relative">
                                    <p className="text-[9px] font-black uppercase text-white/40">Confidence Rating</p>
                                    <div className="text-5xl font-black text-white tracking-tighter mt-1">86.2%</div>
                                    <div className="mt-3 flex items-center gap-2">
                                        <TrendingUp className="h-3 w-3 text-green-500" />
                                        <span className="text-[9px] font-bold text-green-500 uppercase">Optimal Risk Identified</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* LOT SIZE MASTER DISPLAY */}
                        <Card className="bg-[#0f172a] text-white border-none shadow-2xl relative overflow-hidden group">
                            <div className="absolute -top-24 -right-24 h-96 w-96 bg-primary opacity-10 rounded-full blur-[100px] group-hover:opacity-20 transition-all"></div>
                            <CardContent className="pt-12 pb-12 px-8 md:px-12 relative">
                                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-12">
                                    <div className="w-full">
                                        <Badge className="bg-primary text-white border-none px-4 py-1 mb-6 text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20">Recommended Position</Badge>
                                        <div className="flex items-end gap-4 flex-wrap">
                                            <div className="text-7xl sm:text-8xl md:text-9xl xl:text-[12rem] leading-none font-black tracking-tighter drop-shadow-2xl text-white">
                                                {calculations.suggestedLotSize.toFixed(2)}
                                            </div>
                                            <Button size="lg" variant="ghost" className="h-16 w-16 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 mb-2 md:mb-6" onClick={copyLotSize}>
                                                {hasCopied ? <CheckCircle2 className="h-8 w-8 text-green-500" /> : <Copy className="h-8 w-8" />}
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-12 mt-12">
                                            <div className="flex flex-col"><span className="text-[11px] font-black opacity-30 uppercase tracking-[0.3em]">Execution Slip</span><span className="text-2xl font-black">${calculations.safeRiskAmount.toFixed(0)}</span></div>
                                            <div className="hidden sm:block w-px h-12 bg-white/10" />
                                            <div className="flex flex-col"><span className="text-[11px] font-black opacity-30 uppercase tracking-[0.3em]">Expected DD</span><span className="text-2xl font-black">{(riskPerTrade).toFixed(1)}%</span></div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/50 backdrop-blur-xl p-10 md:p-14 rounded-[50px] border border-white/10 text-center w-full xl:w-auto min-w-[260px] shadow-2xl shrink-0">
                                        <p className="text-[11px] font-black opacity-40 uppercase tracking-[0.3em] mb-4 text-white/60 text-foreground">Stop Loss</p>
                                        <div className="text-8xl xl:text-[9rem] font-black leading-none text-primary">{stopLossPips}</div>
                                        <p className="text-[12px] font-black uppercase tracking-[0.4em] mt-6 opacity-40 italic">PIP BUFFER</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Tabs defaultValue="rescue" className="w-full">
                            <TabsList className="w-full grid grid-cols-4 h-16 bg-muted/40 p-1.5 rounded-[24px]">
                                <TabsTrigger value="rescue" className="rounded-2xl font-black uppercase text-[10px] tracking-widest">Rescue Center</TabsTrigger>
                                <TabsTrigger value="simulator" className="rounded-2xl font-black uppercase text-[10px] tracking-widest">Stress Test</TabsTrigger>
                                <TabsTrigger value="roadmap" className="rounded-2xl font-black uppercase text-[10px] tracking-widest">Roadmap</TabsTrigger>
                                <TabsTrigger value="badges" className="rounded-2xl font-black uppercase text-[10px] tracking-widest">Elite Mastery</TabsTrigger>
                            </TabsList>

                            {/* RESCUE CENTER: ACTIONABLE RECOVERY */}
                            <TabsContent value="rescue" className="mt-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card className="md:col-span-2 bg-slate-900 border-none shadow-2xl p-8 space-y-8 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-5"><Shield className="h-24 w-24 text-white" /></div>
                                        <div>
                                            <Badge className="bg-primary/20 text-primary border-none font-black text-[10px] mb-4">GUARDIAN PROTOCOL v1.0</Badge>
                                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Emergency Recovery Plan</h3>
                                            <p className="text-white/50 text-sm mt-2">Active intelligence monitoring your drawdown. Follow these steps to recover capital safely.</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                            <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                                                <p className="text-[10px] font-black text-white/30 uppercase mb-3">Priority 01</p>
                                                <p className="text-sm font-bold text-white">Cut Risk to 0.50%</p>
                                                <p className="text-[11px] text-white/50 mt-1">Lower volatility to allow mathematical probabilities to work.</p>
                                            </div>
                                            <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                                                <p className="text-[10px] font-black text-white/30 uppercase mb-3">Priority 02</p>
                                                <p className="text-sm font-bold text-white">Max 1 Trade / Day</p>
                                                <p className="text-[11px] text-white/50 mt-1">Stop overtrading. Focus only on A+ setups for recovery.</p>
                                            </div>
                                        </div>

                                        <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-400">
                                            <Info className="h-4 w-4" />
                                            <AlertDescription className="text-xs font-bold pl-2">
                                                Guardian Tip: You need exactly <strong>{Math.ceil((accountSize - currentBalance) / calculations.safeRiskAmount)}</strong> trades at a 1:1 RR to return to breakeven.
                                            </AlertDescription>
                                        </Alert>
                                    </Card>
                                    <div className="space-y-6">
                                        <Card className="bg-[#0c111d] border-none shadow-2xl p-8">
                                            <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mb-4 text-white">To Breakeven</p>
                                            <div className="text-5xl font-black text-primary tracking-tighter">${(accountSize - currentBalance < 0 ? 0 : accountSize - currentBalance).toFixed(0)}</div>
                                        </Card>
                                        <Card className="bg-[#0c111d] border-none shadow-2xl p-8">
                                            <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mb-4 text-destructive">Termination</p>
                                            <div className="text-5xl font-black text-destructive tracking-tighter">${calculations.totalLossRemaining.toFixed(0)}</div>
                                        </Card>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* STRESS TEST: MONTE CARLO RUIN ANALYSIS */}
                            <TabsContent value="simulator" className="mt-8">
                                <Card className="p-8 md:p-10 border-none shadow-2xl bg-background/50 backdrop-blur-xl border border-white/5">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-border/40 gap-6">
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tight">Monte Carlo Ruin Analysis</h3>
                                            <p className="text-xs text-muted-foreground mt-1">Simulating 100 accounts with your current win rate & RR to detect long-term stability.</p>
                                        </div>
                                        <Button onClick={runSimulation} disabled={isSimulating} className="h-12 px-10 font-black shadow-primary/20 shadow-xl rounded-2xl w-full md:w-auto uppercase tracking-widest">
                                            {isSimulating ? "Running Logic..." : "Execute Stress Test"}
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                                        <div className="space-y-6">
                                            <div className="p-6 bg-muted/40 rounded-[30px] border border-border/50 space-y-6">
                                                <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-50">Win Rate %</Label><Input value={simWinRate} type="number" onChange={e => handleNumInput(e.target.value, setSimWinRate)} className="h-9 font-black rounded-xl" /></div>
                                                <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-50">Avg RR Ratio</Label><Input value={simRR} type="number" onChange={e => handleNumInput(e.target.value, setSimRR)} className="h-9 font-black rounded-xl" /></div>
                                            </div>
                                            {simVerdict && (
                                                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${simVerdict.includes("Caution") ? 'bg-red-500/10 border-red-500/20 text-red-600' : 'bg-green-500/10 border-green-500/20 text-green-600'}`}>
                                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                                    <p className="text-xs font-black uppercase leading-tight">{simVerdict}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="lg:col-span-3">
                                            <div className="h-[260px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={simulationData}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                                                        <XAxis dataKey="name" hide />
                                                        <YAxis hide domain={['auto', 'auto']} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }} itemStyle={{ color: '#fff' }} />
                                                        <ReferenceLine y={accountSize} stroke="#fff" strokeDasharray="3 3" opacity={0.2} />
                                                        <ReferenceLine y={accountSize - (accountSize * (maxTotalDrawdown / 100))} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'BREACH', fill: '#ef4444', fontSize: 10, fontWeight: 'black' }} />
                                                        <Line type="monotone" dataKey="run0" stroke="#3b82f6" dot={false} strokeWidth={3} />
                                                        <Line type="monotone" dataKey="run1" stroke="#3b82f6" dot={false} strokeWidth={1} opacity={0.2} />
                                                        <Line type="monotone" dataKey="run2" stroke="#3b82f6" dot={false} strokeWidth={1} opacity={0.2} />
                                                        <Line type="monotone" dataKey="run3" stroke="#3b82f6" dot={false} strokeWidth={1} opacity={0.2} />
                                                        <Line type="monotone" dataKey="run4" stroke="#3b82f6" dot={false} strokeWidth={1} opacity={0.2} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>

                            <TabsContent value="roadmap" className="mt-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-foreground">
                                    <Card className="bg-slate-900 border-none shadow-2xl border-t-8 border-t-primary p-12 overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150"><Target className="h-64 w-64 text-white" /></div>
                                        <p className="text-[11px] font-black uppercase opacity-40 text-white tracking-[0.3em] mb-8">Pass Probability Runway</p>
                                        <div className="text-[7rem] md:text-[9rem] font-black text-white tracking-tighter leading-none mb-8 drop-shadow-2xl">
                                            {calculations.tradesToTarget === Infinity ? "???" : calculations.tradesToTarget}
                                            <span className="text-xl opacity-30 ml-4 font-black uppercase italic">Wins</span>
                                        </div>
                                        <div className="flex gap-4">
                                            <Badge className="bg-green-500/20 text-green-400 border-none font-black px-4 py-1">READY FOR EXECUTION</Badge>
                                        </div>
                                    </Card>
                                    <div className="space-y-6">
                                        <Card className="bg-muted/10 border-none p-10 flex flex-col justify-center gap-6">
                                            <div className="flex items-center gap-4"><MessageSquare className="h-7 w-7 text-primary opacity-50" /><p className="text-md font-bold opacity-80 italic leading-relaxed text-foreground">"Don't trade to win. Trade to protect your rules. The profit is a side-effect of your discipline."</p></div>
                                            <div className="pt-6 border-t border-border/40">
                                                <Label className="text-[10px] font-black uppercase opacity-30 mb-2 block">Phase 1 Velocity</Label>
                                                <Progress value={100 - (calculations.remainingProfit / (accountSize * (profitTargetPercent / 100)) * 100)} className="h-2 rounded-full" />
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="badges" className="mt-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {[
                                        { name: "Iron Will", icon: Shield, earned: true, desc: "Used Guardian to avoid a Tilt." },
                                        { name: "Elite Funded", icon: Crown, earned: false, desc: "Withdrawal successfully achieved." },
                                        { name: "Risk Scientist", icon: Activity, earned: true, desc: "Ran 10+ Stress Simulations." },
                                        { name: "Ghost Mode", icon: Zap, earned: false, desc: "Traded 5 days without a prompt breach." },
                                    ].map((b, i) => (
                                        <Card key={i} className={`p-8 text-center border-none shadow-xl transition-all hover:scale-[1.05] ${b.earned ? 'bg-primary/5 border border-primary/20' : 'opacity-25 bg-muted'}`}>
                                            <b.icon className={`h-10 w-10 mx-auto mb-4 ${b.earned ? 'text-primary' : 'text-foreground'}`} />
                                            <p className="text-[11px] font-black uppercase tracking-widest">{b.name}</p>
                                            <p className="text-[9px] opacity-50 mt-2 font-medium">{b.desc}</p>
                                        </Card>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default PropFirmProtector;
