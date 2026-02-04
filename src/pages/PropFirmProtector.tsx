import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Target, Activity, Zap, Settings2, RefreshCcw, AlertTriangle, Trash2, Edit3, TrendingUp, MessageSquare, Fingerprint, Copy, CheckCircle2, BrainCircuit, Wallet, Crown, Plus, ChevronRight, Scale } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
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

const NumericInput = ({ value, onChange, className, placeholder }: { value: number, onChange: (n: number) => void, className?: string, placeholder?: string }) => {
    const [localVal, setLocalVal] = useState(value.toString());
    useEffect(() => {
        if (parseFloat(localVal) !== value) setLocalVal(value.toString());
    }, [value]);
    return (
        <Input
            type="text"
            inputMode="decimal"
            value={localVal}
            placeholder={placeholder}
            className={`bg-muted/10 border-border/40 font-bold ${className}`}
            onChange={(e) => {
                const v = e.target.value;
                if (v === "" || v === "." || v === "0.") { setLocalVal(v); onChange(0); return; }
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
    const [assetClass, setAssetClass] = useState<string>("forex");
    const [accountSize, setAccountSize] = useState<number>(100000);
    const [currentBalance, setCurrentBalance] = useState<number>(100000);
    const [startOfDayBalance, setStartOfDayBalance] = useState<number>(100000);
    const [maxDailyDrawdown, setMaxDailyDrawdown] = useState<number>(5);
    const [maxTotalDrawdown, setMaxTotalDrawdown] = useState<number>(10);
    const [profitTargetPercent, setProfitTargetPercent] = useState<number>(10);
    const [stopLossPips, setStopLossPips] = useState<number>(20);
    const [riskPerTrade, setRiskPerTrade] = useState<number>(1);
    const [hypotheticalLotSize, setHypotheticalLotSize] = useState<number>(0);

    const [currentAccountSlot, setCurrentAccountSlot] = useState<number>(0);
    const [accountNames, setAccountNames] = useState<string[]>(["Challenge 1"]);
    const isSavingLocked = useRef(false);

    const [simWinRate, setSimWinRate] = useState(45);
    const [simRR, setSimRR] = useState(2);
    const [simulationData, setSimulationData] = useState<any[]>([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simStats, setSimStats] = useState({ survivalRate: 0, passProb: 0 });
    const [hasCopied, setHasCopied] = useState(false);

    // Persistence logic with safety checks
    useEffect(() => {
        try {
            const savedNames = localStorage.getItem("propFirmAccountNames");
            if (savedNames) {
                const parsed = JSON.parse(savedNames);
                if (Array.isArray(parsed)) setAccountNames(parsed);
            }
            const savedSettings = localStorage.getItem(`account_slot_${currentAccountSlot}`);
            if (savedSettings) {
                const p = JSON.parse(savedSettings);
                if (p) {
                    setSelectedFirm(p.selectedFirm || "ftmo");
                    setAssetClass(p.assetClass || "forex");
                    setAccountSize(Number(p.accountSize) || 100000);
                    setCurrentBalance(Number(p.currentBalance) || 100000);
                    setStartOfDayBalance(Number(p.startOfDayBalance) || 100000);
                    setMaxDailyDrawdown(Number(p.maxDailyDrawdown) || 5);
                    setMaxTotalDrawdown(Number(p.maxTotalDrawdown) || 10);
                    setProfitTargetPercent(Number(p.profitTargetPercent) || 10);
                    setStopLossPips(Number(p.stopLossPips) || 20);
                    setRiskPerTrade(Number(p.riskPerTrade) || 1);
                }
            }
        } catch (e) { console.error("Restore failed", e); }
    }, [currentAccountSlot]);

    useEffect(() => {
        if (isSavingLocked.current) return;
        const settings = { selectedFirm, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, riskPerTrade };
        localStorage.setItem(`account_slot_${currentAccountSlot}`, JSON.stringify(settings));
        localStorage.setItem("propFirmAccountNames", JSON.stringify(accountNames));
    }, [currentAccountSlot, selectedFirm, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, riskPerTrade, accountNames]);

    const calcs = useMemo(() => {
        const accSize = Number(accountSize) || 100000;
        const currBal = Number(currentBalance) || accSize;
        const startBal = Number(startOfDayBalance) || accSize;

        const dailyLimit = startBal * (maxDailyDrawdown / 100);
        const dailyFloor = startBal - dailyLimit;
        const dailyRemaining = Math.max(0, currBal - dailyFloor);

        const totalLimit = accSize * (maxTotalDrawdown / 100);
        const totalFloor = accSize - totalLimit;
        const totalRemaining = Math.max(0, currBal - totalFloor);

        const targetAmt = accSize * (profitTargetPercent / 100);
        const remainingProfit = Math.max(0, (accSize + targetAmt) - currBal);

        const riskAmt = currBal * (riskPerTrade / 100);
        const maxDrawdownPossible = Math.min(dailyRemaining, totalRemaining);
        const safeRisk = Math.min(riskAmt, maxDrawdownPossible * 0.95);

        const asset = ASSET_CLASSES[assetClass as keyof typeof ASSET_CLASSES] || ASSET_CLASSES.forex;
        const sl = Number(stopLossPips) || 1;
        const suggestedLots = safeRisk / (sl * asset.pipValue);

        const hLoss = (Number(hypotheticalLotSize) || 0) * sl * asset.pipValue;
        const dailyProg = dailyLimit > 0 ? ((startBal - currBal) / dailyLimit) * 100 : 0;
        const totalProg = targetAmt > 0 ? ((accSize + targetAmt - currBal) / targetAmt) * 100 : 0;

        return {
            dailyRemaining, totalRemaining, remainingProfit, safeRisk,
            suggestedLots: Math.max(0, suggestedLots),
            dailyLimit, hLoss,
            dailyProg: Math.max(0, Math.min(100, dailyProg)),
            totalProg: Math.max(0, Math.min(100, 100 - totalProg)),
            isImpactSafe: (dailyRemaining - hLoss) > (dailyLimit * 0.05)
        };
    }, [accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, assetClass, riskPerTrade, hypotheticalLotSize]);

    const runSim = () => {
        setIsSimulating(true);
        setTimeout(() => {
            const data = [];
            let survivors = 0; let passes = 0;
            const runs = 10; const trades = 40;
            const breachLvl = accountSize * (1 - maxTotalDrawdown / 100);
            const passLvl = accountSize * (1 + profitTargetPercent / 100);

            for (let r = 0; r < runs; r++) {
                let b = currentBalance;
                const key = `run${r}`;
                let failed = false; let passed = false;
                for (let t = 0; t < trades; t++) {
                    if (!failed) {
                        const win = Math.random() < (simWinRate / 100);
                        b += win ? (calcs.safeRisk * simRR) : -calcs.safeRisk;
                        if (b <= breachLvl) failed = true;
                        if (b >= passLvl) passed = true;
                    }
                    if (!data[t]) data[t] = { name: t };
                    data[t][key] = b;
                }
                if (!failed) survivors++;
                if (passed) passes++;
            }
            setSimulationData(data);
            setSimStats({ survivalRate: (survivors / runs) * 100, passProb: (passes / runs) * 100 });
            setIsSimulating(false);
        }, 500);
    };

    const copySize = () => {
        navigator.clipboard.writeText(calcs.suggestedLots.toFixed(2));
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
        toast.success("Lots copied!");
    };

    return (
        <Layout>
            <div className="container mx-auto p-4 md:p-6 max-w-[1400px] space-y-8 animate-in fade-in duration-500">

                {/* HEADER */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900 rounded-xl border border-white/10 shadow-xl"><Shield className="h-6 w-6 text-primary" /></div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black tracking-tight">Guardian AI</h1>
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-2 py-0">PRO</Badge>
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{accountNames[currentAccountSlot]}</p>
                        </div>
                    </div>
                    <div className="flex bg-muted/30 p-1 rounded-xl border items-center gap-1 overflow-x-auto max-w-full">
                        {accountNames.map((n, i) => (
                            <Button key={i} variant={currentAccountSlot === i ? "default" : "ghost"} size="sm" onClick={() => setCurrentAccountSlot(i)} className="h-8 px-4 text-[10px] font-bold uppercase rounded-lg">
                                {n}
                            </Button>
                        ))}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { const n = prompt("Slot Name:"); if (n) setAccountNames([...accountNames, n]); }}><Plus className="h-4 w-4" /></Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* SIDEBAR */}
                    <aside className="lg:col-span-3 space-y-6">
                        <Card className="rounded-2xl border-none shadow-sm bg-card">
                            <CardHeader className="pb-3 border-b bg-muted/5"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2"><Settings2 className="h-3.5 w-3.5" /> Parameters</CardTitle></CardHeader>
                            <CardContent className="p-5 space-y-4">
                                <div className="space-y-1"><Label className="text-[10px] uppercase font-black opacity-50">Balance ($)</Label><NumericInput value={currentBalance} onChange={setCurrentBalance} className="h-9" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-[10px] uppercase font-black opacity-50">Size</Label><NumericInput value={accountSize} onChange={setAccountSize} className="h-8" /></div>
                                    <div className="space-y-1"><Label className="text-[10px] uppercase font-black opacity-50">Stop Loss</Label><NumericInput value={stopLossPips} onChange={setStopLossPips} className="h-8" /></div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-black uppercase opacity-50"><span>Risk (%)</span><span>{riskPerTrade}%</span></div>
                                    <Slider value={[riskPerTrade]} min={0.1} max={3} step={0.1} onValueChange={v => setRiskPerTrade(v[0])} />
                                </div>
                                <div className="space-y-1"><Label className="text-[10px] uppercase font-black opacity-50">Asset</Label>
                                    <Select value={assetClass} onValueChange={setAssetClass}><SelectTrigger className="h-8 font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent>{Object.entries(ASSET_CLASSES).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent></Select>
                                </div>
                                <div className="space-y-1"><Label className="text-[10px] uppercase font-black opacity-50">Firm Profile</Label>
                                    <Select value={selectedFirm} onValueChange={v => { setSelectedFirm(v); const f = PROP_FIRM_PRESETS[v as keyof typeof PROP_FIRM_PRESETS]; if (f) { setMaxDailyDrawdown(f.dailyDD); setMaxTotalDrawdown(f.totalDD); } }}><SelectTrigger className="h-8 font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent>{Object.entries(PROP_FIRM_PRESETS).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent></Select>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 border-none rounded-2xl overflow-hidden">
                            <CardHeader className="bg-primary/20 p-3"><CardTitle className="text-[10px] font-black uppercase text-white tracking-widest">Pre-Trade Shield</CardTitle></CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <NumericInput value={hypotheticalLotSize} onChange={setHypotheticalLotSize} placeholder="Test Lots" className="bg-white/5 border-white/10 text-white h-8" />
                                {hypotheticalLotSize > 0 && (
                                    <div className={`p-3 rounded-xl border ${calcs.isImpactSafe ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                        <p className="text-[10px] font-black uppercase">{calcs.isImpactSafe ? 'Impact Safe' : 'Risk Breach'}</p>
                                        <p className="text-xs font-bold mt-1">Loss: -${calcs.hLoss.toFixed(0)}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </aside>

                    {/* MAIN */}
                    <main className="lg:col-span-9 space-y-6">
                        <Card className="bg-slate-950 border-none rounded-[32px] overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none transition-transform group-hover:scale-110"><Fingerprint className="h-48 w-48 text-primary" /></div>
                            <CardContent className="p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                                <div className="w-full text-center md:text-left">
                                    <Badge className="bg-primary text-white border-none px-3 py-1 mb-6 text-[10px] font-black uppercase tracking-widest">Recommended Execution</Badge>
                                    <div className="flex items-center justify-center md:justify-start gap-6 flex-wrap">
                                        <h2 className="text-8xl md:text-9xl font-black tracking-tighter text-white drop-shadow-[0_10px_30px_rgba(59,130,246,0.2)]">{calcs.suggestedLots.toFixed(2)}</h2>
                                        <Button size="icon" className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10" onClick={copySize}>{hasCopied ? <CheckCircle2 className="h-7 w-7 text-green-500" /> : <Copy className="h-7 w-7" />}</Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8 mt-10 pt-8 border-t border-white/5 text-left">
                                        <div className="space-y-1"><p className="text-[10px] font-black opacity-30 text-white uppercase tracking-widest">Risk Amount</p><p className="text-2xl font-black text-white">${calcs.safeRisk.toFixed(0)}</p></div>
                                        <div className="space-y-1"><p className="text-[10px] font-black opacity-30 text-white uppercase tracking-widest">Daily Limit</p><p className="text-2xl font-black text-white">${calcs.dailyLimit.toFixed(0)}</p></div>
                                    </div>
                                </div>
                                <div className="w-full md:w-[240px] bg-white/5 p-10 rounded-[40px] border border-white/10 text-center backdrop-blur-md">
                                    <p className="text-[10px] font-black opacity-40 text-white uppercase tracking-[0.3em] mb-2">Stop Loss</p>
                                    <p className="text-8xl font-black text-primary leading-none">{stopLossPips}</p>
                                    <p className="text-[10px] font-bold text-primary/40 uppercase mt-6 italic">Pips</p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="p-5 rounded-2xl border-l-4 border-orange-500 bg-card"><p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-3 flex justify-between">Daily Buffer <Badge className="h-4 px-1 text-[8px] border-none bg-orange-100 text-orange-600">{calcs.dailyProg.toFixed(1)}%</Badge></p><p className="text-3xl font-black tracking-tighter mb-3">${calcs.dailyRemaining.toFixed(0)}</p><Progress value={calcs.dailyProg} className="h-1.5" /></Card>
                            <Card className="p-5 rounded-2xl border-l-4 border-blue-500 bg-card"><p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-3 flex justify-between">Milestone <Badge className="h-4 px-1 text-[8px] border-none bg-blue-100 text-blue-600">{calcs.totalProg.toFixed(1)}%</Badge></p><p className="text-3xl font-black tracking-tighter text-blue-600 mb-3">${calcs.remainingProfit.toFixed(0)}</p><Progress value={calcs.totalProg} className="h-1.5" /></Card>
                            <Card className="p-5 rounded-2xl bg-slate-900 border-none relative overflow-hidden flex flex-col justify-center"><p className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-2">Alpha Level</p><p className="text-4xl font-black text-white tracking-tighter">{(85 + (riskPerTrade < 1 ? 5 : -5)).toFixed(1)}%</p><div className="flex items-center gap-1 mt-2"><TrendingUp className="h-3 w-3 text-green-500" /><span className="text-[8px] font-black text-green-500 uppercase">Optimal Window</span></div></Card>
                        </div>

                        <Tabs defaultValue="roadmap" className="w-full">
                            <TabsList className="w-full grid grid-cols-4 h-14 bg-muted/40 p-1.5 rounded-2xl border border-border/40">
                                <TabsTrigger value="roadmap" className="rounded-xl text-[10px] font-black uppercase tracking-widest">Path</TabsTrigger>
                                <TabsTrigger value="simulator" className="rounded-xl text-[10px] font-black uppercase tracking-widest">Lab</TabsTrigger>
                                <TabsTrigger value="rescue" className="rounded-xl text-[10px] font-black uppercase tracking-widest">Rescue</TabsTrigger>
                                <TabsTrigger value="mastery" className="rounded-xl text-[10px] font-black uppercase tracking-widest">Mastery</TabsTrigger>
                            </TabsList>

                            <TabsContent value="roadmap" className="mt-6">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                    <Card className="md:col-span-3 p-8 bg-slate-950 border-none rounded-[32px] min-h-[220px] flex flex-col justify-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150 rotate-12"><Target className="h-48 w-48 text-white" /></div>
                                        <p className="text-[11px] font-black opacity-30 text-white uppercase tracking-[0.3em] mb-4">Trades to Milestone</p>
                                        <div className="flex items-baseline gap-4"><p className="text-[7rem] font-black text-white leading-none tracking-tighter">{Math.ceil(calcs.remainingProfit / (calcs.safeRisk * simRR))}</p><span className="text-2xl font-black opacity-30 text-white">WINS</span></div>
                                        <p className="text-[9px] font-bold text-green-500 uppercase mt-6 flex items-center gap-1"><Zap className="h-3 w-3" /> Targeted at 1:{simRR} RR Ratio</p>
                                    </Card>
                                    <Card className="md:col-span-2 p-8 rounded-[32px] bg-muted/10 border-none flex flex-col justify-between">
                                        <div className="flex gap-3"><MessageSquare className="h-5 w-5 text-primary" /><p className="text-sm font-bold text-foreground leading-relaxed italic">"Manage the risk, and the profits will manage themselves."</p></div>
                                        <div className="pt-6 border-t space-y-3"><div className="flex justify-between text-[9px] font-black opacity-50 uppercase"><span>Momentum</span><span>{calcs.totalProg.toFixed(0)}%</span></div><Progress value={calcs.totalProg} className="h-2 rounded-full" /></div>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="simulator" className="mt-6">
                                <Card className="p-10 bg-slate-900 border-none rounded-[32px]">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-white/5 gap-8">
                                        <div><h3 className="text-xl font-black text-white uppercase italic tracking-tight">Pressure Lab</h3><p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Stochastic Ruin Modeling</p></div>
                                        <Button onClick={runSim} disabled={isSimulating} className="h-12 px-10 font-black rounded-xl bg-primary text-white tracking-widest">{isSimulating ? "Synthesizing..." : "Execute Test"}</Button>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                                        <div className="space-y-6">
                                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-6">
                                                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-white/30">Win Rate (%)</Label><NumericInput value={simWinRate} onChange={setSimWinRate} className="h-8 bg-black/40 border-none text-white font-bold" /></div>
                                                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-white/30">RR Factor</Label><NumericInput value={simRR} onChange={setSimRR} className="h-8 bg-black/40 border-none text-white font-bold" /></div>
                                            </div>
                                            {simulationData.length > 0 && (
                                                <div className="p-6 bg-primary/10 border border-primary/20 rounded-3xl space-y-4 animate-in slide-in-from-left">
                                                    <div className="flex justify-between items-center text-[10px] font-black"><span className="text-white/40 uppercase">Survival</span><span className={`text-xl ${simStats.survivalRate > 90 ? 'text-green-500' : 'text-red-500'}`}>{simStats.survivalRate}%</span></div>
                                                    <div className="flex justify-between items-center text-[10px] font-black border-t border-white/5 pt-3"><span className="text-white/40 uppercase">Pass Prob</span><span className="text-xl text-white">{simStats.passProb}%</span></div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="lg:col-span-3 h-[280px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={simulationData}>
                                                    <CartesianGrid vertical={false} opacity={0.03} />
                                                    <XAxis dataKey="name" hide />
                                                    <YAxis orientation="right" width={60} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} domain={['auto', 'auto']} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                                                    <ReferenceLine y={accountSize} stroke="rgba(255,255,255,0.1)" />
                                                    <ReferenceLine y={accountSize * (1 - maxTotalDrawdown / 100)} stroke="#ef4444" strokeWidth={2} label={{ value: 'BREACH', position: 'left', fill: '#ef4444', fontSize: 8, fontWeight: 'bold' }} />
                                                    {Array.from({ length: 10 }).map((_, i) => (
                                                        <Line key={i} type="monotone" dataKey={`run${i}`} stroke="#3b82f6" dot={false} strokeWidth={i === 0 ? 3 : 1} opacity={i === 0 ? 1 : 0.1} animationDuration={1000} />
                                                    ))}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>

                            <TabsContent value="rescue" className="mt-6">
                                <Card className="bg-slate-950 border-none rounded-[32px] p-10 flex flex-col md:flex-row items-center gap-10 overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-10 opacity-[0.02] rotate-[-15deg]"><Scale className="h-48 w-48 text-white" /></div>
                                    <div className="max-w-lg space-y-6 relative z-10 text-center md:text-left">
                                        <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-3 font-black">RESCUE MODE ACTIVE</Badge>
                                        <h2 className="text-5xl font-black text-white tracking-tighter">Strategic Recovery</h2>
                                        <p className="text-white/40 font-medium leading-relaxed italic">Discipline is the bridge between goals and accomplishment. Follow the guardian logic.</p>
                                        <div className="grid grid-cols-2 gap-6 pt-4">
                                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5"><p className="text-[10px] font-black opacity-30 uppercase text-white mb-2">Gap</p><p className="text-4xl font-black text-primary">${Math.max(0, accountSize - currentBalance).toFixed(0)}</p></div>
                                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 text-left"><p className="text-[10px] font-black opacity-30 uppercase text-white mb-3 tracking-widest">Logic</p><ul className="text-[9px] font-bold text-white/60 space-y-2"><li>● Risk: 0.25% Max</li><li>● Setup: A+ Only</li><li>● Frequency: Low</li></ul></div>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>

                            <TabsContent value="mastery" className="mt-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {[
                                        { n: "Safe Guard", i: Shield, e: true }, { n: "Payout", i: Wallet, e: false },
                                        { n: "Analyzed", i: Activity, e: true }, { n: "Phase Clear", i: Crown, e: false }
                                    ].map((b, i) => (
                                        <Card key={i} className={`p-8 text-center transition-transform hover:scale-105 ${b.e ? 'bg-primary/5 border-primary/20' : 'opacity-20 grayscale'}`}>
                                            <b.i className={`h-10 w-10 mx-auto mb-4 ${b.e ? 'text-primary' : ''}`} />
                                            <p className="text-[10px] font-black uppercase tracking-widest">{b.n}</p>
                                            {b.e && <Badge className="mt-4 bg-primary/10 text-primary border-none h-4 px-2 text-[8px]">ACTIVE</Badge>}
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
