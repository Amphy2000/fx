import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, DollarSign, Target, AlertTriangle, Calendar, Sparkles } from "lucide-react";
import { ModernGaugeChart } from '@/components/ModernGaugeChart';
import { ModernDonutChart } from '@/components/ModernDonutChart';
import { ModernRadarChart } from '@/components/ModernRadarChart';
import { CreditsGuard } from "@/components/CreditsGuard";
import { Badge } from "@/components/ui/badge";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AdvancedAnalytics = () => {
  const navigate = useNavigate();
  const [trades, setTrades] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>({});

  useEffect(() => {
    checkAuth();
    fetchAllData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchAllData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: tradesData } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const { data: checkInsData } = await (supabase as any)
      .from("daily_checkins")
      .select("*")
      .eq("user_id", user.id);

    if (tradesData) setTrades(tradesData);
    if (checkInsData) setCheckIns(checkInsData);
    
    if (tradesData && checkInsData) {
      calculateInsights(tradesData, checkInsData);
    }
  };

  const calculateInsights = (tradesData: any[], checkInsData: any[]) => {
    // Day of week performance
    const dayPerformance: any = {};
    tradesData.forEach(trade => {
      const day = new Date(trade.created_at).toLocaleDateString('en', { weekday: 'short' });
      if (!dayPerformance[day]) {
        dayPerformance[day] = { wins: 0, losses: 0, total: 0 };
      }
      dayPerformance[day].total++;
      if (trade.result === 'win') dayPerformance[day].wins++;
      if (trade.result === 'loss') dayPerformance[day].losses++;
    });

    const dayData = Object.entries(dayPerformance).map(([day, stats]: any) => ({
      day,
      winRate: stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0
    }));

    // Pair performance
    const pairPerformance: any = {};
    tradesData.forEach(trade => {
      if (!pairPerformance[trade.pair]) {
        pairPerformance[trade.pair] = { wins: 0, losses: 0, pl: 0 };
      }
      if (trade.result === 'win') pairPerformance[trade.pair].wins++;
      if (trade.result === 'loss') pairPerformance[trade.pair].losses++;
      pairPerformance[trade.pair].pl += trade.profit_loss || 0;
    });

    const pairData = Object.entries(pairPerformance)
      .map(([pair, stats]: any) => ({
        pair,
        pl: stats.pl.toFixed(2),
        wins: stats.wins,
        losses: stats.losses
      }))
      .sort((a, b) => parseFloat(b.pl) - parseFloat(a.pl))
      .slice(0, 5);

    // Emotional correlation
    const emotionPerformance: any = {};
    tradesData.forEach(trade => {
      if (!trade.emotion_before) return;
      if (!emotionPerformance[trade.emotion_before]) {
        emotionPerformance[trade.emotion_before] = { wins: 0, losses: 0 };
      }
      if (trade.result === 'win') emotionPerformance[trade.emotion_before].wins++;
      if (trade.result === 'loss') emotionPerformance[trade.emotion_before].losses++;
    });

    const emotionData = Object.entries(emotionPerformance).map(([emotion, stats]: any) => ({
      emotion,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.wins + stats.losses > 0 
        ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
        : 0
    }));

    // R-multiple distribution
    const rMultiples = tradesData
      .filter(t => t.profit_loss !== null && t.entry_price && t.stop_loss)
      .map(t => {
        const risk = Math.abs(t.entry_price - t.stop_loss);
        const reward = t.profit_loss;
        return risk > 0 ? reward / risk : 0;
      });

    const rDistribution = [
      { range: '< -2R', count: rMultiples.filter(r => r < -2).length },
      { range: '-2R to -1R', count: rMultiples.filter(r => r >= -2 && r < -1).length },
      { range: '-1R to 0R', count: rMultiples.filter(r => r >= -1 && r < 0).length },
      { range: '0R to 1R', count: rMultiples.filter(r => r >= 0 && r < 1).length },
      { range: '1R to 2R', count: rMultiples.filter(r => r >= 1 && r < 2).length },
      { range: '> 2R', count: rMultiples.filter(r => r >= 2).length }
    ];

    // Behavioral alerts
    const alerts = [];
    
    // Check for overtrading
    const lastWeekTrades = tradesData.filter(t => {
      const tradeDate = new Date(t.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return tradeDate >= weekAgo;
    });
    
    if (lastWeekTrades.length > 20) {
      alerts.push({
        type: "warning",
        message: `Overtrading detected: ${lastWeekTrades.length} trades in the last 7 days`
      });
    }

    // Check for revenge trading pattern
    const consecutiveLosses = tradesData
      .slice(-10)
      .filter((t, i, arr) => {
        if (i === 0) return false;
        return arr[i-1].result === 'loss' && t.result === 'loss';
      }).length;

    if (consecutiveLosses >= 3) {
      alerts.push({
        type: "danger",
        message: "Potential revenge trading: Multiple consecutive losses detected"
      });
    }

    setInsights({
      dayData,
      pairData,
      emotionData,
      rDistribution,
      alerts
    });
  };

  return (
    <Layout>
      <CreditsGuard requiredCredits={0} featureName="Advanced Analytics">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Advanced Analytics</h1>
              <p className="text-muted-foreground">Deep insights into your trading performance</p>
            </div>
            <Badge variant="default" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Premium Feature
            </Badge>
          </div>

        {insights.alerts && insights.alerts.length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="w-5 h-5" />
                Behavioral Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.alerts.map((alert: any, idx: number) => (
                  <li key={idx} className="text-sm">{alert.message}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Day of Week Performance
              </CardTitle>
              <CardDescription>Win rate by trading day</CardDescription>
            </CardHeader>
            <CardContent>
              {insights.dayData && insights.dayData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={insights.dayData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="dayWinRateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
                    <XAxis 
                      dataKey="day" 
                      fontSize={11}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis 
                      fontSize={11}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Win Rate %', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: any) => [`${value}%`, 'Win Rate']}
                    />
                    <Bar 
                      dataKey="winRate" 
                      fill="url(#dayWinRateGradient)" 
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">No data yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                R-Multiple Distribution
              </CardTitle>
              <CardDescription>Risk/reward outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              {insights.rDistribution && insights.rDistribution.some((d: any) => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={insights.rDistribution} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="rDistGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
                    <XAxis 
                      dataKey="range" 
                      fontSize={11}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis 
                      fontSize={11}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Trade Count', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: any) => [`${value} trades`, 'Count']}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="url(#rDistGradient)" 
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                      animationBegin={100}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">No data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Best & Worst Pairs
              </CardTitle>
              <CardDescription>Top 5 by profit/loss</CardDescription>
            </CardHeader>
            <CardContent>
              {insights.pairData && insights.pairData.length > 0 ? (
                <div className="space-y-3">
                  {insights.pairData.map((pair: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <div className="font-semibold">{pair.pair}</div>
                        <div className="text-sm text-muted-foreground">
                          {pair.wins}W / {pair.losses}L
                        </div>
                      </div>
                      <div className={`font-bold ${parseFloat(pair.pl) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${pair.pl}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12">No data yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Emotional Correlation
              </CardTitle>
              <CardDescription>Win rate by emotional state</CardDescription>
            </CardHeader>
            <CardContent>
              {insights.emotionData && insights.emotionData.length > 0 ? (
                <div className="space-y-3">
                  {insights.emotionData.map((emotion: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <div className="font-semibold capitalize">{emotion.emotion}</div>
                        <div className="text-sm text-muted-foreground">
                          {emotion.wins}W / {emotion.losses}L
                        </div>
                      </div>
                      <div className="font-bold text-primary">
                        {emotion.winRate}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12">No data yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </CreditsGuard>
    </Layout>
  );
};

export default AdvancedAnalytics;
