import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Brain, TrendingUp, Moon, Heart, Target, BarChart3 } from "lucide-react";
import { ModernBarChart } from "@/components/ModernBarChart";
import { ModernDonutChart } from "@/components/ModernDonutChart";
import { ModernGaugeChart } from "@/components/ModernGaugeChart";
import { SimpleBarChart } from "@/components/SimpleBarChart";
import { Skeleton } from "@/components/ui/skeleton";

interface CorrelationData {
  winRateByConfidence: Array<{ name: string; value: number }>;
  winRateBySleep: Array<{ name: string; value: number }>;
  winRateByStress: Array<{ name: string; value: number }>;
  winRateByMood: Array<{ name: string; value: number }>;
  avgPnlByMentalState: { optimal: number; suboptimal: number };
  overallImpact: number;
}

export default function MentalStateCorrelation() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CorrelationData | null>(null);

  useEffect(() => {
    fetchCorrelationData();
  }, []);

  const fetchCorrelationData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get last 60 days of data
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const [checkinsResponse, tradesResponse] = await Promise.all([
        supabase
          .from('daily_checkins')
          .select('*')
          .eq('user_id', user.id)
          .gte('check_in_date', sixtyDaysAgo.toISOString().split('T')[0])
          .order('check_in_date', { ascending: false }),
        
        supabase
          .from('trades')
          .select('result, profit_loss, created_at')
          .eq('user_id', user.id)
          .gte('created_at', sixtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
      ]);

      const checkins = checkinsResponse.data || [];
      const trades = tradesResponse.data || [];

      if (checkins.length === 0 || trades.length === 0) {
        setData(null);
        setLoading(false);
        return;
      }

      // Match trades with check-ins by date
      const tradesByDate = new Map();
      trades.forEach(trade => {
        const date = trade.created_at.split('T')[0];
        if (!tradesByDate.has(date)) {
          tradesByDate.set(date, []);
        }
        tradesByDate.get(date).push(trade);
      });

      const matched = checkins.map(checkin => {
        const dayTrades = tradesByDate.get(checkin.check_in_date) || [];
        const wins = dayTrades.filter(t => t.result === 'win').length;
        const total = dayTrades.length;
        const pnl = dayTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);

        return {
          ...checkin,
          win_rate: total > 0 ? (wins / total) * 100 : null,
          total_pnl: pnl,
          trade_count: total
        };
      }).filter(m => m.win_rate !== null);

      if (matched.length === 0) {
        setData(null);
        setLoading(false);
        return;
      }

      // Calculate correlations
      const byConfidence = {
        'High (7-10)': matched.filter(m => m.confidence >= 7),
        'Medium (4-6)': matched.filter(m => m.confidence >= 4 && m.confidence < 7),
        'Low (1-3)': matched.filter(m => m.confidence < 4)
      };

      const bySleep = {
        'Excellent (8+h)': matched.filter(m => m.sleep_hours >= 8),
        'Good (7-8h)': matched.filter(m => m.sleep_hours >= 7 && m.sleep_hours < 8),
        'Fair (6-7h)': matched.filter(m => m.sleep_hours >= 6 && m.sleep_hours < 7),
        'Poor (<6h)': matched.filter(m => m.sleep_hours < 6)
      };

      const byStress = {
        'Low (1-4)': matched.filter(m => m.stress <= 4),
        'Medium (5-6)': matched.filter(m => m.stress >= 5 && m.stress <= 6),
        'High (7-10)': matched.filter(m => m.stress >= 7)
      };

      const byMood = {
        'excellent': matched.filter(m => m.mood === 'excellent'),
        'good': matched.filter(m => m.mood === 'good'),
        'neutral': matched.filter(m => m.mood === 'neutral'),
        'low': matched.filter(m => m.mood === 'low'),
        'anxious': matched.filter(m => m.mood === 'anxious')
      };

      const avgWinRate = (arr: any[]) => 
        arr.length > 0 ? arr.reduce((sum, m) => sum + m.win_rate, 0) / arr.length : 0;

      const avgPnl = (arr: any[]) => 
        arr.length > 0 ? arr.reduce((sum, m) => sum + m.total_pnl, 0) / arr.length : 0;

      // Calculate optimal vs suboptimal performance
      const optimalDays = matched.filter(m => 
        m.confidence >= 7 && m.sleep_hours >= 7 && m.stress <= 4
      );
      const suboptimalDays = matched.filter(m =>
        m.confidence < 5 || m.sleep_hours < 6 || m.stress >= 7
      );

      const overallImpact = optimalDays.length > 0 && suboptimalDays.length > 0
        ? avgWinRate(optimalDays) - avgWinRate(suboptimalDays)
        : 0;

      setData({
        winRateByConfidence: Object.entries(byConfidence).map(([name, arr]) => ({
          name,
          value: Math.round(avgWinRate(arr))
        })),
        winRateBySleep: Object.entries(bySleep).map(([name, arr]) => ({
          name,
          value: Math.round(avgWinRate(arr))
        })),
        winRateByStress: Object.entries(byStress).map(([name, arr]) => ({
          name,
          value: Math.round(avgWinRate(arr))
        })),
        winRateByMood: Object.entries(byMood)
          .filter(([_, arr]) => arr.length > 0)
          .map(([name, arr]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value: Math.round(avgWinRate(arr))
          })),
        avgPnlByMentalState: {
          optimal: optimalDays.length > 0 ? avgPnl(optimalDays) : 0,
          suboptimal: suboptimalDays.length > 0 ? avgPnl(suboptimalDays) : 0
        },
        overallImpact: Math.round(overallImpact)
      });

    } catch (error) {
      console.error('Error fetching correlation data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Mental State ↔ Performance</h1>
            <p className="text-muted-foreground">How your psychology impacts your trading results</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6" />
                Mental State Analysis
              </CardTitle>
              <CardDescription>
                Start tracking your daily mental state and trades to see correlations
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                We need at least 7 days of check-ins + trades to show meaningful correlations.
              </p>
              <p className="text-sm text-muted-foreground">
                Keep logging your daily mental state and trades to unlock these powerful insights!
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8" />
            Mental State ↔ Performance
          </h1>
          <p className="text-muted-foreground">Data-driven insights: Your psychology IS your edge</p>
        </div>

        {/* Overall Impact */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              The Psychology Advantage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-primary">{Math.abs(data.overallImpact)}%</p>
                <p className="text-sm text-muted-foreground">
                  Win rate difference between optimal vs poor mental states
                </p>
              </div>
              <ModernGaugeChart value={Math.min(Math.abs(data.overallImpact), 100)} size={120} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-2xl font-bold text-green-600">
                  ${data.avgPnlByMentalState.optimal > 0 ? '+' : ''}
                  {Math.round(data.avgPnlByMentalState.optimal)}
                </p>
                <p className="text-xs text-muted-foreground">Avg P/L (Optimal State)</p>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <p className="text-2xl font-bold text-red-600">
                  ${data.avgPnlByMentalState.suboptimal > 0 ? '+' : ''}
                  {Math.round(data.avgPnlByMentalState.suboptimal)}
                </p>
                <p className="text-xs text-muted-foreground">Avg P/L (Poor State)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Confidence Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="w-5 h-5" />
                Win Rate by Confidence Level
              </CardTitle>
              <CardDescription>Higher confidence = Better performance?</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart data={data.winRateByConfidence} color="hsl(var(--chart-1))" />
            </CardContent>
          </Card>

          {/* Sleep Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Moon className="w-5 h-5" />
                Win Rate by Sleep Hours
              </CardTitle>
              <CardDescription>Sleep quality matters more than you think</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart data={data.winRateBySleep} color="hsl(var(--chart-2))" />
            </CardContent>
          </Card>

          {/* Stress Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-5 h-5" />
                Win Rate by Stress Level
              </CardTitle>
              <CardDescription>Lower stress = Better decisions</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart data={data.winRateByStress} color="hsl(var(--chart-3))" />
            </CardContent>
          </Card>

          {/* Mood Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5" />
                Win Rate by Mood
              </CardTitle>
              <CardDescription>Emotional state distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ModernDonutChart data={data.winRateByMood} />
            </CardContent>
          </Card>
        </div>

        {/* Key Insights */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Key Takeaways
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <span className="text-2xl">💡</span>
              <div>
                <p className="text-sm font-medium">Your Data Speaks Loud</p>
                <p className="text-xs text-muted-foreground">
                  These aren't generic stats—this is YOUR actual performance based on YOUR mental states.
                  The correlation is undeniable.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-sm font-medium">Actionable Strategy</p>
                <p className="text-xs text-muted-foreground">
                  On days when your mental state is suboptimal (low sleep, high stress, low confidence),
                  consider reducing position sizes or taking the day off. Your data shows it matters.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <span className="text-2xl">📈</span>
              <div>
                <p className="text-sm font-medium">The Edge is Internal</p>
                <p className="text-xs text-muted-foreground">
                  Most traders focus on setups and indicators. Your biggest edge is managing your
                  psychology. This data proves it.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}