import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format } from "date-fns";

interface EquityCurveProps {
  userId: string;
  accountId?: string;
}

export const EquityCurve = ({ userId, accountId }: EquityCurveProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEquityData();
  }, [userId, accountId]);

  const fetchEquityData = async () => {
    try {
      // Get all trades ordered by time
      let query = supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .not('result', 'is', null)
        .order('created_at', { ascending: true });

      if (accountId) {
        query = query.eq('mt5_account_id', accountId);
      }

      const { data: trades } = await query;

      if (!trades || trades.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Calculate cumulative P&L
      let cumulativePnL = 0;
      const equityData = trades.map((trade: any) => {
        cumulativePnL += trade.profit_loss || 0;
        return {
          date: format(new Date(trade.created_at), 'MMM dd'),
          equity: cumulativePnL,
          timestamp: new Date(trade.created_at).getTime()
        };
      });

      setData(equityData);
    } catch (error) {
      console.error('Error fetching equity data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Card>
      <CardHeader>
        <CardTitle>Equity Curve</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </CardContent>
    </Card>;
  }

  if (data.length === 0) {
    return <Card>
      <CardHeader>
        <CardTitle>Equity Curve</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No trading data available yet
        </div>
      </CardContent>
    </Card>;
  }

  const isPositive = data[data.length - 1]?.equity >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equity Curve</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "hsl(var(--chart-1))" : "hsl(var(--destructive))"} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={isPositive ? "hsl(var(--chart-1))" : "hsl(var(--destructive))"} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: any) => [`$${value.toFixed(2)}`, 'Equity']}
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke={isPositive ? "hsl(var(--chart-1))" : "hsl(var(--destructive))"}
              strokeWidth={2}
              fill="url(#colorEquity)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
