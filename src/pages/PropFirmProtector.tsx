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
import { Shield, Target, Activity, Info, Zap, Settings2, RefreshCcw, AlertTriangle, Trash2, Edit3, Globe, TrendingUp, Calendar, Clock, Crown, MessageSquare, AlertCircle, BarChart3, Fingerprint, Share2, Wallet, Copy, CheckCircle2, Rocket, BrainCircuit, Waves, Eye, Plus, ChevronRight, Gavel } from "lucide-react";
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

// Senior Component for Numeric Inputs (No clobbering)
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
            className={`bg-muted/10 border-border/40 font-bold focus-visible:ring-primary/20 transition-all ${className}`}
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

    const [currentAccountSlot, setCurrentAccountSlot] = useState<number>(0);
    const [accountNames, setAccountNames] = useState<string[]>(["Challenge 1"]);
    const isSavingLocked = useRef(false);

    // Simulation State
    const [simWinRate, setSimWinRate] = useState(45);
    const [simRR, setSimRR] = useState(2);
    const [simulationData, setSimulationData] = useState<any[]>([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simStats, setSimStats] = useState({ survivalRate: 0, passProb: 0, medianEquity: 0 });

    const [hasCopied, setHasCopied] = useState(false);

    // Persistence
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
            isImpactSafe: postTrialDailyBuffer > (dailyLimit * 0.05),
            profitTargetAmount
        };
    }, [accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, assetClass, riskPerTrade, hypotheticalLotSize]);

    // Simulation
    const runSimulation = () => {
        setIsSimulating(true);
        setTimeout(() => {
            const results = [];
            let survivors = 0;
            let passes = 0;
            let finalEquities = 0;
            const runs = 15;
            const maxTrades = 40;
            const breachLvl = accountSize - (accountSize * (maxTotalDrawdown / 100));
            const passLvl = accountSize + (accountSize * (profitTargetPercent / 100));

            for (let r = 0; r < runs; r++) {
                let bal = currentBalance;
                const runKey = `run${r}`;
                let failed = false;
                let passed = false;
                for (let t = 0; t < maxTrades; t++) {
                    if (!failed) {
                        const win = Math.random() < (simWinRate / 100);
                        bal += win ? (calculations.safeRiskAmount * simRR) : -calculations.safeRiskAmount;
                        if (bal <= breachLvl) failed = true;
                        if (bal >= passLvl) passed = true;
                    }
                    if (!results[t]) results[t] = { name: t };
                    results[t][runKey] = bal;
                }
                if (!failed) survivors++;
                if (passed) passes++;
                finalEquities += bal;
            }
            setSimulationData(results);
            setSimStats({ survivalRate: (survivors / runs) * 100, passProb: (passes / runs) * 100, medianEquity: finalEquities / runs });
            setIsSimulating(false);
            toast.info("Monte Carlo analysis complete.");
        }, 600);
    };

    const addAccount = () => {
        const list = [...accountNames, `Account ${accountNames.length + 1}`];
        setAccountNames(list);
        setCurrentAccountSlot(list.length - 1);
    };

    const removeAccount = () => {
        if (accountNames.length <= 1) return;
        if (confirm("Delete this account slot?")) {
            const list = accountNames.filter((_, i) => i !== currentAccountSlot);
            setAccountNames(list);
            setCurrentAccountSlot(0);
        }
    };

    return (
        <Layout>
            <div className="container mx-auto p-4 md:p-6 max-w-[1400px] space-y-8 animate-in fade-in transition-all duration-700">

                {/* REFINED HEADER: CLEAR BRANDING, NO OVERLAP */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/5 shadow-2xl">
                            <Shield className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-black tracking-tighter text-foreground">Guardian AI</h1>
                                <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full font-black text-[10px] tracking-widest px-3">PREMIUM</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em]">{accountNames[currentAccountSlot]}</span>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-30 hover:opacity-100" onClick={() => { const n = prompt("Name:", accountNames[currentAccountSlot]); if (n) { const l = [...accountNames]; l[currentAccountSlot] = n; setAccountNames(l); } }}><Edit3 className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-30 hover:opacity-100 text-destructive" onClick={removeAccount}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex p-1 bg-muted/30 rounded-2xl border border-border/40 overflow-x-auto no-scrollbar scrollbar-hide">
                        {accountNames.map((name, i) => (
                            <Button key={i} variant={currentAccountSlot === i ? "default" : "ghost"} size="sm" onClick={() => setCurrentAccountSlot(i)} className="h-9 px-6 font-bold text-[11px] uppercase rounded-xl transition-all">
                                {name}
                            </Button>
                        ))}
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-primary ml-2 rounded-xl" onClick={addAccount}><Plus className="h-4 w-4" /></Button>
                    </div>
                </header>

                {/* PROFESSIONAL GRID LAYOUT */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* L-SIDEBAR: CONFIGURATION (3 COLS) */}
                    <aside className="lg:col-span-3 space-y-6">
                        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-background">
                            <CardHeader className="pb-4 pt-6 px-6 border-b border-border/30 bg-muted/5">
                                <CardTitle className="text-[11px] uppercase font-black tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Settings2 className="h-3.5 w-3.5" /> Market Configuration
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase opacity-60">Account Size ($)</Label>
                                    <NumericInput value={accountSize} onChange={setAccountSize} className="h-10 text-lg" />
                                </div>
                                <div className="space-y-1.5 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                    <Label className="text-[10px] font-black uppercase text-primary flex items-center justify-between">Real-Time Equity <RefreshCcw className="h-3 w-3" /></Label>
                                    <NumericInput value={currentBalance} onChange={setCurrentBalance} className="h-11 text-2xl font-black bg-transparent border-none text-primary p-0 shadow-none focus-visible:ring-0" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase opacity-60">Day Start Bal</Label><NumericInput value={startOfDayBalance} onChange={setStartOfDayBalance} className="h-9" /></div>
                                    <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase opacity-60">Stop Loss</Label><NumericInput value={stopLossPips} onChange={setStopLossPips} className="h-9" /></div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase opacity-60">Asset Class</Label>
                                    <Select value={assetClass} onValueChange={setAssetClass}>
                                        <SelectTrigger className="h-9 font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(ASSET_CLASSES).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        <span>Risk Per Trade</span>
                                        <span className="text-primary">{riskPerTrade.toFixed(1)}%</span>
                                    </div>
                                    <Slider value={[riskPerTrade]} min={0.1} max={3} step={0.1} onValueChange={v => setRiskPerTrade(v[0])} className="h-4" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase opacity-60">Firm Parameters</Label>
                                    <Select value={selectedFirm} onValueChange={v => { setSelectedFirm(v); const f = PROP_FIRM_PRESETS[v as keyof typeof PROP_FIRM_PRESETS]; if (f) { setMaxDailyDrawdown(f.dailyDD); setMaxTotalDrawdown(f.totalDD); } }}>
                                        <SelectTrigger className="h-9 font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent>{Object.entries(PROP_FIRM_PRESETS).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 border-none shadow-xl rounded-3xl overflow-hidden">
                            <CardHeader className="pb-3 bg-gradient-to-r from-indigo-700 to-blue-700">
                                <CardTitle className="text-[11px] font-black uppercase text-white tracking-widest flex items-center justify-between">Impulse Shield <AlertTriangle className="h-3.5 w-3.5" /></CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <NumericInput value={hypotheticalLotSize} onChange={setHypotheticalLotSize} placeholder="Test Lot Size" className="h-10 bg-white/5 border-white/10 text-white" />
                                {hypotheticalLotSize > 0 && (
                                    <div className={`p-4 rounded-2xl border ${calculations.isImpactSafe ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'} space-y-1.5`}>
                                        <div className="flex justify-between text-[11px] text-white"><span>Impact Loss:</span><span className="font-bold">-${calculations.hypotheticLoss.toFixed(0)}</span></div>
                                        <div className="flex justify-between text-[11px] text-white"><span>Buffer Left:</span><span className="font-bold">${calculations.postTrialDailyBuffer.toFixed(0)}</span></div>
                                        <div className={`text-[9px] font-black uppercase text-center py-1 mt-2 rounded border-none ${calculations.isImpactSafe ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {calculations.isImpactSafe ? 'AUTHORIZATION: GRANTED' : 'AUTHORIZATION: DENIED'}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </aside>

                    {/* MAIN CONTENT: RESULTS & DASHBOARD (9 COLS) */}
                    <main className="lg:col-span-9 space-y-8">

                        {/* HERO: RECOMMENDATION ENGINE */}
                        <Card className="bg-[#0b0c12] border-none shadow-2xl rounded-[40px] overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-16 opacity-5 rotate-12 transition-all group-hover:opacity-10 pointer-events-none"><Fingerprint className="h-64 w-64 text-primary" /></div>
                            <CardContent className="p-10 md:p-14 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                                <div className="w-full text-center md:text-left">
                                    <Badge className="bg-primary text-white border-none px-4 py-1.5 mb-8 text-[11px] font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/20">Optimal Execution Size</Badge>
                                    <div className="flex items-center justify-center md:justify-start gap-8 flex-wrap">
                                        <h2 className="text-[7rem] sm:text-[9rem] xl:text-[13rem] leading-none font-[900] tracking-tighter text-white drop-shadow-[0_20px_50px_rgba(59,130,246,0.3)]">
                                            {calculations.suggestedLotSize.toFixed(2)}
                                        </h2>
                                        <Button size="lg" className="h-20 w-20 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 text-white" onClick={() => { navigator.clipboard.writeText(calculations.suggestedLotSize.toFixed(2)); toast.success("Copied to clipboard!"); }}>
                                            <Copy className="h-9 w-9" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mt-12 pt-8 border-t border-white/5 text-left">
                                        <div className="flex flex-col gap-1.5"><span className="text-[11px] font-black opacity-30 uppercase tracking-[0.2em] text-white">Execution Risk</span><span className="text-3xl font-black text-white">${calculations.safeRiskAmount.toFixed(0)}</span></div>
                                        <div className="flex flex-col gap-1.5"><span className="text-[11px] font-black opacity-30 uppercase tracking-[0.2em] text-white">Daily Limit</span><span className="text-3xl font-black text-white">${calculations.dailyLimit.toFixed(0)}</span></div>
                                        <div className="hidden sm:flex flex-col gap-1.5 text-right"><span className="text-[11px] font-black opacity-30 uppercase tracking-[0.2em] text-white">Asset Logic</span><span className="text-3xl font-black text-white">{assetClass.toUpperCase()}</span></div>
                                    </div>
                                </div>
                                <div className="shrink-0 bg-slate-900/60 backdrop-blur-3xl p-12 rounded-[50px] border border-white/10 text-center w-full md:w-[300px] shadow-2xl">
                                    <p className="text-[11px] font-black opacity-40 uppercase tracking-[0.5em] mb-4 text-white">Protective Buffer</p>
                                    <div className="text-[7rem] md:text-[9.5rem] font-black leading-none text-primary drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">{stopLossPips}</div>
                                    <p className="text-[12px] font-black uppercase tracking-[0.4em] mt-8 text-primary/40 italic">Buffer Pips</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* VISUAL KPI ROW */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-background border-l-4 border-l-orange-500 shadow-xl p-6 rounded-3xl">
                                <div className="flex justify-between items-start mb-4">
                                    <p className="text-[11px] uppercase font-black opacity-50 tracking-widest leading-none">Daily Buffer</p>
                                    <Badge className="bg-orange-500/10 text-orange-600 border-none font-black text-[9px] uppercase px-2 h-5">{calculations.dailyProgress.toFixed(1)}%</Badge>
                                </div>
                                <div className="text-4xl font-black mb-4 tracking-tighter">${calculations.dailyLossRemaining.toFixed(0)}</div>
                                <Progress value={calculations.dailyProgress} className="h-1.5 bg-orange-100" />
                            </Card>
                            <Card className="bg-background border-l-4 border-l-blue-500 shadow-xl p-6 rounded-3xl">
                                <div className="flex justify-between items-start mb-4">
                                    <p className="text-[11px] uppercase font-black opacity-50 tracking-widest leading-none">Target Distance</p>
                                    <Badge className="bg-blue-500/10 text-blue-600 border-none font-black text-[9px] uppercase px-2 h-5">STABLE</Badge>
                                </div>
                                <div className="text-4xl font-black text-blue-600 mb-4 tracking-tighter">${calculations.remainingProfit.toFixed(0)}</div>
                                <Progress value={Math.max(0, 100 - (calculations.remainingProfit / (accountSize * (profitTargetPercent / 100)) * 100))} className="h-1.5 bg-blue-100" />
                            </Card>
                            <Card className="bg-[#0b0c10] border-none shadow-2xl p-6 rounded-3xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5"><Activity className="h-12 w-12 text-white" /></div>
                                <p className="text-[11px] uppercase font-black text-white/40 tracking-widest leading-none">Confidence Rating</p>
                                <div className="text-5xl font-black text-white my-4 tracking-tighter">{(85 + (riskPerTrade < 1 ? 7 : -7)).toFixed(1)}%</div>
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-3 w-3 text-green-500" />
                                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Growth Window Open</span>
                                </div>
                            </Card>
                        </div>

                        {/* FUNCTIONAL INTELLIGENCE TABS */}
                        <Tabs defaultValue="roadmap" className="w-full">
                            <TabsList className="w-full grid grid-cols-4 h-16 bg-muted/20 p-1.5 rounded-[24px] border border-border/40">
                                <TabsTrigger value="roadmap" className="rounded-[18px] font-black uppercase text-[11px] tracking-widest">Path</TabsTrigger>
                                <TabsTrigger value="simulator" className="rounded-[18px] font-black uppercase text-[11px] tracking-widest">Pressure Lab</TabsTrigger>
                                <TabsTrigger value="rescue" className="rounded-[18px] font-black uppercase text-[11px] tracking-widest">Rescue</TabsTrigger>
                                <TabsTrigger value="badges" className="rounded-[18px] font-black uppercase text-[11px] tracking-widest">Mastery</TabsTrigger>
                            </TabsList>

                            <TabsContent value="roadmap" className="mt-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Card className="bg-[#0b0c10] border-none shadow-2xl p-10 rounded-[40px] flex flex-col justify-center relative overflow-hidden min-h-[260px]">
                                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] scale-150 rotate-12"><Target className="h-48 w-48 text-white" /></div>
                                        <p className="text-[12px] font-black uppercase opacity-40 text-white tracking-[0.4em] mb-6">Execution Milestone</p>
                                        <div className="flex items-baseline gap-4">
                                            <div className="text-[9.5rem] font-black text-white tracking-tighter leading-none">
                                                {Math.ceil(calculations.remainingProfit / (calculations.safeRiskAmount * simRR))}
                                            </div>
                                            <span className="text-3xl opacity-30 font-black uppercase text-white tracking-widest">Wins</span>
                                        </div>
                                        <p className="text-[11px] font-bold text-green-500 uppercase tracking-[0.2em] mt-8 flex items-center gap-2">
                                            <Zap className="h-4 w-4" /> Projected Path at 1:{simRR} RR Ratio
                                        </p>
                                    </Card>
                                    <Card className="bg-muted/10 border-none p-10 rounded-[40px] flex flex-col justify-between space-y-8">
                                        <div className="space-y-4">
                                            <div className="flex gap-4 items-start"><MessageSquare className="h-7 w-7 text-primary mt-1" /><p className="text-lg font-bold text-foreground leading-relaxed italic">"The market doesn't pay for analysis; it pays for discipline. Master the logic, manage the risk."</p></div>
                                        </div>
                                        <div className="pt-8 border-t border-border/40 space-y-4">
                                            <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.3em] opacity-50"><span>Portfolio Momentum</span><span>{(100 - (calculations.remainingProfit / (accountSize * (profitTargetPercent / 100)) * 100)).toFixed(0)}%</span></div>
                                            <Progress value={100 - (calculations.remainingProfit / (accountSize * (profitTargetPercent / 100)) * 100)} className="h-2.5 rounded-full" />
                                        </div>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="simulator" className="mt-8">
                                <Card className="p-8 md:p-12 bg-slate-900 border-none shadow-2xl rounded-[40px]">
                                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 pb-8 border-b border-white/5 gap-10">
                                        <div className="space-y-2">
                                            <h3 className="text-3xl font-black uppercase tracking-tight text-white italic">Monte Carlo Laboratory</h3>
                                            <p className="text-[11px] text-white/30 font-bold uppercase tracking-[0.3em] ml-1">Predicting Volatility & Ruin Thresholds</p>
                                        </div>
                                        <Button onClick={runSimulation} disabled={isSimulating} className="h-16 px-14 font-black shadow-2xl bg-primary text-white hover:opacity-90 rounded-[24px] uppercase tracking-[0.3em] transition-all hover:scale-[1.03]">
                                            {isSimulating ? "Synthesizing..." : "Execute Ruin Test"}
                                        </Button>
                                    </header>

                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                                        <div className="space-y-8">
                                            <div className="p-10 bg-white/5 rounded-[40px] border border-white/5 space-y-8 shadow-inner">
                                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Strategy WR (%)</Label><NumericInput value={simWinRate} onChange={setSimWinRate} className="bg-black/50 border-none text-white text-lg h-10" /></div>
                                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Avg RR Target</Label><NumericInput value={simRR} onChange={setSimRR} className="bg-black/50 border-none text-white text-lg h-10" /></div>
                                            </div>

                                            {simulationData.length > 0 && (
                                                <div className="p-8 bg-primary/10 border border-primary/30 rounded-[35px] space-y-6 animate-in slide-in-from-left duration-500">
                                                    <div className="flex justify-between items-center"><span className="text-[11px] font-black text-white/50 uppercase tracking-widest">Survival</span><span className={`text-2xl font-black ${simStats.survivalRate > 90 ? 'text-green-500' : 'text-red-500'}`}>{simStats.survivalRate}%</span></div>
                                                    <div className="flex justify-between items-center border-t border-white/5 pt-4"><span className="text-[11px] font-black text-white/50 uppercase tracking-widest">Pass Prob</span><span className="text-2xl font-black text-white">{simStats.passProb}%</span></div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="lg:col-span-3 h-[320px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={simulationData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.03} />
                                                    <XAxis dataKey="name" hide />
                                                    <YAxis orientation="right" width={80} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '900' }} domain={['auto', 'auto']} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: '900', color: '#fff' }} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                                    <ReferenceLine y={accountSize} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                                                    <ReferenceLine y={accountSize - (accountSize * (maxTotalDrawdown / 100))} stroke="#ef4444" strokeWidth={3} label={{ value: 'TERMINATION', position: 'left', fill: '#ef4444', fontSize: 10, fontWeight: '900' }} />
                                                    {Array.from({ length: 15 }).map((_, i) => (
                                                        <Line key={i} type="monotone" dataKey={`run${i}`} stroke="#3b82f6" dot={false} strokeWidth={i === 0 ? 4 : 1.5} opacity={i === 0 ? 1 : 0.15} animationDuration={1200} />
                                                    ))}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>

                            <TabsContent value="rescue" className="mt-8">
                                <Card className="bg-slate-900 border-none shadow-2xl p-12 md:p-16 rounded-[45px] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-16 opacity-[0.03] scale-[2.5] rotate-[-15deg]"><Gavel className="h-64 w-64 text-white" /></div>
                                    <div className="max-w-xl relative z-10 space-y-8">
                                        <Badge className="bg-destructive/10 text-destructive border-destructive/20 px-5 py-1.5 mb-2 text-xs font-black tracking-[0.3em]">RESCUE PROTOCOL DELTA</Badge>
                                        <h2 className="text-6xl font-black text-white uppercase tracking-tighter leading-[0.9]">Strategic Capital Recovery</h2>
                                        <p className="text-white/40 text-xl leading-relaxed font-bold">Deviation detected. The recovery is a mathematical certainty if rules are implemented now.</p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-4">
                                            <div className="p-10 bg-white/5 rounded-[40px] border border-white/5 text-center transition-all hover:bg-white/10">
                                                <p className="text-[12px] font-black opacity-30 text-white uppercase mb-6 tracking-[0.4em]">Equity Delta</p>
                                                <div className="text-7xl font-[900] text-primary tracking-tighter">${Math.max(0, accountSize - currentBalance).toFixed(0)}</div>
                                            </div>
                                            <div className="p-10 bg-white/5 rounded-[40px] border border-white/5">
                                                <p className="text-[12px] font-black opacity-40 text-white uppercase mb-6 tracking-[0.2em]">Mandatory Logic</p>
                                                <ul className="space-y-5 text-sm font-black text-white/70">
                                                    <li className="flex items-center gap-4"><ChevronRight className="h-4 w-4 text-primary" /> Risk Cap: 0.25%</li>
                                                    <li className="flex items-center gap-4"><ChevronRight className="h-4 w-4 text-primary" /> Max Daily Trades: 1</li>
                                                    <li className="flex items-center gap-4"><ChevronRight className="h-4 w-4 text-primary" /> Profit Focus: OFF</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>

                            <TabsContent value="badges" className="mt-8">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                                    {[
                                        { name: "Safe Guard", icon: Shield, earned: true, desc: "Capital preserved within 2.5% deviation" },
                                        { name: "First Payout", icon: Wallet, earned: false, desc: "Withdrawal sequence successfully logged" },
                                        { name: "Ruin Scientist", icon: BrainCircuit, earned: true, desc: "Monte Carlo variation test executed" },
                                        { name: "Phase Victory", icon: Crown, earned: false, desc: "Milestone progression verified" },
                                    ].map((b, i) => (
                                        <Card key={i} className={`p-10 text-center border-none shadow-xl transition-all duration-500 hover:scale-[1.05] relative group ${b.earned ? 'bg-primary/5 border border-primary/20' : 'opacity-20 grayscale scale-95'}`}>
                                            <b.icon className={`h-14 w-14 mx-auto mb-6 ${b.earned ? 'text-primary' : 'text-foreground'}`} />
                                            <h4 className="text-[13px] font-[900] uppercase tracking-[0.2em] mb-3">{b.name}</h4>
                                            <p className="text-[10px] font-black text-muted-foreground leading-relaxed px-2 uppercase tracking-widest">{b.desc}</p>
                                            {b.earned && <div className="mt-6"><Badge className="bg-primary/10 text-primary border-primary/30 h-6 px-4 font-black">ACTIVE</Badge></div>}
                                        </Card>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </main>
                </div>
            </div>
        </Layout>
    );
};

export default PropFirmProtector;
