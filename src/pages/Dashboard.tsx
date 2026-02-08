import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { FreeTierLimitWarning } from "@/components/FreeTrierLimitWarning";
import TradesList from "@/components/TradesList";
import { ConsentModal } from "@/components/ConsentModal";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Target, BarChart3, LineChart, Activity, Brain, FileDown } from "lucide-react";
import { EquityCurve } from "@/components/EquityCurve";
import { ModernBarChart } from "@/components/ModernBarChart";
import { DrawdownHeatmap } from "@/components/DrawdownHeatmap";
import { SessionAnalytics } from "@/components/SessionAnalytics";
import { SetupPerformanceAnalyzer } from "@/components/SetupPerformanceAnalyzer";
import { PeriodComparison } from "@/components/PeriodComparison";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DailyChallengeCard } from "@/components/DailyChallengeCard";
import { TradingScoreCard } from "@/components/TradingScoreCard";
import { MilestoneNotification } from "@/components/MilestoneNotification";
import { GamificationOverlay } from "@/components/GamificationOverlay";
import { VoiceCommands } from "@/components/VoiceCommands";
import { ExportDialog } from "@/components/ExportDialog";
import { AccountSelector } from "@/components/AccountSelector";
import { AccountBreakdown } from "@/components/AccountBreakdown";
import { MentalStateCheckIn } from "@/components/MentalStateCheckIn";
import { MentalStateCorrelationCard } from "@/components/MentalStateCorrelationCard";
import { ValidationInsights } from "@/components/ValidationInsights";
import { PsychologyFirstBanner } from "@/components/PsychologyFirstBanner";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { FeatureUsageCard } from "@/components/FeatureUsageCard";
import { ShareToTwitterButton } from "@/components/ShareToTwitterButton";
import { QuickCheckInModal } from "@/components/QuickCheckInModal";
import { DrawdownRecoveryBanner } from "@/components/DrawdownRecoveryBanner";
import { FreeVoiceMemo } from "@/components/FreeVoiceMemo";
import { FeatureDiscoveryCard } from "@/components/FeatureDiscoveryCard";
import { format } from "date-fns";

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
  const [hidePnL, setHidePnL] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Time Filter State
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  const [stats, setStats] = useState({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    profitFactor: 0,
    totalPnL: 0,
    avgRMultiple: 0,
    bestTrade: 0,
    worstTrade: 0
  });
  // Swipe gesture handling
  const tabs = ["overview", "analytics", "trades", "comparison"];
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    const currentIndex = tabs.indexOf(activeTab);

    if (isLeftSwipe && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }

    if (isRightSwipe && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.id);
      fetchTrades(session.user.id);
      fetchMT5Accounts(session.user.id);
      checkDailyCheckIn(session.user.id);
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth"); else setUser(session.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const checkDailyCheckIn = async (userId: string) => {
    // Check if user has snoozed
    const snoozeUntil = localStorage.getItem('checkin_snooze_until');
    if (snoozeUntil && Date.now() < parseInt(snoozeUntil)) {
      return; // Still snoozed
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('daily_checkins')
      .select('id')
      .eq('user_id', userId)
      .eq('check_in_date', today)
      .single();

    if (!data) {
      // No check-in today, show modal after a short delay
      setTimeout(() => {
        setShowQuickCheckIn(true);
      }, 1500);
    } else {
      // Reset snooze count when check-in is complete
      localStorage.removeItem('checkin_snooze_count');
      localStorage.removeItem('checkin_snooze_until');
    }
  };

  // Track payment success from redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      const trackPaymentSuccess = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Track in bundle analytics
            await supabase.from('bundle_analytics').insert({
              event_type: 'payment_success',
              user_id: user.id,
              metadata: { plan: 'bundle', tracked_at: new Date().toISOString() }
            });

            // Show success message
            toast({
              title: "Payment successful!",
              description: "Your bundle access has been activated."
            });

            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          console.error("Error tracking payment success:", err);
        }
      };
      trackPaymentSuccess();
    }
  }, []);
  const fetchProfile = async (userId: string) => {
    const {
      data
    } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setProfile(data);
      if (data.data_collection_consent === null) setShowConsentModal(true);
    }
  };
  const fetchMT5Accounts = async (userId: string) => {
    const {
      data
    } = await supabase.from("mt5_accounts").select("*").eq("user_id", userId).eq("is_active", true);
    if (data) setMt5Accounts(data);
  };
  const fetchTrades = async (userId: string) => {
    const {
      data
    } = await supabase.from("trades").select("*").eq("user_id", userId).order("created_at", {
      ascending: false
    });
    if (data) {
      setAllTrades(data);
      setTrades(data);
      calculateStats(data);
    }
  };

  const calculateStats = (data: any[]) => {
    const wins = data.filter(t => t.result === "win").length;
    const losses = data.filter(t => t.result === "loss").length;
    const totalPnL = data.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const totalWin = data.filter(t => t.result === "win").reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const totalLoss = Math.abs(data.filter(t => t.result === "loss").reduce((sum, t) => sum + (t.profit_loss || 0), 0));
    setStats({
      totalTrades: data.length,
      wins,
      losses,
      winRate: data.length > 0 ? Math.round(wins / data.length * 100) : 0,
      profitFactor: totalLoss > 0 ? Number((totalWin / totalLoss).toFixed(2)) : 0,
      totalPnL: Number(totalPnL.toFixed(2)),
      avgRMultiple: Number((data.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / (data.length || 1)).toFixed(2)),
      bestTrade: Number(Math.max(...data.map(t => t.profit_loss || 0), 0).toFixed(2)),
      worstTrade: Number(Math.min(...data.map(t => t.profit_loss || 0), 0).toFixed(2))
    });
  };

  // Helper function to filter trades by time period
  const filterTradesByTime = (tradesToFilter: any[]) => {
    const now = new Date();

    switch (timeFilter) {
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return tradesToFilter.filter(t => new Date(t.created_at) >= weekAgo);
      }
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return tradesToFilter.filter(t => new Date(t.created_at) >= monthStart);
      }
      case 'custom': {
        if (!customStartDate) return tradesToFilter;
        const filtered = tradesToFilter.filter(t => {
          const tradeDate = new Date(t.created_at);
          const isAfterStart = tradeDate >= customStartDate;
          const isBeforeEnd = customEndDate ? tradeDate <= customEndDate : true;
          return isAfterStart && isBeforeEnd;
        });
        return filtered;
      }
      case 'all':
      default:
        return tradesToFilter;
    }
  };

  // Filter trades when account selection OR time filter changes
  useEffect(() => {
    let filtered = allTrades;

    // First filter by account if selected
    if (selectedAccountId) {
      filtered = filtered.filter(t => t.mt5_account_id === selectedAccountId);
    }

    // Then filter by time period
    filtered = filterTradesByTime(filtered);

    setTrades(filtered);
    calculateStats(filtered);
  }, [selectedAccountId, allTrades, timeFilter, customStartDate, customEndDate]);
  const handleTradeAdded = () => {
    if (user) {
      fetchTrades(user.id);
      fetchProfile(user.id);
    }
  };
  const getMonthlyData = () => {
    const monthlyStats: Record<string, {
      pnl: number;
      trades: number;
    }> = {};
    trades.forEach(trade => {
      const month = new Date(trade.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      });
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          pnl: 0,
          trades: 0
        };
      }
      monthlyStats[month].pnl += trade.profit_loss || 0;
      monthlyStats[month].trades += 1;
    });
    return Object.entries(monthlyStats).map(([month, stats]) => ({
      month,
      pnl: Number(stats.pnl.toFixed(2)),
      trades: stats.trades
    })).slice(-6);
  };

  // Real-time equity curve updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('trades-realtime').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'trades',
      filter: `user_id=eq.${user.id}`
    }, () => {
      fetchTrades(user.id);
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  return <Layout>
    <div className="safe-container space-y-4 p-3 md:p-4 lg:p-6">
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gradient-premium">Trading Dashboard</h1>
            <p className="text-xs md:text-sm lg:text-base text-muted-foreground">
              AI-Powered Analytics {mt5Accounts.length > 0 ? '• MT5 Synced' : ''}
              {selectedAccountId && mt5Accounts.length > 1 && ' • Filtered View'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ShareToTwitterButton
              stats={{
                totalTrades: stats.totalTrades,
                winRate: stats.winRate,
                totalPnL: stats.totalPnL,
                profitFactor: stats.profitFactor
              }}
              type="dashboard"
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)} className="text-xs md:text-sm">
                    <FileDown className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    Export
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download your trade history as CSV or PDF</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <CreditsDisplay />
          </div>
        </div>

        {mt5Accounts.length > 1 && (
          <div className="flex items-center gap-2">
            <AccountSelector
              accounts={mt5Accounts}
              selectedAccountId={selectedAccountId}
              onAccountChange={setSelectedAccountId}
            />
            {selectedAccountId && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedAccountId(null)}>
                Clear Filter
              </Button>
            )}
          </div>
        )}

        <FeatureDiscoveryCard />

        {/* TIME PERIOD FILTER */}
        <Card className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">Time Period:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={timeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('all')}
                  className="text-xs"
                >
                  All-Time
                </Button>
                <Button
                  variant={timeFilter === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('month')}
                  className="text-xs"
                >
                  This Month
                </Button>
                <Button
                  variant={timeFilter === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('week')}
                  className="text-xs"
                >
                  This Week
                </Button>
                <Button
                  variant={timeFilter === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('custom')}
                  className="text-xs"
                >
                  Custom Range
                </Button>
              </div>

              {timeFilter === 'custom' && (
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="date"
                    className="px-2 py-1 border rounded text-xs bg-background text-foreground dark:bg-slate-800 dark:text-white dark:border-slate-600"
                    onChange={(e) => setCustomStartDate(e.target.value ? new Date(e.target.value) : null)}
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="date"
                    className="px-2 py-1 border rounded text-xs bg-background text-foreground dark:bg-slate-800 dark:text-white dark:border-slate-600"
                    onChange={(e) => setCustomEndDate(e.target.value ? new Date(e.target.value) : null)}
                  />
                </div>
              )}

              <div className="text-xs text-muted-foreground ml-auto">
                Showing {stats.totalTrades} trade{stats.totalTrades !== 1 ? 's' : ''}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3 w-full max-w-full">
        <Card className="premium-card bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">Trades</p>
                <p className="text-base md:text-lg lg:text-xl font-bold">{stats.totalTrades}</p>
              </div>
              <Activity className="h-4 w-4 md:h-5 md:w-5 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className={`premium-card bg-gradient-to-br ${hidePnL ? 'from-muted/10 border-muted/30' : stats.totalPnL >= 0 ? 'from-success/10 border-success/30' : 'from-destructive/10 border-destructive/30'}`}>
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">P/L</p>
                {hidePnL ? (
                  <p className="text-xs md:text-base lg:text-lg font-bold text-muted-foreground">•••••</p>
                ) : (
                  <p className={`text-xs md:text-base lg:text-lg font-bold ${stats.totalPnL >= 0 ? 'text-gradient-success' : 'text-destructive'} break-all`}>
                    ${stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL.toLocaleString()}
                  </p>
                )}
              </div>
              {stats.totalPnL >= 0 ? <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-success opacity-50 flex-shrink-0" /> : <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-destructive opacity-50 flex-shrink-0" />}
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card bg-gradient-to-br from-blue-500/10 border-blue-500/30">
          <CardContent className="p-2 md:p-3">
            <div>
              <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate</p>
              <p className="text-base md:text-lg lg:text-xl font-bold">{stats.winRate}%</p>
              <Progress value={stats.winRate} className="h-1 mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card bg-gradient-to-br from-accent/10 border-accent/30">
          <CardContent className="p-2 md:p-3">
            <div>
              <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">Profit Factor</p>
              <p className="text-base md:text-lg lg:text-xl font-bold">{stats.profitFactor}</p>
              <p className="text-[9px] md:text-[10px] text-muted-foreground">{stats.wins}W/{stats.losses}L</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`premium-card bg-gradient-to-br ${hidePnL ? 'from-muted/10 border-muted/30' : 'from-success/10 border-success/30'}`}>
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">Best</p>
                {hidePnL ? (
                  <p className="text-xs md:text-base lg:text-lg font-bold text-muted-foreground">•••••</p>
                ) : (
                  <p className="text-xs md:text-base lg:text-lg font-bold text-gradient-success break-all">
                    +${stats.bestTrade.toLocaleString()}
                  </p>
                )}
              </div>
              <Target className="h-4 w-4 md:h-5 md:w-5 text-success opacity-50 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className={`premium-card bg-gradient-to-br ${hidePnL ? 'from-muted/10 border-muted/30' : 'from-destructive/10 border-destructive/30'}`}>
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">Worst</p>
                {hidePnL ? (
                  <p className="text-xs md:text-base lg:text-lg font-bold text-muted-foreground">•••••</p>
                ) : (
                  <p className="text-xs md:text-base lg:text-lg font-bold text-destructive break-all">
                    ${stats.worstTrade.toLocaleString()}
                  </p>
                )}
              </div>
              <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-destructive opacity-50 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto text-xs md:text-sm">
          <TabsTrigger value="overview" className="px-2 md:px-4">
            <BarChart3 className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="px-2 md:px-4">
            <LineChart className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="trades" className="px-2 md:px-4">
            <Activity className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">Trades</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="px-2 md:px-4">
            <Target className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">Compare</span>
          </TabsTrigger>
        </TabsList>

        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="touch-pan-y w-full"
        >
          <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-4 md:mt-6 animate-fade-in w-full">
            {user && <DrawdownRecoveryBanner userId={user.id} trades={trades} hidePnL={hidePnL} onHidePnLChange={setHidePnL} />}
            {profile && <SubscriptionBanner profile={profile} />}
            <PsychologyFirstBanner />
            <FreeTierLimitWarning />
            <MentalStateCheckIn />
            {mt5Accounts.length > 1 && !selectedAccountId && (
              <AccountBreakdown trades={allTrades} accounts={mt5Accounts} />
            )}
            <ValidationInsights />
            <MentalStateCorrelationCard />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 w-full">
              <DailyChallengeCard trades={trades} />
              <TradingScoreCard trades={trades} />
              <FeatureUsageCard />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
              {user && <EquityCurve userId={user.id} accountId={selectedAccountId} />}
              <ModernBarChart data={getMonthlyData()} />
            </div>
            <DrawdownHeatmap trades={trades} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 md:space-y-6 mt-4 md:mt-6 animate-fade-in w-full">
            <SessionAnalytics trades={trades} />
            {user && <SetupPerformanceAnalyzer trades={trades} userId={user.id} />}
          </TabsContent>

          <TabsContent value="trades" className="space-y-4 md:space-y-6 mt-4 md:mt-6 animate-fade-in w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-6 text-center space-y-4">
                  <Brain className="h-12 w-12 mx-auto text-primary" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">AI-Powered Trade Logging</h3>
                    <p className="text-muted-foreground mb-4">
                      Log trades faster with Voice or Screenshot AI - no manual forms needed!
                    </p>
                  </div>
                  <Button onClick={() => navigate("/ai-features")} size="lg" className="gap-2">
                    <Brain className="h-4 w-4" />
                    Go to AI Features
                  </Button>
                </CardContent>
              </Card>
              <FreeVoiceMemo onMemoSaved={() => toast({ title: "Memo saved!", description: "Your voice note has been recorded." })} />
            </div>
            <TradesList trades={trades} onTradeDeleted={handleTradeAdded} />
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4 md:space-y-6 mt-4 md:mt-6 animate-fade-in w-full">
            <PeriodComparison trades={trades} />
          </TabsContent>
        </div>
      </Tabs>
    </div>

    {user && <>
      <ConsentModal open={showConsentModal} onClose={() => {
        setShowConsentModal(false);
        fetchProfile(user.id);
      }} userId={user.id} />
      <MilestoneNotification trades={trades} userId={user.id} />
      <GamificationOverlay />
      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
      <QuickCheckInModal
        open={showQuickCheckIn}
        onOpenChange={setShowQuickCheckIn}
        onComplete={() => {
          localStorage.removeItem('checkin_snooze_count');
          localStorage.removeItem('checkin_snooze_until');
        }}
        canSnooze={true}
      />
    </>}
  </Layout>;
};
export default Dashboard;