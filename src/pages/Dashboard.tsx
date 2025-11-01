import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import TradeForm from "@/components/TradeForm";
import TradesList from "@/components/TradesList";
import EmotionalInsights from "@/components/EmotionalInsights";
import TradingBadges from "@/components/TradingBadges";
import { ConsentModal } from "@/components/ConsentModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, FileText } from "lucide-react";

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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

            {/* Emotional Insights */}
            <EmotionalInsights trades={trades} />

            {/* Trading Badges */}
            <TradingBadges 
              trades={trades}
              currentStreak={profile?.current_streak}
              longestStreak={profile?.longest_streak}
            />

            {/* Trade Form & List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
              <div className="lg:col-span-1">
                <TradeForm onTradeAdded={handleTradeAdded} />
              </div>
              
              <div className="lg:col-span-2">
                <TradesList trades={trades} onTradeDeleted={handleTradeAdded} />
              </div>
        </div>
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
