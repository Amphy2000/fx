import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle, Brain, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PreTradeChecklistProps {
  onRiskAssessed: (riskLevel: 'high' | 'medium' | 'low') => void;
}

export const PreTradeChecklist = ({ onRiskAssessed }: PreTradeChecklistProps) => {
  const [loading, setLoading] = useState(true);
  const [todayCheckIn, setTodayCheckIn] = useState<any>(null);
  const [recentLosses, setRecentLosses] = useState(0);
  const [historicalPerformance, setHistoricalPerformance] = useState<any>(null);
  const [riskLevel, setRiskLevel] = useState<'high' | 'medium' | 'low'>('medium');

  useEffect(() => {
    assessPreTradeRisk();
  }, []);

  const assessPreTradeRisk = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get today's check-in
      const today = new Date().toISOString().split('T')[0];
      const { data: checkin } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_in_date', today)
        .single();

      setTodayCheckIn(checkin);

      // Get recent losses (last 2 hours)
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const { data: recentTrades } = await supabase
        .from('trades')
        .select('result')
        .eq('user_id', user.id)
        .gte('created_at', twoHoursAgo.toISOString())
        .eq('result', 'loss');

      setRecentLosses(recentTrades?.length || 0);

      // Get historical performance with similar mental states
      if (checkin) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get similar mental state days
        const { data: similarCheckins } = await supabase
          .from('daily_checkins')
          .select('check_in_date')
          .eq('user_id', user.id)
          .gte('check_in_date', thirtyDaysAgo.toISOString().split('T')[0])
          .lte('confidence', checkin.confidence + 1)
          .gte('confidence', checkin.confidence - 1)
          .lte('sleep_hours', checkin.sleep_hours + 1)
          .gte('sleep_hours', checkin.sleep_hours - 1)
          .lte('stress', checkin.stress + 1)
          .gte('stress', checkin.stress - 1);

        if (similarCheckins && similarCheckins.length > 0) {
          const dates = similarCheckins.map(c => c.check_in_date);
          
          // Get trades from those days
          const { data: similarTrades } = await supabase
            .from('trades')
            .select('result, profit_loss')
            .eq('user_id', user.id)
            .in('created_at', dates.map(d => d + '%'));

          if (similarTrades && similarTrades.length > 0) {
            const wins = similarTrades.filter(t => t.result === 'win').length;
            const winRate = (wins / similarTrades.length) * 100;
            const avgPnl = similarTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / similarTrades.length;

            setHistoricalPerformance({
              winRate: Math.round(winRate),
              avgPnl: Math.round(avgPnl),
              sampleSize: similarTrades.length
            });
          }
        }
      }

      // Calculate risk level
      let risk: 'high' | 'medium' | 'low' = 'low';
      
      if (!checkin) {
        risk = 'medium';
      } else {
        const poorMentalState = checkin.confidence < 5 || checkin.sleep_hours < 6 || checkin.stress >= 7;
        const hasRecentLosses = (recentTrades?.length || 0) > 0;
        
        if (poorMentalState && hasRecentLosses) {
          risk = 'high';
        } else if (poorMentalState || hasRecentLosses) {
          risk = 'medium';
        } else {
          risk = 'low';
        }
      }

      setRiskLevel(risk);
      onRiskAssessed(risk);

    } catch (error) {
      console.error('Error assessing pre-trade risk:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = () => {
    if (riskLevel === 'high') return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (riskLevel === 'medium') return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-green-500 bg-green-500/10 border-green-500/20';
  };

  const getRiskIcon = () => {
    if (riskLevel === 'high') return <AlertTriangle className="w-5 h-5" />;
    if (riskLevel === 'medium') return <Brain className="w-5 h-5" />;
    return <CheckCircle className="w-5 h-5" />;
  };

  const getRiskMessage = () => {
    if (!todayCheckIn) {
      return "⚠️ No mental state check-in today. Complete your daily check-in for personalized guidance.";
    }

    if (riskLevel === 'high') {
      return "🛑 HIGH RISK CONDITIONS DETECTED. Consider skipping live trading today or reducing position size by 50%.";
    }

    if (riskLevel === 'medium') {
      return "⚠️ Suboptimal trading conditions. Consider reducing position size or being extra cautious with entries.";
    }

    return "✅ Good trading conditions. Your mental state aligns with your historically better performance.";
  };

  return (
    <Card className={`border-2 ${getRiskColor()}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {getRiskIcon()}
            Pre-Trade Psychology Check
          </div>
          <Badge variant={riskLevel === 'high' ? 'destructive' : riskLevel === 'medium' ? 'secondary' : 'default'}>
            {riskLevel.toUpperCase()} RISK
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription className="text-sm">
            {getRiskMessage()}
          </AlertDescription>
        </Alert>

        {todayCheckIn && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Today's State</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Confidence:</span>
                  <span className="font-medium">{todayCheckIn.confidence}/10</span>
                </div>
                <div className="flex justify-between">
                  <span>Sleep:</span>
                  <span className="font-medium">{todayCheckIn.sleep_hours}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Stress:</span>
                  <span className="font-medium">{todayCheckIn.stress}/10</span>
                </div>
              </div>
            </div>

            {historicalPerformance && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Similar Days</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Win Rate:</span>
                    <span className="font-medium">{historicalPerformance.winRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg P/L:</span>
                    <span className={`font-medium ${historicalPerformance.avgPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${historicalPerformance.avgPnl >= 0 ? '+' : ''}{historicalPerformance.avgPnl}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sample:</span>
                    <span className="font-medium">{historicalPerformance.sampleSize} trades</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {recentLosses > 0 && (
          <Alert variant="destructive">
            <TrendingDown className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {recentLosses} loss{recentLosses > 1 ? 'es' : ''} in the last 2 hours. Revenge trading risk elevated.
            </AlertDescription>
          </Alert>
        )}

        {!todayCheckIn && (
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Complete your daily check-in to get personalized risk assessment and historical performance data.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};