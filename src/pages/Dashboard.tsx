import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import TradeForm from "@/components/TradeForm";
import TradesList from "@/components/TradesList";
import EmotionalInsights from "@/components/EmotionalInsights";
import TradingBadges from "@/components/TradingBadges";
import AchievementProgressTracker from "@/components/AchievementProgressTracker";
import { ConsentModal } from "@/components/ConsentModal";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { PerformanceMetrics } from "@/components/PerformanceMetrics";
import { EquityCurve } from "@/components/EquityCurve";
import { ModernBarChart } from "@/components/ModernBarChart";
import { DrawdownHeatmap } from "@/components/DrawdownHeatmap";
import { SessionAnalytics } from "@/components/SessionAnalytics";
import { SetupPerformanceAnalyzer } from "@/components/SetupPerformanceAnalyzer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Target, FileText, BarChart3, LineChart } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [stats, setStats] = useState({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.id);
      fetchTrades(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Check if user needs onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (profile && !profile.onboarding_completed) {
        navigate("/onboarding");
      }
    };
    
    checkOnboarding();
  }, [user, navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (data) {
      setProfile(data);
      
      // Show consent modal if user hasn't responded yet
      if (data.data_collection_consent === null) {
        setShowConsentModal(true);
      }
    }
  };

  const fetchTrades = async (userId: string) => {
    const { data } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (data) {
      setTrades(data);
      calculateStats(data);
    }
  };

  const calculateStats = (tradesData: any[]) => {
    const wins = tradesData.filter(t => t.result === "win").length;
    const losses = tradesData.filter(t => t.result === "loss").length;
    const total = tradesData.length;
    
    setStats({
      totalTrades: total,
      wins,
      losses,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
    });
  };

  const handleTradeAdded = () => {
    if (user) {
      fetchTrades(user.id);
      fetchProfile(user.id);
    }
  };

  // Calculate analytics data
  const monthlyData = trades.reduce((acc, trade) => {
    const month = new Date(trade.created_at || '').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const existing = acc.find(m => m.month === month);
    if (existing) {
      existing.pnl += trade.profit_loss || 0;
      existing.trades += 1;
    } else {
      acc.push({ month, pnl: trade.profit_loss || 0, trades: 1 });
    }
    return acc;
  }, [] as { month: string; pnl: number; trades: number }[]);

  const drawdownData = trades.map(trade => ({
    date: new Date(trade.created_at || '').toISOString().split('T')[0],
    drawdown: (trade.profit_loss || 0) < 0 ? (trade.profit_loss || 0) / 100 : 0,
    trades: 1,
  }));

  const sessionData = ['London', 'New York', 'Asian'].map(session => {
    const sessionTrades = trades.filter(t => t.session === session);
    const wins = sessionTrades.filter(t => t.result === 'win').length;
    const totalPnL = sessionTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const avgR = sessionTrades.length > 0 
      ? sessionTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / sessionTrades.length 
      : 0;
    const totalWins = sessionTrades.filter(t => (t.profit_loss || 0) > 0).reduce((s, t) => s + (t.profit_loss || 0), 0);
    const totalLosses = Math.abs(sessionTrades.filter(t => (t.profit_loss || 0) < 0).reduce((s, t) => s + (t.profit_loss || 0), 0));
    
    return {
      session,
      winRate: sessionTrades.length > 0 ? (wins / sessionTrades.length) * 100 : 0,
      avgR,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : 0,
      trades: sessionTrades.length,
      pnl: totalPnL,
    };
  });

  const setupData = trades.reduce((acc, trade) => {
    const setupName = trade.setup_id || 'No Setup';
    const existing = acc.find((s: any) => s.setupName === setupName);
    const isWin = trade.result === 'win';
    
    if (existing) {
      existing.totalTrades += 1;
      existing.totalPnL += trade.profit_loss || 0;
      if (isWin) existing.wins += 1;
      existing.totalR += trade.r_multiple || 0;
    } else {
      acc.push({
        setupName,
        totalTrades: 1,
        wins: isWin ? 1 : 0,
        totalPnL: trade.profit_loss || 0,
        totalR: trade.r_multiple || 0,
        winRate: 0,
        profitFactor: 0,
        avgR: 0,
        expectancy: 0,
      });
    }
    return acc;
  }, [] as any[]).map((setup: any) => {
    const winRate = (setup.wins / setup.totalTrades) * 100;
    const avgR = setup.totalR / setup.totalTrades;
    const wins = trades.filter(t => (t.setup_id || 'No Setup') === setup.setupName && (t.profit_loss || 0) > 0);
    const losses = trades.filter(t => (t.setup_id || 'No Setup') === setup.setupName && (t.profit_loss || 0) < 0);
    const totalWins = wins.reduce((s, t) => s + (t.profit_loss || 0), 0);
    const totalLosses = Math.abs(losses.reduce((s, t) => s + (t.profit_loss || 0), 0));
    
    return {
      ...setup,
      winRate,
      avgR,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : 0,
      expectancy: avgR,
    };
  });

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome back, {profile?.full_name || "Trader"}!</h1>
              <p className="text-muted-foreground">Track your trades and improve your performance</p>
            </div>
            {profile && (
              <div className="text-right">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {profile.subscription_tier === 'lifetime' ? '👑 Lifetime' : 
                   profile.subscription_tier === 'pro' ? '⚡ Pro' : '🆓 Free'}
                </div>
                {profile.subscription_tier === 'free' && profile.monthly_trade_limit && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {profile.trades_count || 0}/{profile.monthly_trade_limit} trades this month
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <CreditsDisplay />

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTrades}</div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.winRate}%</div>
                </CardContent>
              </Card>

              <Card className="border-border/50 border-success/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Wins</CardTitle>
                  <TrendingUp className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{stats.wins}</div>
                </CardContent>
              </Card>

              <Card className="border-border/50 border-destructive/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Losses</CardTitle>
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.losses}</div>
                </CardContent>
              </Card>
            </div>

            <PerformanceMetrics userId={user?.id} />
            <EquityCurve userId={user?.id} />
            <AchievementProgressTracker trades={trades} />
            <EmotionalInsights trades={trades} />
            <TradingBadges 
              trades={trades}
              currentStreak={profile?.current_streak}
              longestStreak={profile?.longest_streak}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-6">
            <ModernBarChart data={monthlyData} />
            <DrawdownHeatmap data={drawdownData} />
            <SessionAnalytics data={sessionData} />
          </TabsContent>

          <TabsContent value="trades" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <TradeForm onTradeAdded={handleTradeAdded} />
              </div>
              
              <div className="lg:col-span-2">
                <TradesList trades={trades} onTradeDeleted={handleTradeAdded} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6 mt-6">
            <SetupPerformanceAnalyzer data={setupData} />
          </TabsContent>
        </Tabs>
      </div>

      <ConsentModal 
        open={showConsentModal} 
        onClose={() => setShowConsentModal(false)}
        userId={user?.id}
      />
    </Layout>
  );
};

export default Dashboard;
