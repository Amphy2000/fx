import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, TrendingUp, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LeaderboardEntry {
  rank: number;
  partnership_name: string;
  user1_name: string;
  user2_name: string;
  combined_win_rate: number;
  combined_profit_factor: number;
  completion_rate: number;
  engagement_score: number;
  total_goals_completed: number;
}

export default function PartnershipLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      // Get partnership analytics for the period
      const { data: analytics } = await supabase
        .from('partnership_analytics')
        .select(`
          *,
          accountability_partnerships (
            id,
            user_id,
            partner_id,
            profiles!accountability_partnerships_user_id_fkey (full_name, email),
            partner_profile:profiles!accountability_partnerships_partner_id_fkey (full_name, email)
          )
        `)
        .gte('week_start', startDate.toISOString().split('T')[0])
        .lte('week_end', endDate.toISOString().split('T')[0])
        .order('engagement_score', { ascending: false })
        .limit(10);

      if (analytics) {
        const entries: LeaderboardEntry[] = analytics.map((entry: any, index) => {
          const partnership = entry.accountability_partnerships;
          const user1 = partnership?.profiles;
          const user2 = partnership?.partner_profile;

          return {
            rank: index + 1,
            partnership_name: `Partnership ${index + 1}`,
            user1_name: user1?.full_name || user1?.email || 'User 1',
            user2_name: user2?.full_name || user2?.email || 'User 2',
            combined_win_rate: entry.combined_win_rate || 0,
            combined_profit_factor: entry.combined_profit_factor || 0,
            completion_rate: entry.completion_rate || 0,
            engagement_score: entry.engagement_score || 0,
            total_goals_completed: entry.total_goals_completed || 0,
          };
        });

        setLeaderboard(entries);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2: return <Medal className="h-6 w-6 text-gray-400" />;
      case 3: return <Award className="h-6 w-6 text-amber-600" />;
      default: return <div className="h-6 w-6 flex items-center justify-center font-bold text-muted-foreground">#{rank}</div>;
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500">🏆 1st Place</Badge>;
    if (rank === 2) return <Badge variant="secondary">🥈 2nd Place</Badge>;
    if (rank === 3) return <Badge variant="outline">🥉 3rd Place</Badge>;
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Partnership Leaderboard</CardTitle>
          <CardDescription>Loading rankings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Partnership Leaderboard
            </CardTitle>
            <CardDescription>Top performing accountability partnerships</CardDescription>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1 rounded-md text-sm ${
                period === 'week' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1 rounded-md text-sm ${
                period === 'month' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              This Month
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No rankings available yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Complete goals with your partner to appear on the leaderboard
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  entry.rank <= 3 ? 'bg-accent/50' : 'bg-card'
                }`}
              >
                <div className="flex-shrink-0">
                  {getRankIcon(entry.rank)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold truncate">
                      {entry.user1_name} & {entry.user2_name}
                    </p>
                    {getRankBadge(entry.rank)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Goals:</span>
                      <span className="font-medium">{entry.total_goals_completed}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Win Rate:</span>
                      <span className="font-medium">{entry.combined_win_rate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Completion:</span>
                      <span className="font-medium">{entry.completion_rate.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Score:</span>
                      <span className="font-medium">{entry.engagement_score.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}