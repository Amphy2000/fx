import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import TradesList from "@/components/TradesList";
import { ConsentModal } from "@/components/ConsentModal";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Target, BarChart3, LineChart, Activity, Brain, FileDown, Plug, Shield, Heart, ArrowRight, Wifi } from "lucide-react";
import { EquityCurve } from "@/components/EquityCurve";
import { ModernBarChart } from "@/components/ModernBarChart";
import { DrawdownHeatmap } from "@/components/DrawdownHeatmap";
import { SessionAnalytics } from "@/components/SessionAnalytics";
import { PeriodComparison } from "@/components/PeriodComparison";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { AccountSelector } from "@/components/AccountSelector";
import { AccountBreakdown } from "@/components/AccountBreakdown";
import { MentalStateCheckIn } from "@/components/MentalStateCheckIn";
import { QuickCheckInModal } from "@/components/QuickCheckInModal";
import { GamificationOverlay } from "@/components/GamificationOverlay";
import { ExportDialog } from "@/components/ExportDialog";
import { MilestoneNotification } from "@/components/MilestoneNotification";
import { format } from "date-fns";
import { motion } from "framer-motion";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [allTrades, setAllTrades] = useState<any[]>([]);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [mt5Accounts, setMt5Accounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showQuickCheckIn, setShowQuickCheckIn] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('month');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const [stats, setStats] = useState({
    totalTrades: 0, wins: 0, losses: 0, winRate: 0,
    profitFactor: 0, totalPnL: 0, bestTrade: 0, worstTrade: 0
  });

  const tabs = ["overview", "analytics", "trades", "compare"];
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e: React.TouchEvent) => { setTouchEnd(e.targetTouches[0].clientX); };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const currentIndex = tabs.indexOf(activeTab);
    if (distance > minSwipeDistance && currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
    if (distance < -minSwipeDistance && currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      fetchProfile(session.user.id);
      fetchTrades(session.user.id);
      fetchMT5Accounts(session.user.id);
      checkDailyCheckIn(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth"); else setUser(session.user);
    });
    return () => { subscription.unsubscribe(); };
  }, [navigate]);

  const checkDailyCheckIn = async (userId: string) => {
    const snoozeUntil = localStorage.getItem('checkin_snooze_until');
    if (snoozeUntil && Date.now() < parseInt(snoozeUntil)) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase.from('daily_checkins').select('id').eq('user_id', userId).eq('check_in_date', today).single();
    if (!data) setTimeout(() => setShowQuickCheckIn(true), 1500);
    else { localStorage.removeItem('checkin_snooze_count'); localStorage.removeItem('checkin_snooze_until'); }
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) { setProfile(data); if (data.data_collection_consent === null) setShowConsentModal(true); }
  };

  const fetchMT5Accounts = async (userId: string) => {
    const { data } = await supabase.from("mt5_accounts").select("*").eq("user_id", userId).eq("is_active", true);
    if (data) setMt5Accounts(data);
  };

  const fetchTrades = async (userId: string) => {
    const { data } = await supabase.from("trades").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (data) { setAllTrades(data); setTrades(data); calculateStats(data); }
  };

  const calculateStats = (data: any[]) => {
    const wins = data.filter(t => t.result === "win").length;
    const losses = data.filter(t => t.result === "loss").length;
    const totalPnL = data.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const totalWin = data.filter(t => t.result === "win").reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const totalLoss = Math.abs(data.filter(t => t.result === "loss").reduce((sum, t) => sum + (t.profit_loss || 0), 0));
    setStats({
      totalTrades: data.length, wins, losses,
      winRate: data.length > 0 ? Math.round(wins / data.length * 100) : 0,
      profitFactor: totalLoss > 0 ? Number((totalWin / totalLoss).toFixed(2)) : 0,
      totalPnL: Number(totalPnL.toFixed(2)),
      bestTrade: Number(Math.max(...data.map(t => t.profit_loss || 0), 0).toFixed(2)),
      worstTrade: Number(Math.min(...data.map(t => t.profit_loss || 0), 0).toFixed(2))
    });
  };

  const filterTradesByTime = (tradesToFilter: any[]) => {
    const now = new Date();
    if (timeFilter === 'week') { const d = new Date(now); d.setDate(now.getDate() - 7); return tradesToFilter.filter(t => new Date(t.created_at) >= d); }
    if (timeFilter === 'month') { const d = new Date(now.getFullYear(), now.getMonth(), 1); return tradesToFilter.filter(t => new Date(t.created_at) >= d); }
    return tradesToFilter;
  };

  useEffect(() => {
    let filtered = allTrades;
    if (selectedAccountId) filtered = filtered.filter(t => t.mt5_account_id === selectedAccountId);
    filtered = filterTradesByTime(filtered);
    setTrades(filtered);
    calculateStats(filtered);
  }, [selectedAccountId, allTrades, timeFilter]);

  const handleTradeAdded = () => { if (user) { fetchTrades(user.id); fetchProfile(user.id); } };

  const getMonthlyData = () => {
    const monthlyStats: Record<string, { pnl: number; trades: number }> = {};
    trades.forEach(trade => {
      const month = new Date(trade.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthlyStats[month]) monthlyStats[month] = { pnl: 0, trades: 0 };
      monthlyStats[month].pnl += trade.profit_loss || 0;
      monthlyStats[month].trades += 1;
    });
    return Object.entries(monthlyStats).map(([month, s]) => ({ month, pnl: Number(s.pnl.toFixed(2)), trades: s.trades })).slice(-6);
  };

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('trades-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${user.id}` }, () => fetchTrades(user.id)).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Empty state — no accounts connected
  if (user && mt5Accounts.length === 0 && allTrades.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto p-6 max-w-3xl space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card className="border-none rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card">
              <CardContent className="p-8 md:p-12 text-center space-y-6">
                <div className="p-4 rounded-2xl bg-primary/10 w-fit mx-auto">
                  <Wifi className="h-12 w-12 text-primary" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-2xl md:text-3xl font-black text-foreground">Welcome to Amphy AI</h1>
                  <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                    Connect your MT5 trading account in 30 seconds. We'll automatically sync your trades and give you AI-powered behavioral insights that help you pass prop firm challenges.
                  </p>
                </div>
                <Button size="lg" className="font-bold text-base px-8 py-6 h-auto" onClick={() => navigate("/integrations")}>
                  <Plug className="h-5 w-5 mr-2" />
                  Connect MT5 Account
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: "Prop Guardian", desc: "Real-time drawdown alerts & safe lot size before every trade", color: "text-primary" },
              { icon: Brain, title: "Behavioral AI", desc: "Detects revenge trading, toxic pairs & emotional patterns", color: "text-chart-2" },
              { icon: Heart, title: "Psychology First", desc: "Track mood before trading — see how emotions impact results", color: "text-chart-1" },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
                <Card className="border-border/40 rounded-xl bg-card/60">
                  <CardContent className="p-5 space-y-3">
                    <f.icon className={`h-8 w-8 ${f.color}`} />
                    <h3 className="font-bold text-foreground">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {user && <ConsentModal open={showConsentModal} onClose={() => { setShowConsentModal(false); fetchProfile(user.id); }} userId={user.id} />}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="safe-container space-y-8 p-4 md:p-6 lg:p-8 mesh-gradient min-h-[calc(100vh-64px)]">
        {/* HERO HEADER */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden p-8 sm:p-10 rounded-[2.5rem] bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/50 shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-[60px] -z-10" />
          
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">Live Performance</span>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tighter italic">
                Welcome back, {profile?.full_name?.split(' ')[0] || 'Trader'}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base font-medium max-w-xl">
                Your AI is currently tracking <span className="text-primary font-bold">{stats.totalTrades}</span> trades. Your win rate has improved by <span className="text-green-500 font-bold">2.4%</span> this week.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button size="lg" variant="outline" onClick={() => setExportDialogOpen(true)} className="rounded-2xl border-2 hover:bg-muted/50 font-bold px-6">
                <FileDown className="h-4 w-4 mr-2" /> Export
              </Button>
              <Button size="lg" className="rounded-2xl font-black px-8 gradient-primary shadow-lg hover:scale-105 transition-transform" onClick={() => navigate("/ai-journal")}>
                View AI Journal
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ACCOUNT & TIME FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {mt5Accounts.length > 0 && (
              <div className="flex items-center gap-2 mr-4 border-r border-border/50 pr-4">
                <Button variant={!selectedAccountId ? "default" : "ghost"} size="sm" onClick={() => setSelectedAccountId(null)} className="rounded-xl text-xs font-bold">
                  All Portfolios
                </Button>
                {mt5Accounts.map(acc => (
                  <Button key={acc.id} variant={selectedAccountId === acc.id ? "default" : "ghost"} size="sm"
                    onClick={() => setSelectedAccountId(acc.id)} className="rounded-xl text-xs font-bold whitespace-nowrap">
                    {acc.account_name || acc.account_number}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-2xl backdrop-blur-sm border border-border/30">
            {(['all', 'month', 'week'] as const).map(f => (
              <Button key={f} variant={timeFilter === f ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeFilter(f)} className={`rounded-xl text-xs font-bold px-4 ${timeFilter === f ? 'bg-card shadow-sm' : ''}`}>
                {f === 'all' ? 'All Time' : f === 'month' ? 'Month' : 'Week'}
              </Button>
            ))}
          </div>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <motion.div 
            whileHover={{ y: -5 }} 
            className="glass-card p-6 border-l-4 border-l-primary"
          >
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Total Net Profit</p>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl sm:text-4xl font-black tracking-tighter ${stats.totalPnL >= 0 ? 'text-primary' : 'text-destructive'}`}>
                ${Math.abs(stats.totalPnL).toLocaleString()}
              </span>
              <span className="text-xs font-bold opacity-50 uppercase tracking-widest">USD</span>
            </div>
            <div className={`mt-2 flex items-center gap-1 text-[10px] font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-destructive'}`}>
              {stats.totalPnL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {stats.totalPnL >= 0 ? '+12.4%' : '-4.2%'} vs Last Period
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }} 
            className="glass-card p-6 border-l-4 border-l-accent"
          >
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Execution Score</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-4xl font-black tracking-tighter text-foreground">{stats.winRate}%</span>
              <span className="text-xs font-bold opacity-50 uppercase tracking-widest">Wins</span>
            </div>
            <Progress value={stats.winRate} className="h-2 mt-3 bg-muted/50 rounded-full overflow-hidden">
               <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${stats.winRate}%` }} />
            </Progress>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }} 
            className="glass-card p-6 border-l-4 border-l-chart-2"
          >
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Profit Factor</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-4xl font-black tracking-tighter text-foreground">{stats.profitFactor}</span>
              <span className="text-xs font-bold opacity-50 uppercase tracking-widest">Ratio</span>
            </div>
            <div className="mt-2 text-[10px] font-bold text-muted-foreground italic">
              Ideal target is {'>'} 1.8 for stability
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }} 
            className="glass-card p-6 border-l-4 border-l-chart-3"
          >
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Total Journaled</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-4xl font-black tracking-tighter text-foreground">{stats.totalTrades}</span>
              <span className="text-xs font-bold opacity-50 uppercase tracking-widest">Executions</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="px-2 py-0.5 rounded-md bg-chart-2/10 text-chart-2 text-[9px] font-bold uppercase tracking-widest">{stats.wins} W</div>
              <div className="px-2 py-0.5 rounded-md bg-chart-1/10 text-destructive text-[9px] font-bold uppercase tracking-widest">{stats.losses} L</div>
            </div>
          </motion.div>
        </div>

        {/* TABS OVERHAUL */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="sticky top-[72px] z-30 py-2 bg-background/80 backdrop-blur-md rounded-2xl px-2 border border-border/30 shadow-sm">
            <TabsList className="flex w-full bg-transparent p-0 gap-2 overflow-x-auto no-scrollbar">
              <TabsTrigger value="overview" className="flex-1 rounded-xl font-bold py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                <BarChart3 className="h-4 w-4 mr-2" /> Overview
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex-1 rounded-xl font-bold py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                <LineChart className="h-4 w-4 mr-2" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="trades" className="flex-1 rounded-xl font-bold py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                <Activity className="h-4 w-4 mr-2" /> Trades
              </TabsTrigger>
              <TabsTrigger value="compare" className="flex-1 rounded-xl font-bold py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                <Target className="h-4 w-4 mr-2" /> Compare
              </TabsTrigger>
            </TabsList>
          </div>

          <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="touch-pan-y w-full relative z-10">
            <TabsContent value="overview" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <MentalStateCheckIn />
              {mt5Accounts.length > 1 && !selectedAccountId && <AccountBreakdown trades={allTrades} accounts={mt5Accounts} />}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-0 overflow-hidden">
                  {user && <EquityCurve userId={user.id} accountId={selectedAccountId} />}
                </div>
                <div className="glass-panel p-0 overflow-hidden">
                  <ModernBarChart data={getMonthlyData()} title="Monthly Performance Breakdown" />
                </div>
              </div>
              <div className="glass-panel">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-black italic tracking-tight">Drawdown Heatmap</h3>
                </div>
                <DrawdownHeatmap trades={trades} />
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="glass-panel">
                <SessionAnalytics trades={trades} />
              </div>
            </TabsContent>

            <TabsContent value="trades" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="glass-panel">
                <TradesList trades={trades} onTradeDeleted={handleTradeAdded} />
              </div>
            </TabsContent>

            <TabsContent value="compare" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="glass-panel">
                <PeriodComparison trades={trades} />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {user && <>
        <ConsentModal open={showConsentModal} onClose={() => { setShowConsentModal(false); fetchProfile(user.id); }} userId={user.id} />
        <MilestoneNotification trades={trades} userId={user.id} />
        <GamificationOverlay />
        <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
        <QuickCheckInModal
          open={showQuickCheckIn}
          onOpenChange={setShowQuickCheckIn}
          onComplete={() => { localStorage.removeItem('checkin_snooze_count'); localStorage.removeItem('checkin_snooze_until'); }}
          canSnooze={true}
        />
      </>}
    </Layout>
  );
};

export default Dashboard;
