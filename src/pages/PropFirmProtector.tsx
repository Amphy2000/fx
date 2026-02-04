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
import { Shield, Target, Activity, Info, Zap, Settings2, RefreshCcw, AlertTriangle, Trash2, Edit3, Globe, TrendingUp, Calendar, Clock, Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
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
    const [phase, setPhase] = useState<string>("phase1"); // phase1, phase2, funded
    const [assetClass, setAssetClass] = useState<string>("forex");
    const [accountSize, setAccountSize] = useState<number>(100000);
    const [currentBalance, setCurrentBalance] = useState<number>(100000);
    const [startOfDayBalance, setStartOfDayBalance] = useState<number>(100000);
    const [maxDailyDrawdown, setMaxDailyDrawdown] = useState<number>(5);
    const [maxTotalDrawdown, setMaxTotalDrawdown] = useState<number>(10);
    const [profitTargetPercent, setProfitTargetPercent] = useState<number>(10);
    const [stopLossPips, setStopLossPips] = useState<number>(20);
    const [riskPerTrade, setRiskPerTrade] = useState<number>(1);

    const [currentAccountSlot, setCurrentAccountSlot] = useState<number>(0);
    const [accountNames, setAccountNames] = useState<string[]>(["Challenge 1"]);
    const [selectedMt5AccountId, setSelectedMt5AccountId] = useState<string | null>(null);

    const isSavingLocked = useRef(false);

    // Default Stats for Newbies (Conservative Pro Averages)
    const [simWinRate, setSimWinRate] = useState(45);
    const [simRR, setSimRR] = useState(2);
    const [useManualStats, setUseManualStats] = useState(true);
    const [simulationData, setSimulationData] = useState<any[]>([]);
    const [simulationStats, setSimulationStats] = useState<{ pass: number; breach: number } | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);

    // Adjust target based on phase
    useEffect(() => {
        if (phase === "phase1") setProfitTargetPercent(10);
        else if (phase === "phase2") setProfitTargetPercent(5);
        else setProfitTargetPercent(0); // Funded
    }, [phase]);

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

    // Save Persistence
    useEffect(() => {
        if (isSavingLocked.current) return;
        const timer = setTimeout(() => {
            const settings = { selectedFirm, phase, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, riskPerTrade, selectedMt5AccountId };
            localStorage.setItem(`propFirmSettings_slot_${currentAccountSlot}`, JSON.stringify(settings));
        }, 500);
        return () => clearTimeout(timer);
    }, [currentAccountSlot, selectedFirm, phase, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, riskPerTrade, selectedMt5AccountId]);

    // Sync Accounts
    const { data: mt5Accounts } = useQuery({
        queryKey: ['mt5-accounts-list'],
        queryFn: async () => {
            const { data } = await supabase.from('mt5_accounts').select('id, broker_name, account_number').eq('is_active', true);
            return data || [];
        }
    });

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

        // Pass Projection logic
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
        };
    }, [accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, assetClass, riskPerTrade, simWinRate, simRR]);

    const addAccountSlot = () => {
        const newNames = [...accountNames, `Account ${accountNames.length + 1}`];
        setAccountNames(newNames);
        setCurrentAccountSlot(newNames.length - 1);
        toast.success("Account slot added");
    };

    const removeAccountSlot = () => {
        if (accountNames.length <= 1) return toast.error("One account required");
        if (window.confirm(`Delete "${accountNames[currentAccountSlot]}" and its settings?`)) {
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
            toast.success("Account removed");
            setTimeout(() => isSavingLocked.current = false, 1000);
        }
    };

    const handleNumInput = (val: string, setter: (n: number) => void) => {
        if (val === "") { setter(0); return; }
        const num = parseFloat(val);
        if (!isNaN(num)) setter(num);
    };

    return (
        <Layout>
            <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Prop Firm Protector</h1>
                        <Badge variant="outline" className="text-primary border-primary mt-1">v2.1 Idolo Edition</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/50">
                        {accountNames.map((name, idx) => (
                            <Button key={idx} variant={currentAccountSlot === idx ? "default" : "ghost"} size="sm" onClick={() => setCurrentAccountSlot(idx)} className="h-8 text-xs px-4">{name}</Button>
                        ))}
                        <Button variant="outline" size="sm" onClick={addAccountSlot} className="h-8 w-8 p-0 border-dashed"><Zap className="h-4 w-4" /></Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Column 1: Config */}
                    <div className="space-y-6">
                        <Card className="border-t-4 border-t-primary shadow-sm">
                            <CardHeader className="pb-3 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-lg flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /> Setup</CardTitle>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const n = window.prompt("Rename:", accountNames[currentAccountSlot]); if (n) { const l = [...accountNames]; l[currentAccountSlot] = n; setAccountNames(l); } }}><Edit3 className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={removeAccountSlot}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Account Phase</Label>
                                    <Select value={phase} onValueChange={setPhase}>
                                        <SelectTrigger className="h-9 font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="phase1">Phase 1 Challenge (10%)</SelectItem>
                                            <SelectItem value="phase2">Phase 2 Verification (5%)</SelectItem>
                                            <SelectItem value="funded">Funded (Payout Mode)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-[10px] uppercase font-bold">Account Size</Label><Input className="h-8" value={accountSize === 0 ? "" : accountSize} type="number" onChange={e => handleNumInput(e.target.value, setAccountSize)} /></div>
                                    <div className="space-y-1"><Label className="text-[10px] uppercase font-bold">Daily Start Eq</Label><Input className="h-8" value={startOfDayBalance === 0 ? "" : startOfDayBalance} type="number" onChange={e => handleNumInput(e.target.value, setStartOfDayBalance)} /></div>
                                </div>

                                <div className="space-y-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
                                    <Label className="text-[10px] font-black uppercase text-primary">Live Equity</Label>
                                    <Input className="h-10 text-xl font-black bg-transparent border-none shadow-none text-primary" value={currentBalance === 0 ? "" : currentBalance} type="number" onChange={e => handleNumInput(e.target.value, setCurrentBalance)} />
                                </div>

                                <div className="space-y-3 p-4 bg-muted/30 rounded-2xl border">
                                    <div className="flex justify-between items-center text-xs font-bold"><span>TRADE RISK %</span><Badge className="bg-primary text-white">{riskPerTrade}%</Badge></div>
                                    <Slider value={[riskPerTrade]} min={0.1} max={3} step={0.1} onValueChange={v => setRiskPerTrade(v[0])} />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-[10px] font-bold uppercase">Stop Loss (Pips)</Label><Input className="h-8 font-bold" value={stopLossPips === 0 ? "" : stopLossPips} type="number" onChange={e => handleNumInput(e.target.value, setStopLossPips)} /></div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase">Firm</Label>
                                        <Select value={selectedFirm} onValueChange={v => { setSelectedFirm(v); const f = PROP_FIRM_PRESETS[v as keyof typeof PROP_FIRM_PRESETS]; if (f) { setMaxDailyDrawdown(f.dailyDD); setMaxTotalDrawdown(f.totalDD); } }}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PROP_FIRM_PRESETS).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent></Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-amber-500/10 border-amber-500/20 shadow-sm">
                            <CardContent className="pt-4 flex items-start gap-3">
                                <Clock className="h-4 w-4 text-amber-600 mt-1" />
                                <div className="text-[11px] leading-tight text-amber-800">Professional traders risk 50% less during high-impact news. Check your calendar.</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Column 2&3: Visualizer */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-orange-500 shadow-sm transition-transform hover:scale-[1.01]">
                                <CardHeader className="pb-1"><CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Daily Floor Buffer</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-black tracking-tighter">${calculations.dailyLossRemaining.toFixed(0)}</div>
                                    <p className="text-[10px] font-bold uppercase mt-1 opacity-50">Remaining capacity for today</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-blue-500 shadow-sm transition-transform hover:scale-[1.01]">
                                <CardHeader className="pb-1"><CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{phase === 'funded' ? 'Next Payout Goal' : 'Required to Pass'}</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-black tracking-tighter text-blue-600">${calculations.remainingProfit.toFixed(0)}</div>
                                    <p className="text-[10px] font-bold uppercase mt-1 opacity-50">{phase === 'funded' ? 'Secure the bag' : `Target: ${profitTargetPercent}%`}</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-[#0f172a] text-white border-none shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Crown className="h-24 w-24 text-primary" /></div>
                            <CardContent className="pt-10 pb-10">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                                    <div>
                                        <Badge className="bg-primary text-white border-none px-4 py-1 mb-4 text-[11px] font-bold">RECOMMENDED LOT SIZE</Badge>
                                        <div className="text-[11rem] leading-[1] font-black tracking-tighter drop-shadow-2xl text-white">{calculations.suggestedLotSize.toFixed(2)}</div>
                                        <div className="flex gap-8 mt-6">
                                            <div className="flex flex-col"><span className="text-[11px] font-bold opacity-50 uppercase tracking-widest">Safe Risk</span><span className="text-2xl font-black">${calculations.safeRiskAmount.toFixed(0)}</span></div>
                                            <div className="w-px h-12 bg-white/10" />
                                            <div className="flex flex-col"><span className="text-[11px] font-bold opacity-50 uppercase tracking-widest">Asset Scale</span><span className="text-2xl font-black">{assetClass === 'gold' ? 'GOLD' : 'FOREX'}</span></div>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 text-center min-w-[200px] shadow-2xl">
                                        <p className="text-xs font-bold opacity-40 uppercase tracking-widest mb-2">Stop Loss</p>
                                        <div className="text-[6rem] leading-[1] font-black">{stopLossPips}</div>
                                        <p className="text-[11px] font-extrabold opacity-40 tracking-widest uppercase mt-2">Pips</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Tabs defaultValue="recovery" className="w-full">
                            <TabsList className="w-full grid grid-cols-3 h-14 bg-muted/40 p-1.5 rounded-2xl">
                                <TabsTrigger value="recovery" className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Account Rescue</TabsTrigger>
                                <TabsTrigger value="simulator" className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Stress Test</TabsTrigger>
                                <TabsTrigger value="roadmap" className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Funding Roadmap</TabsTrigger>
                            </TabsList>

                            <TabsContent value="recovery" className="mt-6">
                                <Card className="bg-muted/10 border-none shadow-none">
                                    <CardHeader className="pb-4"><CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-primary opacity-80"><Shield className="h-4 w-4" /> Account Rescue</CardTitle></CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Card className="bg-[#0c111d] border-none shadow-lg">
                                                <CardContent className="p-8">
                                                    <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-4">To Breakeven</p>
                                                    <div className="text-6xl font-black text-primary tracking-tighter">${(accountSize - currentBalance < 0 ? 0 : accountSize - currentBalance).toFixed(0)}</div>
                                                </CardContent>
                                            </Card>
                                            <Card className="bg-[#0c111d] border-none shadow-lg">
                                                <CardContent className="p-8">
                                                    <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-4 text-destructive">Breach Floor</p>
                                                    <div className="text-6xl font-black text-destructive tracking-tighter">${calculations.totalLossRemaining.toFixed(0)}</div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {currentBalance < accountSize && (
                                            <Alert className="bg-[#0c111d] border-primary/20 p-6 rounded-[24px]">
                                                <AlertTriangle className="h-5 w-5 text-primary" />
                                                <AlertDescription className="text-sm font-medium opacity-80 pl-2 leading-relaxed">
                                                    Strategy: Reduce risk to <strong>0.5%</strong>. You need precisely <strong>{Math.ceil((accountSize - currentBalance) / (calculations.safeRiskAmount * 1.5))}</strong> wins (at 1:1.5 RR) to reach breakeven safely.
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-[10px] font-black opacity-40 uppercase tracking-widest"><span>Survival Health</span><span>{calculations.totalProgress.toFixed(1)}% Usage</span></div>
                                            <Progress value={calculations.totalProgress} className="h-3 rounded-full" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="simulator" className="mt-6">
                                <Card className="p-8 pt-4">
                                    <div className="flex justify-between items-center mb-10 pb-4 border-b">
                                        <h3 className="text-md font-bold uppercase tracking-widest">Monte Carlo Survival Prediction</h3>
                                        <Button size="sm" onClick={() => setIsSimulating(true)} disabled={isSimulating} className="h-9 px-8 font-black shadow-primary/20 shadow-xl">{isSimulating ? "..." : "Launch Test"}</Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                                        <div className="space-y-6">
                                            <div className="p-5 bg-muted/40 rounded-3xl space-y-5 border">
                                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Win Rate %</Label><Input value={simWinRate} type="number" onChange={e => handleNumInput(e.target.value, setSimWinRate)} className="h-9 font-black" /></div>
                                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Avg RR</Label><Input value={simRR} type="number" onChange={e => handleNumInput(e.target.value, setSimRR)} className="h-9 font-black" /></div>
                                            </div>
                                            <p className="text-[10px] italic text-muted-foreground leading-snug">This predicts if your strategy can survive a 20-trade variance streak without hitting the breach floor.</p>
                                        </div>
                                        <div className="md:col-span-3 border-l pl-8">
                                            <div className="h-[200px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={simulationData}><CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} /><Line type="monotone" dataKey="run0" stroke="#8884d8" dot={false} strokeWidth={3} /><Line type="monotone" dataKey="run1" stroke="#82ca9d" dot={false} strokeWidth={1} style={{ opacity: 0.3 }} /></LineChart></ResponsiveContainer></div>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>

                            <TabsContent value="roadmap" className="mt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="bg-slate-900 border-none shadow-xl border-t-4 border-t-green-500 overflow-hidden">
                                        <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest text-green-500">Pass Projection</CardTitle></CardHeader>
                                        <CardContent className="space-y-8 p-8">
                                            <div>
                                                <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-2 text-white">Estimated Trades to Target</p>
                                                <div className="text-8xl font-black text-white tracking-tighter">{calculations.tradesToTarget === Infinity ? "???" : calculations.tradesToTarget}</div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center text-[11px] text-white border-b border-white/5 pb-2"><span>Status</span><Badge className="bg-green-500 text-white font-bold">{phase === 'phase1' ? 'Phase 1' : phase === 'phase2' ? 'Phase 2' : 'Funded'}</Badge></div>
                                                <div className="flex justify-between items-center text-[11px] text-white border-b border-white/5 pb-2"><span>Win Prob</span><span className="font-bold">{simWinRate}%</span></div>
                                                <p className="text-[9px] opacity-40 text-white italic">Note: These numbers assume constant risk and zero revenge trading behavior.</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-muted/10 border-none p-8 flex flex-col justify-center gap-6">
                                        <div className="flex items-center gap-4"><Crown className="h-6 w-6 text-primary" /><p className="text-sm font-bold leading-tight">Elite traders don't hit "Payouts" by luck, they hit them by math. Stick to the roadmap.</p></div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase opacity-40">Distance to {phase === 'funded' ? 'Payout' : 'Funding'}</Badge>
                                            <Progress value={100 - (calculations.remainingProfit / (accountSize * (profitTargetPercent / 100)) * 100)} className="h-4 rounded-xl" />
                                        </div>
                                    </Card>
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
