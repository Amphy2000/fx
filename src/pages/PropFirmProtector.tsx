import { useState, useMemo, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Target, Activity, Zap, Settings2, TrendingUp, Plus, Copy, CheckCircle2, Fingerprint, Scale, AlertTriangle, Brain, TrendingDown, Trophy, Bell, DollarSign, Map, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ChallengePhaseTracker } from "@/components/prop-firm/ChallengePhaseTracker";
import { BreachSimulator } from "@/components/prop-firm/BreachSimulator";
import { EmotionalRiskIntegration } from "@/components/prop-firm/EmotionalRiskIntegration";
import { PreTradeCheckpoint } from "@/components/prop-firm/PreTradeCheckpoint";
import { BreachAlerts } from "@/components/prop-firm/BreachAlerts";
import { PayoutCalculator } from "@/components/prop-firm/PayoutCalculator";
import { RecoveryRoadmap } from "@/components/prop-firm/RecoveryRoadmap";
import { TradeJournalSync } from "@/components/prop-firm/TradeJournalSync";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PROP_FIRM_PRESETS = {
  custom: { name: "Custom", dailyDD: 5, totalDD: 10 },
  ftmo: { name: "FTMO", dailyDD: 5, totalDD: 10 },
  fundedNext: { name: "Funded Next", dailyDD: 5, totalDD: 10 },
  theForexFunder: { name: "The Funded Trader", dailyDD: 5, totalDD: 10 },
  e8Funding: { name: "E8 Funding", dailyDD: 5, totalDD: 8 },
  myForexFunds: { name: "My Forex Funds", dailyDD: 5, totalDD: 12 },
  trueForexFunds: { name: "True Forex Funds", dailyDD: 5, totalDD: 10 },
};

const ASSET_CLASSES = {
  forex: { name: "Forex Majors", pipValue: 10 },
  gold: { name: "Gold (XAUUSD)", pipValue: 1 },
  indices: { name: "Indices (US30)", pipValue: 1 },
};

const ACCOUNT_SIZES = [10000, 25000, 50000, 100000, 200000];

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
  const [userId, setUserId] = useState<string | null>(null);
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
  const [showCheckpoint, setShowCheckpoint] = useState(false);

  const [currentAccountSlot, setCurrentAccountSlot] = useState<number>(0);
  const [accountNames, setAccountNames] = useState<string[]>(["Challenge 1"]);
  const isSavingLocked = useRef(false);
  const [hasCopied, setHasCopied] = useState(false);

  // Fetch user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    };
    getUser();
  }, []);

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

  const copySize = () => {
    navigator.clipboard.writeText(calcs.suggestedLots.toFixed(2));
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    toast.success("Lot size copied!");
  };

  const handleRiskAdjustment = (suggestedRisk: number, reason: string) => {
    setRiskPerTrade(suggestedRisk);
    toast.success(`Risk adjusted to ${suggestedRisk.toFixed(2)}%`, { description: reason });
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 max-w-[1600px] space-y-8 animate-in fade-in duration-500">

        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 rounded-xl border border-white/10 shadow-xl"><Shield className="h-6 w-6 text-primary" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">Prop Firm Guardian</h1>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-2 py-0">PRO</Badge>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{accountNames[currentAccountSlot]} • {PROP_FIRM_PRESETS[selectedFirm as keyof typeof PROP_FIRM_PRESETS]?.name}</p>
            </div>
          </div>
          <div className="flex bg-muted/30 p-1 rounded-xl border items-center gap-1 overflow-x-auto max-w-full">
            {accountNames.map((n, i) => (
              <div key={i} className="relative group">
                <Button 
                  variant={currentAccountSlot === i ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => setCurrentAccountSlot(i)} 
                  className="h-8 px-4 text-[10px] font-bold uppercase rounded-lg pr-8"
                >
                  {n}
                </Button>
                {accountNames.length > 1 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 top-0 h-8 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{n}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this account and all its settings. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            const newNames = accountNames.filter((_, idx) => idx !== i);
                            setAccountNames(newNames);
                            localStorage.removeItem(`account_slot_${i}`);
                            if (currentAccountSlot >= newNames.length) {
                              setCurrentAccountSlot(Math.max(0, newNames.length - 1));
                            } else if (currentAccountSlot === i) {
                              setCurrentAccountSlot(0);
                            }
                            toast.success(`"${n}" deleted successfully`);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { const n = prompt("Account Name:"); if (n) setAccountNames([...accountNames, n]); }}><Plus className="h-4 w-4" /></Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* SIDEBAR - Settings */}
          <aside className="lg:col-span-3 space-y-6">
            <Card className="rounded-2xl border-none shadow-sm bg-card">
              <CardHeader className="pb-3 border-b bg-muted/5"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2"><Settings2 className="h-3.5 w-3.5" /> Account Setup</CardTitle></CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black opacity-50">Quick Size</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ACCOUNT_SIZES.map((size) => (
                      <Button
                        key={size}
                        variant={accountSize === size ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setAccountSize(size); setCurrentBalance(size); setStartOfDayBalance(size); }}
                        className="h-7 px-2 text-[10px] font-bold"
                      >
                        ${(size / 1000)}k
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1"><Label className="text-[10px] uppercase font-black opacity-50">Current Balance ($)</Label><NumericInput value={currentBalance} onChange={setCurrentBalance} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-[10px] uppercase font-black opacity-50">Start of Day ($)</Label><NumericInput value={startOfDayBalance} onChange={setStartOfDayBalance} className="h-8" /></div>
                <div className="space-y-1"><Label className="text-[10px] uppercase font-black opacity-50">Stop Loss (pips)</Label><NumericInput value={stopLossPips} onChange={setStopLossPips} className="h-8" /></div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-black uppercase opacity-50"><span>Risk per Trade</span><span className="text-primary">{riskPerTrade}%</span></div>
                  <Slider value={[riskPerTrade]} min={0.1} max={3} step={0.1} onValueChange={v => setRiskPerTrade(v[0])} />
                </div>
                <div className="space-y-1"><Label className="text-[10px] uppercase font-black opacity-50">Asset Class</Label>
                  <Select value={assetClass} onValueChange={setAssetClass}><SelectTrigger className="h-8 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ASSET_CLASSES).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent></Select>
                </div>
                <div className="space-y-1"><Label className="text-[10px] uppercase font-black opacity-50">Prop Firm</Label>
                  <Select value={selectedFirm} onValueChange={v => { setSelectedFirm(v); const f = PROP_FIRM_PRESETS[v as keyof typeof PROP_FIRM_PRESETS]; if (f) { setMaxDailyDrawdown(f.dailyDD); setMaxTotalDrawdown(f.totalDD); } }}><SelectTrigger className="h-8 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PROP_FIRM_PRESETS).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent></Select>
                </div>
              </CardContent>
            </Card>

            {/* Pre-Trade Shield Card */}
            <Card className="bg-slate-900 border-none rounded-2xl overflow-hidden">
              <CardHeader className="bg-primary/20 p-3"><CardTitle className="text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-2"><Shield className="h-3 w-3" /> Pre-Trade Test</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-3">
                <NumericInput value={hypotheticalLotSize} onChange={setHypotheticalLotSize} placeholder="Test Lot Size" className="bg-white/5 border-white/10 text-white h-8" />
                {hypotheticalLotSize > 0 && (
                  <>
                    <div className={`p-3 rounded-xl border ${calcs.isImpactSafe ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                      <p className="text-[10px] font-black uppercase">{calcs.isImpactSafe ? '✓ Safe to Execute' : '✕ Risk Too High'}</p>
                      <p className="text-xs font-bold mt-1">Potential Loss: -${calcs.hLoss.toFixed(0)}</p>
                    </div>
                    <Button 
                      className="w-full h-9 text-[10px] font-bold" 
                      variant="outline"
                      onClick={() => setShowCheckpoint(true)}
                    >
                      Open Full Checkpoint
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* MAIN CONTENT */}
          <main className="lg:col-span-9 space-y-6">
            {/* Hero Lot Size Card */}
            <Card className="bg-slate-950 border-none rounded-[32px] overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none transition-transform group-hover:scale-110"><Fingerprint className="h-48 w-48 text-primary" /></div>
              <CardContent className="p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="w-full text-center md:text-left">
                  <Badge className="bg-primary text-white border-none px-3 py-1 mb-6 text-[10px] font-black uppercase tracking-widest">Recommended Lot Size</Badge>
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

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-5 rounded-2xl border-l-4 border-orange-500 bg-card">
                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-3 flex justify-between">
                  Daily Buffer <Badge className="h-4 px-1 text-[8px] border-none bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">{calcs.dailyProg.toFixed(1)}% used</Badge>
                </p>
                <p className="text-3xl font-black tracking-tighter mb-3">${calcs.dailyRemaining.toFixed(0)}</p>
                <Progress value={calcs.dailyProg} className="h-1.5" />
              </Card>
              <Card className="p-5 rounded-2xl border-l-4 border-blue-500 bg-card">
                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-3 flex justify-between">
                  Total Buffer <Badge className="h-4 px-1 text-[8px] border-none bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">Safe Zone</Badge>
                </p>
                <p className="text-3xl font-black tracking-tighter mb-3">${calcs.totalRemaining.toFixed(0)}</p>
                <Progress value={Math.max(0, 100 - (calcs.totalRemaining / (accountSize * maxTotalDrawdown / 100)) * 100)} className="h-1.5" />
              </Card>
              <Card className="p-5 rounded-2xl border-l-4 border-green-500 bg-card">
                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-3 flex justify-between">
                  To Target <Badge className="h-4 px-1 text-[8px] border-none bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400">{calcs.totalProg.toFixed(1)}%</Badge>
                </p>
                <p className="text-3xl font-black tracking-tighter text-green-600 dark:text-green-400 mb-3">${calcs.remainingProfit.toFixed(0)}</p>
                <Progress value={calcs.totalProg} className="h-1.5" />
              </Card>
            </div>

            {/* Tabs with New Features */}
            <Tabs defaultValue="alerts" className="w-full">
              <TabsList className="w-full grid grid-cols-4 lg:grid-cols-8 h-auto gap-1 bg-muted/40 p-1.5 rounded-2xl border border-border/40">
                <TabsTrigger value="alerts" className="rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1 py-2">
                  <Bell className="h-3 w-3" /> Alerts
                </TabsTrigger>
                <TabsTrigger value="payout" className="rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1 py-2">
                  <DollarSign className="h-3 w-3" /> Payout
                </TabsTrigger>
                <TabsTrigger value="roadmap" className="rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1 py-2">
                  <Map className="h-3 w-3" /> Recovery
                </TabsTrigger>
                <TabsTrigger value="journal" className="rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1 py-2">
                  <BookOpen className="h-3 w-3" /> Journal
                </TabsTrigger>
                <TabsTrigger value="challenge" className="rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1 py-2">
                  <Trophy className="h-3 w-3" /> Challenge
                </TabsTrigger>
                <TabsTrigger value="simulator" className="rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1 py-2">
                  <TrendingDown className="h-3 w-3" /> Simulate
                </TabsTrigger>
                <TabsTrigger value="emotional" className="rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1 py-2">
                  <Brain className="h-3 w-3" /> Mental
                </TabsTrigger>
                <TabsTrigger value="rescue" className="rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1 py-2">
                  <Scale className="h-3 w-3" /> Rescue
                </TabsTrigger>
              </TabsList>

              <TabsContent value="alerts" className="mt-6">
                <BreachAlerts
                  dailyUsedPercent={calcs.dailyProg}
                  totalUsedPercent={Math.max(0, 100 - (calcs.totalRemaining / (accountSize * maxTotalDrawdown / 100)) * 100)}
                  dailyRemaining={calcs.dailyRemaining}
                  totalRemaining={calcs.totalRemaining}
                  accountName={accountNames[currentAccountSlot]}
                />
              </TabsContent>

              <TabsContent value="payout" className="mt-6">
                <PayoutCalculator
                  accountSize={accountSize}
                  currentBalance={currentBalance}
                  profitTargetPercent={profitTargetPercent}
                  propFirm={selectedFirm}
                />
              </TabsContent>

              <TabsContent value="roadmap" className="mt-6">
                <RecoveryRoadmap
                  accountSize={accountSize}
                  currentBalance={currentBalance}
                  maxDailyDrawdown={maxDailyDrawdown}
                  maxTotalDrawdown={maxTotalDrawdown}
                  riskPerTrade={riskPerTrade}
                />
              </TabsContent>

              <TabsContent value="journal" className="mt-6">
                {userId ? (
                  <TradeJournalSync
                    userId={userId}
                    accountSize={accountSize}
                    maxDailyDrawdown={maxDailyDrawdown}
                    maxTotalDrawdown={maxTotalDrawdown}
                    currentBalance={currentBalance}
                  />
                ) : (
                  <Card className="p-8 text-center bg-slate-900 border-none rounded-3xl">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Sign in to sync your trade journal</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="challenge" className="mt-6">
                <ChallengePhaseTracker
                  accountSize={accountSize}
                  currentBalance={currentBalance}
                  profitTargetPercent={profitTargetPercent}
                  maxTotalDrawdown={maxTotalDrawdown}
                />
              </TabsContent>

              <TabsContent value="simulator" className="mt-6">
                <BreachSimulator
                  accountSize={accountSize}
                  currentBalance={currentBalance}
                  maxDailyDrawdown={maxDailyDrawdown}
                  maxTotalDrawdown={maxTotalDrawdown}
                  riskPerTrade={riskPerTrade}
                  stopLossPips={stopLossPips}
                  suggestedLots={calcs.suggestedLots}
                />
              </TabsContent>

              <TabsContent value="emotional" className="mt-6">
                {userId ? (
                  <EmotionalRiskIntegration
                    userId={userId}
                    currentRiskPercent={riskPerTrade}
                    onRiskAdjustment={handleRiskAdjustment}
                  />
                ) : (
                  <Card className="p-8 text-center bg-slate-900 border-none rounded-3xl">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Sign in to access mental state analysis</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="rescue" className="mt-6">
                <Card className="bg-slate-950 border-none rounded-[32px] p-10 overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-10 opacity-[0.02] rotate-[-15deg]"><Scale className="h-48 w-48 text-white" /></div>
                  <div className="max-w-2xl space-y-6 relative z-10">
                    <Badge className={`${currentBalance < accountSize ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-green-500/10 text-green-400 border-green-500/20'} text-[10px] px-3 font-black`}>
                      {currentBalance < accountSize ? 'RECOVERY MODE ACTIVE' : 'NO RECOVERY NEEDED'}
                    </Badge>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                      {currentBalance < accountSize ? 'Strategic Recovery' : 'Account Healthy'}
                    </h2>
                    
                    {currentBalance < accountSize ? (
                      <>
                        <p className="text-white/40 font-medium leading-relaxed">
                          You're ${(accountSize - currentBalance).toFixed(0)} below starting balance. Follow recovery protocol.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                            <p className="text-[10px] font-black opacity-30 uppercase text-white mb-2">Gap</p>
                            <p className="text-2xl font-black text-red-400">${(accountSize - currentBalance).toFixed(0)}</p>
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                            <p className="text-[10px] font-black opacity-30 uppercase text-white mb-2">Safe Risk</p>
                            <p className="text-2xl font-black text-amber-400">0.5%</p>
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                            <p className="text-[10px] font-black opacity-30 uppercase text-white mb-2">Recovery Trades</p>
                            <p className="text-2xl font-black text-primary">
                              {Math.ceil((accountSize - currentBalance) / (calcs.safeRisk * 2))}
                            </p>
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                            <p className="text-[10px] font-black opacity-30 uppercase text-white mb-2">Target RR</p>
                            <p className="text-2xl font-black text-green-400">1:2</p>
                          </div>
                        </div>
                        <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                          <p className="text-[10px] font-black uppercase text-amber-400 mb-2">Recovery Protocol</p>
                          <ul className="text-sm text-amber-400/80 space-y-1">
                            <li>• Risk max 0.5% per trade (half normal size)</li>
                            <li>• Only A+ setups - no revenge trades</li>
                            <li>• Take profits at 1:2 minimum</li>
                            <li>• Complete daily check-in before trading</li>
                          </ul>
                        </div>
                      </>
                    ) : (
                      <div className="p-6 bg-green-500/10 rounded-xl border border-green-500/20">
                        <CheckCircle2 className="h-8 w-8 text-green-400 mb-3" />
                        <p className="text-green-400">
                          Your account is at or above starting balance. Keep up the good work!
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>

      {/* Pre-Trade Checkpoint Modal */}
      <PreTradeCheckpoint
        isOpen={showCheckpoint}
        onClose={() => setShowCheckpoint(false)}
        onProceed={() => {
          setShowCheckpoint(false);
          toast.success("Trade approved - execute with confidence!");
        }}
        tradeData={{
          lotSize: hypotheticalLotSize,
          stopLossPips: stopLossPips,
          pair: "EURUSD",
          direction: "buy"
        }}
        accountData={{
          currentBalance,
          accountSize,
          dailyLossRemaining: calcs.dailyRemaining,
          totalLossRemaining: calcs.totalRemaining,
          maxDailyDrawdown,
          maxTotalDrawdown
        }}
        pipValue={ASSET_CLASSES[assetClass as keyof typeof ASSET_CLASSES]?.pipValue || 10}
      />
    </Layout>
  );
};

export default PropFirmProtector;
