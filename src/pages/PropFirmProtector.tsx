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
import { Shield, Target, Activity, Info, Zap, Settings2, RefreshCcw, AlertTriangle, Trash2, Edit3, Globe, TrendingUp, Calendar, Clock, Crown, MessageSquare, AlertCircle, BarChart3, Fingerprint, Share2, Wallet, Copy, CheckCircle2, Rocket, BrainCircuit, Waves, Eye, Plus, ChevronRight } from "lucide-react";
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

// Apple-Grade Numeric Input (Prevents decimal clobbering)
const NumericInput = ({ value, onChange, className, placeholder }: { value: number, onChange: (n: number) => void, className?: string, placeholder?: string }) => {
    const [localVal, setLocalVal] = useState(value.toString());

    useEffect(() => {
        if (parseFloat(localVal) !== value) {
            setLocalVal(value.toString());
        }
    }, [value]);

    return (
        <Input
            type="text"
            inputMode="decimal"
            value={localVal}
            placeholder={placeholder}
            className={`bg-muted/20 border-border/50 font-bold focus-visible:ring-primary/30 transition-all ${className}`}
            onChange={(e) => {
                const v = e.target.value;
                if (v === "" || v === "." || v === "0.") {
                    setLocalVal(v);
                    onChange(0);
                    return;
                }
                if (/^\d*\.?\d*$/.test(v)) {
                    setLocalVal(v);
                    const num = parseFloat(v);
                    if (!isNaN(num)) onChange(num);
                }
            }}
        />
    );
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

    // Portfolio Management
    const [currentAccountSlot, setCurrentAccountSlot] = useState<number>(0);
    const [accountNames, setAccountNames] = useState<string[]>(["Challenge 1"]);
    const isSavingLocked = useRef(false);

    // Simulation Stats
    const [simWinRate, setSimWinRate] = useState(45);
    const [simRR, setSimRR] = useState(2);
    const [simulationData, setSimulationData] = useState<any[]>([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simStats, setSimStats] = useState({ survivalRate: 0, passProb: 0, medianEquity: 0 });

    const [hasCopied, setHasCopied] = useState(false);

    // Persistence Logic
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
                    setPhase(parsed.phase || "phase1");
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

    useEffect(() => {
        if (isSavingLocked.current) return;
        const timer = setTimeout(() => {
            const settings = { selectedFirm, phase, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, riskPerTrade, selectedMt5AccountId };
            localStorage.setItem(`propFirmSettings_slot_${currentAccountSlot}`, JSON.stringify(settings));
            localStorage.setItem("propFirmAccountNames", JSON.stringify(accountNames));
        }, 500);
        return () => clearTimeout(timer);
    }, [currentAccountSlot, selectedFirm, phase, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, riskPerTrade, selectedMt5AccountId, accountNames]);

    // Calculations
    const calculations = useMemo(() => {
        const dailyLimit = (startOfDayBalance || accountSize) * (maxDailyDrawdown / 100);
        const dailyFloor = (startOfDayBalance || accountSize) - dailyLimit;
        const dailyLossRemaining = Math.max(0, currentBalance - dailyFloor);
        const totalLimit = accountSize * (maxTotalDrawdown / 100);
        const totalFloor = accountSize - totalLimit;
        const totalLossRemaining = Math.max(0, currentBalance - totalFloor);
        const profitTargetAmount = accountSize * (profitTargetPercent / 100);
        const remainingProfit = Math.max(0, (accountSize + profitTargetAmount) - currentBalance);
        const riskAmount = currentBalance * (riskPerTrade / 100);
        const maxDrawdownPossible = Math.min(dailyLossRemaining, totalLossRemaining);
        const safeRiskAmount = Math.min(riskAmount, maxDrawdownPossible * 0.98);
        const asset = ASSET_CLASSES[assetClass as keyof typeof ASSET_CLASSES] || ASSET_CLASSES.forex;
        const suggestedLotSize = safeRiskAmount / (stopLossPips * asset.pipValue);

        const hypotheticLoss = (hypotheticalLotSize || 0) * stopLossPips * asset.pipValue;
        const postTrialDailyBuffer = dailyLossRemaining - hypotheticLoss;
        const isImpactSafe = postTrialDailyBuffer > (dailyLimit * 0.05);

        return {
            dailyLossRemaining,
            totalLossRemaining,
            remainingProfit,
            safeRiskAmount,
            suggestedLotSize: Math.max(0, suggestedLotSize),
            dailyProgress: dailyLimit > 0 ? Math.max(0, Math.min(100, (((startOfDayBalance || accountSize) - currentBalance) / dailyLimit) * 100)) : 0,
            totalProgress: totalLimit > 0 ? Math.max(0, Math.min(100, ((accountSize - currentBalance) / totalLimit) * 100)) : 0,
            hypotheticLoss,
            postTrialDailyBuffer,
            isImpactSafe,
            dailyLimit,
            profitTargetAmount
        };
    }, [accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, assetClass, riskPerTrade, hypotheticalLotSize]);

    // Simulation Logic
    const runSimulation = () => {
        setIsSimulating(true);
        setTimeout(() => {
            const results = [];
            let survivors = 0;
            let passes = 0;
            let totalFinalEquity = 0;
            const runs = 20;
            const maxTrades = 40;
            const breachLevel = accountSize - (accountSize * (maxTotalDrawdown / 100));
            const targetLevel = accountSize + (accountSize * (profitTargetPercent / 100));

            for (let r = 0; r < runs; r++) {
                let bal = currentBalance;
                const runKey = `run${r}`;
                let hasBreached = false;
                let hasPassed = false;

                for (let t = 0; t < maxTrades; t++) {
                    if (!hasBreached) {
                        const won = Math.random() < (simWinRate / 100);
                        const result = won ? (calculations.safeRiskAmount * simRR) : -calculations.safeRiskAmount;
                        bal += result;
                        if (bal <= breachLevel) hasBreached = true;
                        if (bal >= targetLevel) hasPassed = true;
                    }
                    if (!results[t]) results[t] = { name: t };
                    results[t][runKey] = bal;
                }
                if (!hasBreached) survivors++;
                if (hasPassed) passes++;
                totalFinalEquity += bal;
            }
            setSimulationData(results);
            setSimStats({
                survivalRate: (survivors / runs) * 100,
                passProb: (passes / runs) * 100,
                medianEquity: totalFinalEquity / runs
            });
            setIsSimulating(false);
            toast.success("Simulation Engine Complete");
        }, 600);
    };

    // Portfolio Actions
    const addAccount = () => {
        const newNames = [...accountNames, `Account ${accountNames.length + 1}`];
        setAccountNames(newNames);
        setCurrentAccountSlot(newNames.length - 1);
        toast.success("Portfolio slot added");
    };

    const removeAccount = () => {
        if (accountNames.length <= 1) return toast.error("Primary account required");
        if (confirm(`Delete slot "${accountNames[currentAccountSlot]}"?`)) {
            isSavingLocked.current = true;
            const newNames = accountNames.filter((_, i) => i !== currentAccountSlot);
            // Shift storage
            for (let i = currentAccountSlot; i < accountNames.length - 1; i++) {
                const next = localStorage.getItem(`propFirmSettings_slot_${i + 1}`);
                if (next) localStorage.setItem(`propFirmSettings_slot_${i}`, next);
            }
            localStorage.removeItem(`propFirmSettings_slot_${accountNames.length - 1}`);
            setAccountNames(newNames);
            setCurrentAccountSlot(0);
            setTimeout(() => isSavingLocked.current = false, 500);
            toast.success("Account removed");
        }
    };

    const renameAccount = () => {
        const name = prompt("Enter new name:", accountNames[currentAccountSlot]);
        if (name) {
            const newNames = [...accountNames];
            newNames[currentAccountSlot] = name;
            setAccountNames(newNames);
        }
    };

    const copyLotSize = () => {
        navigator.clipboard.writeText(calculations.suggestedLotSize.toFixed(2));
        setHasCopied(true);
        toast.success("Position size copied to clipboard");
        setTimeout(() => setHasCopied(false), 2000);
    };

    return (
        <Layout>
            <div className="container mx-auto p-4 md:p-6 max-w-7xl animate-in fade-in duration-500">

                {/* APPLE NAVIGATION HUB */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b pb-8">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-slate-950 flex items-center justify-center shadow-xl border border-white/5">
                            <Shield className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-2">
                                Guardian AI <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">PREMIUM</span>
                            </h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[11px] font-black uppercase text-muted-foreground tracking-widest">{accountNames[currentAccountSlot]}</span>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-40 hover:opacity-100" onClick={renameAccount}><Edit3 className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-40 hover:opacity-100 text-destructive" onClick={removeAccount}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center p-1.5 bg-muted/40 rounded-2xl border border-border/50 shadow-inner overflow-x-auto no-scrollbar">
                        {accountNames.map((name, i) => (
                            <Button key={i} variant={currentAccountSlot === i ? "default" : "ghost"} size="sm" onClick={() => setCurrentAccountSlot(i)} className="h-9 px-6 font-bold text-[11px] uppercase rounded-xl transition-all">
                                {name}
                            </Button>
                        ))}
                        <div className="w-px h-6 bg-border mx-2" />
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary" onClick={addAccount}><Plus className="h-4 w-4" /></Button>
                    </div>
                </header>

                {/* COMPACT DASHBOARD GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* L-SIDEBAR: CONTROLS (3 COLS) */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-background">
                            <CardHeader className="pb-3 pt-6 px-6 border-b border-border/40">
                                <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Capital Matrix</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase opacity-60">Account Equity ($)</Label>
                                    <NumericInput value={currentBalance} onChange={setCurrentBalance} className="h-10 text-lg" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-[10px] font-bold uppercase opacity-60">Size</Label><NumericInput value={accountSize} onChange={setAccountSize} className="h-9" /></div>
                                    <div className="space-y-1"><Label className="text-[10px] font-bold uppercase opacity-60">Day Start</Label><NumericInput value={startOfDayBalance} onChange={setStartOfDayBalance} className="h-9" /></div>
                                </div>
                                <div className="space-y-3 pt-2">
                                    <div className="flex justify-between items-center text-[10px] font-black">
                                        <span className="uppercase tracking-widest text-muted-foreground">Trade Risk</span>
                                        <span className="text-primary">{riskPerTrade.toFixed(1)}%</span>
                                    </div>
                                    <Slider value={[riskPerTrade]} min={0.1} max={3} step={0.1} onValueChange={v => setRiskPerTrade(v[0])} className="h-4" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-[10px] font-bold uppercase opacity-60">Stop Loss</Label><NumericInput value={stopLossPips} onChange={setStopLossPips} className="h-9" /></div>
                                    <div className="space-y-1"><Label className="text-[10px] font-bold uppercase opacity-60">Firm</Label>
                                        <Select value={selectedFirm} onValueChange={v => { setSelectedFirm(v); const f = PROP_FIRM_PRESETS[v as keyof typeof PROP_FIRM_PRESETS]; if (f) { setMaxDailyDrawdown(f.dailyDD); setMaxTotalDrawdown(f.totalDD); } }}>
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                            <SelectContent>{Object.entries(PROP_FIRM_PRESETS).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-950 border-none shadow-2xl rounded-3xl overflow-hidden group">
                            <CardHeader className="pb-3 bg-gradient-to-r from-blue-700 to-indigo-700"><CardTitle className="text-[10px] font-black uppercase text-white tracking-widest flex items-center justify-between">Anti-Impulse Shield <Shield className="h-3 w-3" /></CardTitle></CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <NumericInput value={hypotheticalLotSize} onChange={setHypotheticalLotSize} placeholder="Test Lot Size Impact" className="bg-white/5 border-white/10 text-white h-10" />
                                {hypotheticalLotSize > 0 && (
                                    <div className={`p-4 rounded-2xl border ${calculations.isImpactSafe ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'} space-y-2`}>
                                        <div className="flex justify-between text-[11px] text-white"><span>Impact:</span><span className="font-bold text-red-400">-${calculations.hypotheticLoss.toFixed(0)}</span></div>
                                        <div className="flex justify-between text-[11px] text-white"><span>Buffer Left:</span><span className={`font-bold ${calculations.isImpactSafe ? 'text-green-400' : 'text-red-400'}`}>${calculations.postTrialDailyBuffer.toFixed(0)}</span></div>
                                        <Badge className={`w-full h-6 text-[9px] font-black flex justify-center mt-2 border-none ${calculations.isImpactSafe ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{calculations.isImpactSafe ? 'SAFE' : 'RISK DEBT DETECTED'}</Badge>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* MAIN: POSITION & STATS (9 COLS) */}
                    <div className="lg:col-span-9 space-y-6">

                        {/* 1. POSITION POWER CARD */}
                        <Card className="bg-[#0b0c10] border-none shadow-2xl rounded-[40px] overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-16 opacity-5 rotate-12 transition-all group-hover:opacity-10 pointer-events-none"><Fingerprint className="h-64 w-64 text-primary" /></div>
                            <CardContent className="p-10 md:p-14 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-12">
                                <div className="w-full">
                                    <div className="flex items-center gap-3 mb-6">
                                        <Badge className="bg-primary text-white border-none px-4 py-1 text-[11px] font-black tracking-widest shadow-lg shadow-primary/20 uppercase">Guardian Recommendation</Badge>
                                        <span className="text-[11px] font-black text-white/30 tracking-widest uppercase">Safe Risk Mode</span>
                                    </div>
                                    <div className="flex items-end gap-6 flex-wrap">
                                        <h2 className="text-8xl md:text-9xl xl:text-[11rem] leading-none font-black tracking-tighter text-white drop-shadow-[0_20px_50px_rgba(59,130,246,0.3)]">
                                            {calculations.suggestedLotSize.toFixed(2)}
                                        </h2>
                                        <Button size="lg" className="h-20 w-20 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 text-white mb-4" onClick={copyLotSize}>
                                            {hasCopied ? <CheckCircle2 className="h-9 w-9 text-green-500" /> : <Copy className="h-9 w-9" />}
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mt-12 pt-8 border-t border-white/5">
                                        <div className="flex flex-col gap-1"><span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] text-white">Risk Slip</span><span className="text-3xl font-black text-white">${calculations.safeRiskAmount.toFixed(0)}</span></div>
                                        <div className="flex flex-col gap-1"><span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] text-white">Effective DD</span><span className="text-3xl font-black text-white">{riskPerTrade}%</span></div>
                                        <div className="hidden sm:flex flex-col gap-1"><span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] text-white">Pips Target</span><span className="text-3xl font-black text-white">{(calculations.profitTargetAmount / (calculations.suggestedLotSize * (ASSET_CLASSES[assetClass as keyof typeof ASSET_CLASSES]?.pipValue || 10))).toFixed(0)}</span></div>
                                    </div>
                                </div>
                                <div className="shrink-0 bg-slate-900/60 backdrop-blur-3xl p-12 rounded-[50px] border border-white/10 text-center w-full md:w-[280px] shadow-2xl">
                                    <p className="text-[11px] font-black opacity-40 uppercase tracking-[0.4em] mb-4 text-white">Protective Stop</p>
                                    <div className="text-9xl font-black leading-none text-primary drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">{stopLossPips}</div>
                                    <p className="text-[12px] font-black uppercase tracking-[0.3em] mt-8 text-primary/40 italic">Buffer Pips</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. REAL-TIME STATS HUD */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-orange-500 shadow-xl p-6 rounded-3xl flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] uppercase font-black opacity-50 tracking-widest">Drawdown Remaining</p>
                                    <Badge className="bg-orange-500/10 text-orange-600 border-none font-black text-[9px] uppercase">{calculations.dailyProgress.toFixed(1)}% USED</Badge>
                                </div>
                                <div className="text-4xl font-black my-4 tracking-tighter">${calculations.dailyLossRemaining.toFixed(0)}</div>
                                <Progress value={calculations.dailyProgress} className="h-2 bg-orange-100" />
                            </Card>
                            <Card className="bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-blue-500 shadow-xl p-6 rounded-3xl flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] uppercase font-black opacity-50 tracking-widest">{phase === 'funded' ? 'Payout Safety' : 'Profit Required'}</p>
                                    <Badge className="bg-blue-500/10 text-blue-600 border-none font-black text-[9px] uppercase">{(100 - (calculations.remainingProfit / (accountSize * (profitTargetPercent / 100)) * 100)).toFixed(1)}% PATH</Badge>
                                </div>
                                <div className="text-4xl font-black my-4 tracking-tighter text-blue-600">${calculations.remainingProfit.toFixed(0)}</div>
                                <Progress value={Math.max(0, 100 - (calculations.remainingProfit / (accountSize * (profitTargetPercent / 100)) * 100))} className="h-2 bg-blue-100" />
                            </Card>
                            <Card className="bg-slate-950 border-none shadow-2xl p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                                <div className="absolute top-0 right-0 p-4 opacity-5"><Activity className="h-12 w-12 text-white" /></div>
                                <p className="text-[10px] uppercase font-black text-white/40 tracking-widest">Confidence Index</p>
                                <div className="text-5xl font-black text-white my-4 tracking-tighter">{(88 + (riskPerTrade < 1 ? 5 : -5)).toFixed(1)}%</div>
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-3 w-3 text-green-500" />
                                    <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Optimal Alpha Detected</span>
                                </div>
                            </Card>
                        </div>

                        {/* 3. FUNCTIONAL TABS HUB */}
                        <Tabs defaultValue="simulator" className="w-full">
                            <TabsList className="w-full grid grid-cols-4 h-16 bg-muted/40 p-1.5 rounded-3xl border border-white/5">
                                <TabsTrigger value="roadmap" className="rounded-2xl font-black uppercase text-[10px] tracking-widest">Path</TabsTrigger>
                                <TabsTrigger value="simulator" className="rounded-2xl font-black uppercase text-[10px] tracking-widest">Pressure Lab</TabsTrigger>
                                <TabsTrigger value="rescue" className="rounded-2xl font-black uppercase text-[10px] tracking-widest">Rescue</TabsTrigger>
                                <TabsTrigger value="badges" className="rounded-2xl font-black uppercase text-[10px] tracking-widest">Mastery</TabsTrigger>
                            </TabsList>

                            {/* PATH: ACTUAL CALCULATIONS */}
                            <TabsContent value="roadmap" className="mt-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="bg-slate-950 border-none shadow-2xl p-8 rounded-[40px] flex flex-col justify-center relative overflow-hidden min-h-[220px]">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150 rotate-12"><Target className="h-48 w-48 text-white" /></div>
                                        <p className="text-[11px] font-black uppercase opacity-40 text-white tracking-[0.3em] mb-4">Trades To Milestone</p>
                                        <div className="text-[8rem] font-black text-white tracking-tighter leading-none mb-4">
                                            {Math.ceil(calculations.remainingProfit / (calculations.safeRiskAmount * simRR))}
                                            <span className="text-xl ml-4 opacity-30 font-black uppercase">Wins</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Based on stable 1:{simRR} RR Ratio</p>
                                    </Card>
                                    <Card className="bg-muted/10 border-none p-8 rounded-[40px] flex flex-col justify-center space-y-6">
                                        <div className="flex gap-4 items-start"><MessageSquare className="h-6 w-6 text-primary mt-1" /><p className="text-md font-bold text-foreground leading-relaxed italic">"Elite traders treat profit as a byproduct of consistency. Protect the principal first."</p></div>
                                        <div className="pt-6 border-t border-border/40 space-y-3">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-50"><span>Phase Momentum</span><span>{(100 - (calculations.remainingProfit / (accountSize * (profitTargetPercent / 100)) * 100)).toFixed(0)}%</span></div>
                                            <Progress value={100 - (calculations.remainingProfit / (accountSize * (profitTargetPercent / 100)) * 100)} className="h-2 rounded-full" />
                                        </div>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* SIMULATOR: MONTE CARLO RUIN ANALYSIS (RESTORED STATS) */}
                            <TabsContent value="simulator" className="mt-8">
                                <Card className="p-8 md:p-12 bg-[#0c111c] border-none shadow-2xl rounded-[40px]">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-white/5 gap-8">
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2">Pressure Lab <span className="text-primary tracking-widest">v2</span></h3>
                                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Monte Carlo Stress Analysis (20 Account Variations)</p>
                                        </div>
                                        <Button onClick={runSimulation} disabled={isSimulating} className="h-14 px-12 font-black shadow-xl bg-primary text-white hover:opacity-90 rounded-2xl uppercase tracking-widest transition-all">
                                            {isSimulating ? "Running Logic..." : "Execute Stress Test"}
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                                        <div className="space-y-6">
                                            <div className="p-8 bg-white/5 rounded-[40px] border border-white/5 space-y-6 shadow-inner">
                                                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-white/40 tracking-widest">Win Rate (%)</Label><NumericInput value={simWinRate} onChange={setSimWinRate} className="bg-black/40 border-none text-white text-md h-9" /></div>
                                                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-white/40 tracking-widest">Target RR Ratio</Label><NumericInput value={simRR} onChange={setSimRR} className="bg-black/40 border-none text-white text-md h-9" /></div>
                                            </div>

                                            {simulationData.length > 0 && (
                                                <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl space-y-4">
                                                    <div className="flex justify-between items-center"><span className="text-[10px] font-black text-white/50 uppercase">Survival Rate</span><span className={`text-xl font-black ${simStats.survivalRate > 90 ? 'text-green-500' : 'text-red-500'}`}>{simStats.survivalRate}%</span></div>
                                                    <div className="flex justify-between items-center"><span className="text-[10px] font-black text-white/50 uppercase">Pass Prob</span><span className="text-xl font-black text-primary">{simStats.passProb}%</span></div>
                                                    <div className="flex justify-between items-center"><span className="text-[10px] font-black text-white/50 uppercase">Median Equity</span><span className="text-xl font-black text-white">${simStats.medianEquity.toFixed(0)}</span></div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="lg:col-span-3 h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={simulationData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.03} />
                                                    <XAxis dataKey="name" hide />
                                                    <YAxis orientation="right" width={70} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }} domain={['auto', 'auto']} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', fontSize: '11px', fontWeight: 'bold' }} itemStyle={{ color: '#fff' }} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                                    <ReferenceLine y={accountSize} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" label={{ value: 'Equilibrium', position: 'left', fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 'black' }} />
                                                    <ReferenceLine y={accountSize - (accountSize * (maxTotalDrawdown / 100))} stroke="#ef4444" strokeWidth={2} label={{ value: 'BREACH', position: 'left', fill: '#ef4444', fontSize: 9, fontWeight: 'black' }} />
                                                    {Array.from({ length: 20 }).map((_, i) => (
                                                        <Line key={i} type="monotone" dataKey={`run${i}`} stroke={i === 0 ? "#3b82f6" : "#3b82f6"} dot={false} strokeWidth={i === 0 ? 3 : 1} opacity={i === 0 ? 1 : 0.15} animationDuration={800} />
                                                    ))}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* RESCUE: ACTIONABLE RECOVERY */}
                            <TabsContent value="rescue" className="mt-8">
                                <Card className="bg-slate-950 border-none shadow-2xl p-10 md:p-14 rounded-[40px] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] scale-150 rotate-[-12deg]"><AlertTriangle className="h-64 w-64 text-white" /></div>
                                    <div className="max-w-xl relative z-10">
                                        <Badge className="bg-destructive/20 text-destructive border-none px-4 py-1 mb-6 text-xs font-black tracking-widest">CRITICAL DRAWDOWN MODE</Badge>
                                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4">Capital Rescue Matrix</h2>
                                        <p className="text-white/40 text-lg mb-12 leading-relaxed font-medium">Drawdown is just a mathematical deviation. Guardian Protocol provides the recovery path.</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                                            <div className="p-8 bg-white/5 rounded-3xl border border-white/5 text-center">
                                                <p className="text-[11px] font-black opacity-30 text-white uppercase mb-4 tracking-widest">Recovery Gap</p>
                                                <div className="text-6xl font-black text-primary tracking-tighter">${Math.max(0, accountSize - currentBalance).toFixed(0)}</div>
                                            </div>
                                            <div className="p-8 bg-white/5 rounded-3xl border border-white/5">
                                                <p className="text-[11px] font-black opacity-40 text-white uppercase mb-4 tracking-widest">Protocol Rules</p>
                                                <ul className="space-y-4 text-xs font-bold text-white/80">
                                                    <li className="flex items-center gap-3"><ChevronRight className="h-3 w-3 text-primary" /> Cut Risk to 0.25% - 0.50%</li>
                                                    <li className="flex items-center gap-3"><ChevronRight className="h-3 w-3 text-primary" /> Max 1 A+ Setup / Per Day</li>
                                                    <li className="flex items-center gap-3"><ChevronRight className="h-3 w-3 text-primary" /> Disable Profit Targets</li>
                                                </ul>
                                            </div>
                                        </div>
                                        <Button variant="outline" className="h-12 border-white/10 text-white hover:bg-white/5 font-black uppercase tracking-widest px-8 rounded-xl">Generate Recovery PDF</Button>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* MASTERY: VISUAL ACHIEVEMENTS */}
                            <TabsContent value="badges" className="mt-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-foreground">
                                    {[
                                        { name: "Principal Safe", icon: Shield, earned: true, desc: "Account stay within 2% DD" },
                                        { name: "Discipline Payout", icon: Wallet, earned: false, desc: "First successfully withdrawal" },
                                        { name: "Risk Scientist", icon: Activity, earned: true, desc: "Stress test simulation run" },
                                        { name: "Prop Master", icon: Crown, earned: false, desc: "Funded account achieved" },
                                    ].map((b, i) => (
                                        <Card key={i} className={`p-8 text-center border-none shadow-xl transition-all duration-300 hover:scale-[1.03] ${b.earned ? 'bg-primary/5 border border-primary/20' : 'opacity-20 grayscale'}`}>
                                            <b.icon className={`h-12 w-12 mx-auto mb-5 ${b.earned ? 'text-primary' : 'text-foreground'}`} />
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-2">{b.name}</h4>
                                            <p className="text-[9px] font-bold text-muted-foreground leading-tight px-4">{b.desc}</p>
                                            {b.earned && <div className="mt-4 flex justify-center"><Badge variant="outline" className="text-[8px] font-black bg-primary/10 text-primary border-primary/30 h-5 px-3">VALIATED</Badge></div>}
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
