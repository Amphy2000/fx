import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Shield,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";

interface TradeJournalSyncProps {
  userId: string;
  accountSize: number;
  maxDailyDrawdown: number;
  maxTotalDrawdown: number;
  currentBalance: number;
}

interface TradeEntry {
  id: string;
  pair: string | null;
  direction: string | null;
  profit_loss: number | null;
  created_at: string;
  result: string | null;
  lot_size?: number | null;
  entry_price?: number | null;
  exit_price?: number | null;
  notes?: string | null;
  riskCompliant?: boolean;
}

export const TradeJournalSync = ({
  userId,
  accountSize,
  maxDailyDrawdown,
  maxTotalDrawdown,
  currentBalance,
}: TradeJournalSyncProps) => {
  const [recentTrades, setRecentTrades] = useState<TradeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayTrades: 0,
    todayPnL: 0,
    weekTrades: 0,
    weekPnL: 0,
    complianceRate: 0,
    avgRiskPercent: 0,
  });

  useEffect(() => {
    fetchTrades();
  }, [userId]);

  const fetchTrades = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (trades) {
        // Calculate risk compliance for each trade
        const dailyLimit = accountSize * (maxDailyDrawdown / 100);
        const tradesWithCompliance = trades.map(trade => ({
          ...trade,
          riskCompliant: Math.abs(trade.profit_loss || 0) <= dailyLimit * 0.1 // 10% of daily limit per trade
        }));

        setRecentTrades(tradesWithCompliance);

        // Calculate stats
        const todayTrades = trades.filter(t => new Date(t.created_at) >= today);
        const compliantTrades = tradesWithCompliance.filter(t => t.riskCompliant);

        setStats({
          todayTrades: todayTrades.length,
          todayPnL: todayTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0),
          weekTrades: trades.length,
          weekPnL: trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0),
          complianceRate: trades.length > 0 ? (compliantTrades.length / trades.length) * 100 : 100,
          avgRiskPercent: trades.length > 0 
            ? trades.reduce((sum, t) => sum + (Math.abs(t.profit_loss || 0) / accountSize * 100), 0) / trades.length 
            : 0,
        });
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const dailyLimitUsed = (Math.abs(stats.todayPnL) / (accountSize * (maxDailyDrawdown / 100))) * 100;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-none rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold text-white/40 uppercase">Today</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.todayTrades}</p>
          <p className={`text-sm font-bold ${stats.todayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.todayPnL >= 0 ? '+' : ''}{stats.todayPnL.toFixed(2)}
          </p>
        </Card>

        <Card className="bg-slate-800/50 border-none rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold text-white/40 uppercase">This Week</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.weekTrades}</p>
          <p className={`text-sm font-bold ${stats.weekPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.weekPnL >= 0 ? '+' : ''}{stats.weekPnL.toFixed(2)}
          </p>
        </Card>

        <Card className="bg-slate-800/50 border-none rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-[10px] font-bold text-white/40 uppercase">Compliance</span>
          </div>
          <p className={`text-2xl font-black ${stats.complianceRate >= 80 ? 'text-green-400' : stats.complianceRate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            {stats.complianceRate.toFixed(0)}%
          </p>
          <p className="text-[10px] text-white/40">Risk rules followed</p>
        </Card>

        <Card className="bg-slate-800/50 border-none rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-amber-400" />
            <span className="text-[10px] font-bold text-white/40 uppercase">Avg Risk</span>
          </div>
          <p className={`text-2xl font-black ${stats.avgRiskPercent <= 1 ? 'text-green-400' : stats.avgRiskPercent <= 2 ? 'text-amber-400' : 'text-red-400'}`}>
            {stats.avgRiskPercent.toFixed(2)}%
          </p>
          <p className="text-[10px] text-white/40">Per trade</p>
        </Card>
      </div>

      {/* Daily Limit Usage */}
      <Card className="bg-slate-900 border-none rounded-2xl">
        <CardHeader className="pb-2 border-b border-white/5">
          <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Today's Daily Limit Usage
            </div>
            <Badge className={`${
              dailyLimitUsed < 50 ? 'bg-green-500/20 text-green-400' :
              dailyLimitUsed < 75 ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400'
            } border-none`}>
              {dailyLimitUsed.toFixed(1)}% used
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="relative h-6 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`absolute left-0 top-0 h-full transition-all duration-500 ${
                dailyLimitUsed < 50 ? 'bg-green-500' :
                dailyLimitUsed < 75 ? 'bg-amber-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(dailyLimitUsed, 100)}%` }}
            />
            <div className="absolute left-[50%] top-0 h-full w-px bg-yellow-500/30" />
            <div className="absolute left-[75%] top-0 h-full w-px bg-orange-500/30" />
            <div className="absolute left-[90%] top-0 h-full w-px bg-red-500/30" />
          </div>
          <div className="flex justify-between mt-2 text-[9px] font-medium text-white/30">
            <span>Safe Zone</span>
            <span className="text-yellow-500">50%</span>
            <span className="text-orange-500">75%</span>
            <span className="text-red-500">90%</span>
            <span>Breach</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card className="bg-slate-900 border-none rounded-2xl">
        <CardHeader className="pb-2 border-b border-white/5">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Recent Trades with Compliance Check
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div className="text-center py-8 text-white/40">Loading trades...</div>
          ) : recentTrades.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No trades recorded this week</p>
              <p className="text-[10px] text-white/20 mt-1">Start trading to see your compliance data</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTrades.map((trade) => (
                <div 
                  key={trade.id}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    trade.riskCompliant ? 'bg-slate-800/50' : 'bg-red-500/10 border border-red-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      trade.profit_loss >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {trade.profit_loss >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{trade.pair}</span>
                        <Badge className={`${
                          trade.direction === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        } border-none text-[9px]`}>
                          {trade.direction?.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-white/40">
                        {format(new Date(trade.created_at), 'MMM d, HH:mm')}
                        {trade.lot_size && ` • ${trade.lot_size} lots`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        trade.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.profit_loss >= 0 ? '+' : ''}{trade.profit_loss?.toFixed(2)}
                      </p>
                      <p className="text-[9px] text-white/30">
                        {((Math.abs(trade.profit_loss) / accountSize) * 100).toFixed(2)}% of account
                      </p>
                    </div>
                    
                    <div className={`p-1.5 rounded-full ${
                      trade.riskCompliant ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {trade.riskCompliant ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
