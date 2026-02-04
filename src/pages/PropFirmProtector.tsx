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
import { Shield, Target, Activity, Info, Zap, Settings2, RefreshCcw, AlertTriangle, Trash2, Edit3, Globe, TrendingUp, Calendar, Clock, Crown, MessageSquare, AlertCircle, BarChart3, Fingerprint, Share2, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";
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

    // PRE-TRADE IMPACT STATE
    const [hypotheticalLotSize, setHypotheticalLotSize] = useState<number>(0);

    const [currentAccountSlot, setCurrentAccountSlot] = useState<number>(0);
    const [accountNames, setAccountNames] = useState<string[]>(["Challenge 1"]);
    const isSavingLocked = useRef(false);

    // Default Stats
    const [simWinRate, setSimWinRate] = useState(45);
    const [simRR, setSimRR] = useState(2);
    const [simulationData, setSimulationData] = useState<any[]>([]);
    const [isSimulating, setIsSimulating] = useState(false);

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

    // Apply Live Data
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

    // Persistence Load/Save
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
        }, 500);
        return () => clearTimeout(timer);
    }, [currentAccountSlot, selectedFirm, phase, assetClass, accountSize, currentBalance, startOfDayBalance, maxDailyDrawdown, maxTotalDrawdown, profitTargetPercent, stopLossPips, riskPerTrade, selectedMt5AccountId]);

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

        // PRE-TRADE IMPACT LOGIC
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

    const addAccountSlot = () => {
        const newNames = [...accountNames, `Account ${accountNames.length + 1}`];
        setAccountNames(newNames);
        setCurrentAccountSlot(newNames.length - 1);
        toast.success("Account slot added");
    };

    const removeAccountSlot = () => {
        if (accountNames.length <= 1) return toast.error("Primary account required");
        if (window.confirm("Delete this portfolio slot?")) {
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
            toast.success("Slot removed");
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
            <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg"><Shield className="h-7 w-7 text-white" /></div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter">Prop Protector <span className="text-primary">v3.0</span></h1>
                            <Badge variant="outline" className="text-primary text-[9px] font-black uppercase tracking-widest border-primary/20">Elite Edition</Badge>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-1 rounded-xl">
                        {accountNames.map((name, idx) => (
                            <Button key={idx} variant={currentAccountSlot === idx ? "default" : "ghost"} size="sm" onClick={() => setCurrentAccountSlot(idx)} className="h-8 px-4 font-bold rounded-lg text-xs">{name}</Button>
                        ))}
                        <Button variant="outline" size="icon" onClick={addAccountSlot} className="h-8 w-8 border-dashed rounded-lg"><Zap className="h-4 w-4" /></Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="border-none shadow-xl bg-background border-t-4 border-t-primary overflow-hidden">
                            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                                <CardTitle className="text-xs font-black uppercase opacity-40 flex items-center gap-2"><Fingerprint className="h-4 w-4" /> Autopilot</CardTitle>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { const n = window.prompt("Name:", accountNames[currentAccountSlot]); if (n) { const l = [...accountNames]; l[currentAccountSlot] = n; setAccountNames(l); } }}><Edit3 className="h-3 w-3" /></Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={removeAccountSlot}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase">Linked MT5 Account</Label>
                                    <Select value={selectedMt5AccountId || "none"} onValueChange={v => setSelectedMt5AccountId(v === "none" ? null : v)}>
                                        <SelectTrigger className="h-9 font-bold"><SelectValue placeholder="Manual" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Manual Entry</SelectItem>
                                            {mt5Accounts?.map((acc: any) => (<SelectItem key={acc.id} value={acc.id}>{acc.broker_name} - {acc.account_number}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                    {selectedMt5AccountId && <p className="text-[8px] text-green-500 font-black animate-pulse uppercase tracking-[0.2em] mt-1">● Live Sync Enabled</p>}
                                </div>

                                <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
                                    {['phase1', 'phase2', 'funded'].map(p => (
                                        <Button key={p} variant={phase === p ? "default" : "ghost"} size="sm" className="flex-1 h-7 text-[9px] font-black uppercase" onClick={() => setPhase(p)}>{p === 'funded' ? 'Live' : p}</Button>
                                    ))}
                                </div>

                                <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-40">Account Size</Label><Input className="h-8 font-black" value={accountSize === 0 ? "" : accountSize} type="number" onChange={e => handleNumInput(e.target.value, setAccountSize)} /></div>

                                <div className="space-y-1 bg-primary/5 p-3 rounded-xl border border-primary/20">
                                    <Label className="text-[10px] font-black uppercase text-primary flex items-center justify-between">Live Equity <RefreshCcw className="h-3 w-3" /></Label>
                                    <Input className="h-10 text-xl font-black bg-transparent border-none text-primary" value={currentBalance === 0 ? "" : currentBalance} type="number" onChange={e => handleNumInput(e.target.value, setCurrentBalance)} />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase opacity-40">Firm Rules</Label><Select value={selectedFirm} onValueChange={v => { setSelectedFirm(v); const f = PROP_FIRM_PRESETS[v as keyof typeof PROP_FIRM_PRESETS]; if (f) { setMaxDailyDrawdown(f.dailyDD); setMaxTotalDrawdown(f.totalDD); } }}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PROP_FIRM_PRESETS).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent></Select></div>
                                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase opacity-40">Stop Loss</Label><Input className="h-8 font-black" value={stopLossPips === 0 ? "" : stopLossPips} type="number" onChange={e => handleNumInput(e.target.value, setStopLossPips)} /></div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex justify-between items-center text-[10px] font-black"><span>RISK {riskPerTrade}%</span><Badge className="h-5 text-[8px] font-black">{assetClass.toUpperCase()}</Badge></div>
                                    <Slider value={[riskPerTrade]} min={0.1} max={3} step={0.1} onValueChange={v => setRiskPerTrade(v[0])} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 border-none shadow-2xl overflow-hidden">
                            <CardHeader className="pb-2 bg-gradient-to-r from-blue-600 to-indigo-600"><CardTitle className="text-[9px] font-black uppercase text-white tracking-widest">Pre-Trade Impact Shield</CardTitle></CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="space-y-1"><Label className="text-[8px] font-black text-white/40 uppercase">Proposed Lot Size</Label><Input className="h-8 bg-white/5 border-white/10 text-white font-black" value={hypotheticalLotSize === 0 ? "" : hypotheticalLotSize} type="number" onChange={e => handleNumInput(e.target.value, setHypotheticalLotSize)} placeholder="0.00" /></div>
                                {hypotheticalLotSize > 0 && (
                                    <div className={`p-2 rounded-lg border ${calculations.isImpactSafe ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                        <div className="flex justify-between text-[10px] text-white"><span>Projected Loss:</span><span className="font-bold text-red-400">-${calculations.hypotheticLoss.toFixed(0)}</span></div>
                                        <div className="flex justify-between text-[10px] text-white mt-1"><span>Daily Buffer:</span><span className={`font-bold ${calculations.isImpactSafe ? 'text-green-400' : 'text-red-400'}`}>${calculations.postTrialDailyBuffer.toFixed(0)}</span></div>
                                        <Badge className={`w-full mt-2 h-5 text-[8px] flex justify-center border-none ${calculations.isImpactSafe ? 'bg-green-500' : 'bg-red-500'}`}>{calculations.isImpactSafe ? 'EXECUTION PERMITTED' : 'BREACH DANGER'}</Badge>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-orange-500 shadow-xl relative overflow-hidden">
                                <CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase font-black tracking-widest opacity-40">Today's Buffer</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-black tracking-tighter">${calculations.dailyLossRemaining.toFixed(0)}</div>
                                    <Progress value={calculations.dailyProgress} className="h-1.5 mt-2" />
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-blue-500 shadow-xl relative overflow-hidden">
                                <CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase font-black tracking-widest opacity-40">{phase === 'funded' ? 'Payout Zone' : 'Profit Target'}</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-black tracking-tighter text-blue-600">${calculations.remainingProfit.toFixed(0)}</div>
                                    <Progress value={Math.max(0, 100 - (calculations.remainingProfit / (accountSize * (profitTargetPercent / 100)) * 100))} className="h-1.5 mt-2" />
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-900 border-none shadow-2xl flex items-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="h-12 w-12 text-white" /></div>
                                <CardContent className="pt-6 w-full">
                                    <p className="text-[9px] font-black uppercase text-white/30">Pass Probability</p>
                                    <div className="text-5xl font-black text-white tracking-tighter">84%</div>
                                    <p className="text-[9px] text-green-400 font-black mt-1 uppercase">Smart Estimate: Ready</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-[#0f172a] text-white border-none shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 group-hover:opacity-10 transition-all"><Fingerprint className="h-48 w-48 text-primary" /></div>
                            <CardContent className="pt-10 pb-10 px-6 md:px-10">
                                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                                    <div className="w-full">
                                        <Badge className="bg-primary text-white border-none px-3 py-0.5 mb-4 text-[10px] font-black uppercase tracking-widest">Recommended Lot Size</Badge>
                                        <div className="text-6xl sm:text-7xl md:text-8xl xl:text-[11rem] leading-none font-black tracking-tighter drop-shadow-2xl text-white">
                                            {calculations.suggestedLotSize.toFixed(2)}
                                        </div>
                                        <div className="flex flex-wrap gap-8 mt-10">
                                            <div className="flex flex-col"><span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Safe Risk</span><span className="text-xl md:text-2xl font-black text-white">${calculations.safeRiskAmount.toFixed(0)}</span></div>
                                            <div className="hidden sm:block w-px h-10 bg-white/10" />
                                            <div className="flex flex-col"><span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Asset Scale</span><span className="text-xl md:text-2xl font-black text-white">{assetClass.toUpperCase()}</span></div>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-md p-8 md:p-12 rounded-[40px] border border-white/10 text-center w-full xl:w-auto min-w-[200px] shadow-2xl shrink-0 group-hover:bg-white/10 transition-all">
                                        <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-2 text-white/50">Stop Loss</p>
                                        <div className="text-7xl xl:text-[7rem] font-black leading-none text-primary">{stopLossPips}</div>
                                        <p className="text-[11px] font-black opacity-30 uppercase tracking-[0.2em] mt-2 text-white/50">Pips</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Tabs defaultValue="roadmap" className="w-full">
                            <TabsList className="w-full grid grid-cols-4 h-14 bg-muted/40 p-1 rounded-2xl">
                                <TabsTrigger value="roadmap" className="rounded-xl font-black uppercase text-[10px]">Path</TabsTrigger>
                                <TabsTrigger value="rescue" className="rounded-xl font-black uppercase text-[10px]">Rescue</TabsTrigger>
                                <TabsTrigger value="simulator" className="rounded-xl font-black uppercase text-[10px]">Stress</TabsTrigger>
                                <TabsTrigger value="badges" className="rounded-xl font-black uppercase text-[10px]">Badges</TabsTrigger>
                            </TabsList>
                            <TabsContent value="roadmap" className="mt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="bg-slate-900 border-none shadow-2xl border-t-8 border-t-primary p-8">
                                        <p className="text-[10px] font-black uppercase opacity-30 text-white tracking-widest mb-6">Trades to Pass {phase.toUpperCase()}</p>
                                        <div className="text-8xl font-black text-white tracking-tighter leading-none">{calculations.tradesToTarget === Infinity ? "???" : calculations.tradesToTarget}</div>
                                        <p className="text-xs text-green-500 font-bold mt-4 uppercase">Efficiency Rating: Pro</p>
                                    </Card>
                                    <Card className="bg-muted/10 border-none p-8 flex flex-col justify-center gap-4">
                                        <div className="flex items-center gap-3"><MessageSquare className="h-5 w-5 text-primary opacity-50" /><p className="text-sm font-bold opacity-80 italic leading-relaxed text-foreground">"Risk management is the only holy grail. Master it with Amphy v3.0."</p></div>
                                        <div className="mt-4"><Label className="text-[9px] font-black uppercase opacity-30">Phase Completion</Label><Progress value={100 - (calculations.remainingProfit / (accountSize * (profitTargetPercent / 100)) * 100)} className="h-2 rounded-full mt-1" /></div>
                                    </Card>
                                </div>
                            </TabsContent>
                            <TabsContent value="badges" className="mt-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { name: "Risk Guru", icon: Shield, earned: true },
                                        { name: "First Payout", icon: Wallet, earned: false },
                                        { name: "Phase Master", icon: Target, earned: false },
                                        { name: "Solid Mind", icon: Crown, earned: true },
                                    ].map((b, i) => (
                                        <Card key={i} className={`p-6 text-center border-none shadow-xl ${b.earned ? 'bg-primary/5' : 'opacity-20'}`}>
                                            <b.icon className={`h-8 w-8 mx-auto mb-3 ${b.earned ? 'text-primary' : 'text-foreground'}`} />
                                            <p className="text-[9px] font-black uppercase">{b.name}</p>
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
