import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModernRadarChart } from "./ModernRadarChart";
import { Badge } from "./ui/badge";

interface SessionData {
  session: string;
  winRate: number;
  avgR: number;
  profitFactor: number;
  trades: number;
  pnl: number;
}

interface SessionAnalyticsProps {
  data: SessionData[];
}

export const SessionAnalytics = ({ data }: SessionAnalyticsProps) => {
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
