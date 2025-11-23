import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, Activity, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TradingStats {
  user_id: string;
  user_name: string;
  total_trades: number;
  win_rate: number;
  profit_factor: number;
  total_pnl: number;
  recent_streak: number;
  last_trade_date: string;
}

interface Props {
  partnershipId: string;
}

export default function PartnerTradingStats({ partnershipId }: Props) {
  const [stats, setStats] = useState<TradingStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    
    // Set up realtime subscription for trades
    const channel = supabase
      .channel('partner-trades')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
        },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnershipId]);

  const loadStats = async () => {
    try {
      // Get partnership users
      const { data: partnership } = await supabase
        .from('accountability_partnerships')
        .select(`
          user_id,
          partner_id,
          user:profiles!accountability_partnerships_user_id_fkey(full_name, email),
          partner:profiles!accountability_partnerships_partner_id_fkey(full_name, email)
        `)
        .eq('id', partnershipId)
        .single();

      if (!partnership) return;

      const calculateUserStats = async (userId: string, userName: string): Promise<TradingStats> => {
        // Get trades from last 7 days
        const { data: trades } = await supabase
          .from('trades')
          .select('profit_loss, result, created_at')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        const totalTrades = trades?.length || 0;
        const winningTrades = trades?.filter(t => t.result === 'win').length || 0;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        
        const totalProfit = trades?.filter(t => t.profit_loss > 0)
          .reduce((sum, t) => sum + t.profit_loss, 0) || 0;
        const totalLoss = Math.abs(trades?.filter(t => t.profit_loss < 0)
          .reduce((sum, t) => sum + t.profit_loss, 0) || 0);
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;
        const totalPnl = trades?.reduce((sum, t) => sum + (t.profit_loss || 0), 0) || 0;

        // Calculate streak
        const tradeDates = trades?.map(t => new Date(t.created_at).toISOString().split('T')[0]) || [];
        const uniqueDates = [...new Set(tradeDates)].sort();
        let currentStreak = 0;
        for (let i = uniqueDates.length - 1; i >= 0; i--) {
          const date = new Date(uniqueDates[i]);
          const expectedDate = new Date();
          expectedDate.setDate(expectedDate.getDate() - currentStreak);
          if (date.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
            currentStreak++;
          } else {
            break;
          }
        }

        return {
          user_id: userId,
          user_name: userName,
          total_trades: totalTrades,
          win_rate: winRate,
          profit_factor: profitFactor,
          total_pnl: totalPnl,
          recent_streak: currentStreak,
          last_trade_date: trades?.[0]?.created_at || '',
        };
      };

      const user1Name = (partnership.user as any)?.full_name || (partnership.user as any)?.email || 'User 1';
      const user2Name = (partnership.partner as any)?.full_name || (partnership.partner as any)?.email || 'User 2';

      const [user1Stats, user2Stats] = await Promise.all([
        calculateUserStats(partnership.user_id, user1Name),
        calculateUserStats(partnership.partner_id, user2Name),
      ]);

      setStats([user1Stats, user2Stats]);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading trading stats...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Partner Trading Performance</h3>
        <Badge variant="outline">Last 7 Days</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat) => (
          <Card key={stat.user_id}>
            <CardHeader>
              <CardTitle className="text-base">{stat.user_name}</CardTitle>
              <CardDescription>Recent Performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Activity className="h-4 w-4" />
                      <span>Trades</span>
                    </div>
                    <p className="text-2xl font-bold">{stat.total_trades}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="h-4 w-4" />
                      <span>Win Rate</span>
                    </div>
                    <p className="text-2xl font-bold">{stat.win_rate.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {stat.total_pnl >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span>Total P&L</span>
                    </div>
                    <p className={`text-2xl font-bold ${stat.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${stat.total_pnl.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Streak</span>
                    </div>
                    <p className="text-2xl font-bold">{stat.recent_streak} days</p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Profit Factor</span>
                    <span className="font-medium">{stat.profit_factor.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}