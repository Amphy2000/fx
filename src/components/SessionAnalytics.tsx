import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModernRadarChart } from "./ModernRadarChart";
import { Badge } from "./ui/badge";
import { useMemo } from "react";

interface SessionAnalyticsProps {
  trades: any[];
}

export const SessionAnalytics = ({ trades }: SessionAnalyticsProps) => {
  const data = useMemo(() => {
    const sessions = ['London', 'New York', 'Asian'];
    return sessions.map(session => {
      const sessionTrades = trades.filter(t => t.session === session);
      const wins = sessionTrades.filter(t => t.result === 'win').length;
      const totalWin = sessionTrades.filter(t => t.result === 'win').reduce((sum, t) => sum + (t.profit_loss || 0), 0);
      const totalLoss = Math.abs(sessionTrades.filter(t => t.result === 'loss').reduce((sum, t) => sum + (t.profit_loss || 0), 0));
      
      return {
        session,
        winRate: sessionTrades.length > 0 ? (wins / sessionTrades.length) * 100 : 0,
        avgR: sessionTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / (sessionTrades.length || 1),
        profitFactor: totalLoss > 0 ? totalWin / totalLoss : 0,
        trades: sessionTrades.length,
        pnl: sessionTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0)
      };
    });
  }, [trades]);
  
  const radarData = data.flatMap(s => [
    { metric: `${s.session} WR`, value: s.winRate, fullMark: 100 },
    { metric: `${s.session} R`, value: Math.abs(s.avgR) * 20, fullMark: 100 },
    { metric: `${s.session} PF`, value: Math.min(s.profitFactor * 20, 100), fullMark: 100 },
  ]);

  const getBestSession = () => {
    return data.reduce((best, current) => 
      current.pnl > best.pnl ? current : best
    , data[0]);
  };

  const bestSession = data.length > 0 ? getBestSession() : null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Session Performance Radar</CardTitle>
        </CardHeader>
        <CardContent>
          <ModernRadarChart data={radarData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((session) => (
              <div key={session.session} className="border-b border-border pb-3 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{session.session}</span>
                    {bestSession?.session === session.session && (
                      <Badge variant="default">Best</Badge>
                    )}
                  </div>
                  <span className={`font-semibold ${session.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                    ${session.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Win Rate</div>
                    <div className="font-medium">{session.winRate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Avg R</div>
                    <div className="font-medium">{session.avgR.toFixed(2)}R</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">PF</div>
                    <div className="font-medium">{session.profitFactor.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Trades</div>
                    <div className="font-medium">{session.trades}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
