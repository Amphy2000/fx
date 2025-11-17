import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, TrendingUp, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DailyChallengeCardProps {
  trades: any[];
}

export function DailyChallengeCard({ trades }: DailyChallengeCardProps) {
  const [todayStats, setTodayStats] = useState({
    tradesCount: 0,
    winRate: 0,
    profitLoss: 0,
  });

  useEffect(() => {
    const today = new Date().toDateString();
    const todayTrades = trades.filter(t => new Date(t.created_at).toDateString() === today);
    
    const wins = todayTrades.filter(t => t.result === "win").length;
    const pnl = todayTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    
    setTodayStats({
      tradesCount: todayTrades.length,
      winRate: todayTrades.length > 0 ? Math.round((wins / todayTrades.length) * 100) : 0,
      profitLoss: pnl,
    });
  }, [trades]);

  const challenges = [
    {
      title: "Execute 3 Quality Trades",
      target: 3,
      current: todayStats.tradesCount,
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Maintain 60%+ Win Rate",
      target: 60,
      current: todayStats.winRate,
      icon: Trophy,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Stay Profitable Today",
      target: 1,
      current: todayStats.profitLoss > 0 ? 1 : 0,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Daily Challenges
            </CardTitle>
            <CardDescription>Complete challenges to earn rewards</CardDescription>
          </div>
          <Badge variant="default" className="text-sm">
            {challenges.filter(c => c.current >= c.target).length}/{challenges.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {challenges.map((challenge, index) => {
          const progress = Math.min((challenge.current / challenge.target) * 100, 100);
          const isCompleted = challenge.current >= challenge.target;
          const Icon = challenge.icon;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${challenge.bgColor}`}>
                    <Icon className={`h-4 w-4 ${challenge.color}`} />
                  </div>
                  <span className="text-sm font-medium">{challenge.title}</span>
                </div>
                {isCompleted && (
                  <Badge variant="default" className="bg-green-500">
                    ✓ Done
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Progress value={progress} className="h-2 flex-1" />
                <span className="text-xs text-muted-foreground min-w-[60px] text-right">
                  {challenge.current}/{challenge.target}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
