import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, Activity, BarChart3, Zap, Award, AlertTriangle } from "lucide-react";

interface PerformanceMetricsProps {
  userId: string;
  accountId?: string;
}

export const PerformanceMetrics = ({ userId, accountId }: PerformanceMetricsProps) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [userId, accountId]);

  const fetchMetrics = async () => {
    try {
      let query = supabase
        .from('performance_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('metric_date', { ascending: false })
        .limit(1);

      if (accountId) {
        query = query.eq('mt5_account_id', accountId);
      }

      const { data } = await query.maybeSingle();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-20 bg-muted rounded" />
          </CardContent>
        </Card>
      ))}
    </div>;
  }

  if (!metrics) {
    return <Card>
      <CardContent className="p-6 text-center text-muted-foreground">
        No performance data available yet. Start trading to see your metrics.
      </CardContent>
    </Card>;
  }

  const metricCards = [
    {
      title: "Win Rate",
      value: `${metrics.win_rate?.toFixed(1) || 0}%`,
      icon: Target,
      color: metrics.win_rate >= 50 ? "text-green-500" : "text-red-500",
      bgColor: metrics.win_rate >= 50 ? "bg-green-500/10" : "bg-red-500/10"
    },
    {
      title: "Profit Factor",
      value: metrics.profit_factor?.toFixed(2) || "0.00",
      icon: TrendingUp,
      color: metrics.profit_factor >= 1.5 ? "text-green-500" : metrics.profit_factor >= 1 ? "text-yellow-500" : "text-red-500",
      bgColor: "bg-chart-1/10"
    },
    {
      title: "Average R",
      value: metrics.average_r?.toFixed(2) || "0.00",
      icon: Activity,
      color: metrics.average_r >= 0 ? "text-green-500" : "text-red-500",
      bgColor: "bg-chart-2/10"
    },
    {
      title: "Total Trades",
      value: metrics.total_trades || 0,
      icon: BarChart3,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Avg Win",
      value: `$${metrics.average_win?.toFixed(2) || "0.00"}`,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Avg Loss",
      value: `$${Math.abs(metrics.average_loss || 0).toFixed(2)}`,
      icon: TrendingDown,
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    },
    {
      title: "Best Streak",
      value: `${metrics.consecutive_wins || 0} wins`,
      icon: Award,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10"
    },
    {
      title: "Max Drawdown",
      value: `$${Math.abs(metrics.max_drawdown || 0).toFixed(2)}`,
      icon: AlertTriangle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((metric, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metric.color}`}>
              {metric.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
