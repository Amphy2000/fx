import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import TradeForm from "@/components/TradeForm";
import TradesList from "@/components/TradesList";
import { ConsentModal } from "@/components/ConsentModal";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Target, BarChart3, LineChart, Activity, Brain } from "lucide-react";
import { EquityCurve } from "@/components/EquityCurve";
import { ModernBarChart } from "@/components/ModernBarChart";
import { DrawdownHeatmap } from "@/components/DrawdownHeatmap";
import { SessionAnalytics } from "@/components/SessionAnalytics";
import { SetupPerformanceAnalyzer } from "@/components/SetupPerformanceAnalyzer";
import EmotionalInsights from "@/components/EmotionalInsights";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [mt5Accounts, setMt5Accounts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    profitFactor: 0,
    totalPnL: 0,
    avgRMultiple: 0,
    bestTrade: 0,
    worstTrade: 0,
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
      fetchMT5Accounts(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setProfile(data);
      if (data.data_collection_consent === null) setShowConsentModal(true);
    }
  };

  const fetchMT5Accounts = async (userId: string) => {
    const { data } = await supabase.from("mt5_accounts").select("*").eq("user_id", userId).eq("is_active", true);
    if (data) setMt5Accounts(data);
  };

  const fetchTrades = async (userId: string) => {
    const { data } = await supabase.from("trades").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (data) {
      setTrades(data);
      const wins = data.filter(t => t.result === "win").length;
      const losses = data.filter(t => t.result === "loss").length;
      const totalPnL = data.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
      const totalWin = data.filter(t => t.result === "win").reduce((sum, t) => sum + (t.profit_loss || 0), 0);
      const totalLoss = Math.abs(data.filter(t => t.result === "loss").reduce((sum, t) => sum + (t.profit_loss || 0), 0));
      
      setStats({
        totalTrades: data.length,
        wins,
        losses,
        winRate: data.length > 0 ? Math.round((wins / data.length) * 100) : 0,
        profitFactor: totalLoss > 0 ? Number((totalWin / totalLoss).toFixed(2)) : 0,
        totalPnL: Number(totalPnL.toFixed(2)),
        avgRMultiple: Number((data.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / (data.length || 1)).toFixed(2)),
        bestTrade: Number(Math.max(...data.map(t => t.profit_loss || 0), 0).toFixed(2)),
        worstTrade: Number(Math.min(...data.map(t => t.profit_loss || 0), 0).toFixed(2)),
      });
    }
  };

  const handleTradeAdded = () => {
    if (user) {
      fetchTrades(user.id);
      fetchProfile(user.id);
    }
  };

  const getMonthlyData = () => {
    const monthlyPnL: Record<string, number> = {};
    trades.forEach(trade => {
      const month = new Date(trade.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyPnL[month] = (monthlyPnL[month] || 0) + (trade.profit_loss || 0);
    });
    return Object.entries(monthlyPnL).map(([month, pnl]) => ({ month, pnl: Number(pnl.toFixed(2)) })).slice(-6);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Trading Dashboard</h1>
            <p className="text-muted-foreground">Professional analytics {mt5Accounts.length > 0 ? 'powered by MT5' : ''}</p>
          </div>
          {profile && <CreditsDisplay credits={profile.ai_credits || 0} />}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Trades</p>
                  <p className="text-2xl font-bold">{stats.totalTrades}</p>
                </div>
                <Activity className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${stats.totalPnL >= 0 ? 'from-green-500/10 border-green-500/20' : 'from-red-500/10 border-red-500/20'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">P/L</p>
                  <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL}
                  </p>
                </div>
                {stats.totalPnL >= 0 ? <TrendingUp className="h-8 w-8 text-green-600 opacity-50" /> : <TrendingDown className="h-8 w-8 text-red-600 opacity-50" />}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Win Rate</p>
                <p className="text-2xl font-bold">{stats.winRate}%</p>
                <Progress value={stats.winRate} className="h-1 mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Profit Factor</p>
                <p className="text-2xl font-bold">{stats.profitFactor}</p>
                <p className="text-xs text-muted-foreground">{stats.wins}W/{stats.losses}L</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 border-amber-500/20">
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Avg R</p>
                <p className="text-2xl font-bold">{stats.avgRMultiple}R</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Best</p>
                <p className="text-2xl font-bold text-green-600">+${stats.bestTrade}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 border-red-500/20">
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Worst</p>
                <p className="text-2xl font-bold text-red-600">${stats.worstTrade}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-2" />Overview</TabsTrigger>
            <TabsTrigger value="analytics"><LineChart className="h-4 w-4 mr-2" />Analytics</TabsTrigger>
            <TabsTrigger value="trades"><Activity className="h-4 w-4 mr-2" />Trades</TabsTrigger>
            <TabsTrigger value="insights"><Brain className="h-4 w-4 mr-2" />Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <EquityCurve trades={trades} />
              <ModernBarChart data={getMonthlyData()} />
            </div>
            <DrawdownHeatmap trades={trades} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-6">
            <SessionAnalytics trades={trades} />
            <SetupPerformanceAnalyzer trades={trades} userId={user?.id} />
          </TabsContent>

          <TabsContent value="trades" className="space-y-6 mt-6">
            <TradeForm onTradeAdded={handleTradeAdded} />
            <TradesList trades={trades} onTradeDeleted={handleTradeAdded} />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6 mt-6">
            <EmotionalInsights trades={trades} />
          </TabsContent>
        </Tabs>
      </div>

      <ConsentModal open={showConsentModal} onClose={() => setShowConsentModal(false)} onConsent={async (consent) => {
        if (user) {
          await supabase.from("profiles").update({ data_collection_consent: consent, consent_date: new Date().toISOString() }).eq("id", user.id);
          setShowConsentModal(false);
          fetchProfile(user.id);
        }
      }} />
    </Layout>
  );
};

export default Dashboard;
