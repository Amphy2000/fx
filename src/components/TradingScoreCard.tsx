import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Shield, Target, Zap } from "lucide-react";

interface TradingScoreCardProps {
  trades: any[];
}

export function TradingScoreCard({ trades }: TradingScoreCardProps) {
  const [score, setScore] = useState(0);
  const [metrics, setMetrics] = useState({
    consistency: 0,
    riskManagement: 0,
    profitability: 0,
    discipline: 0,
  });

  useEffect(() => {
    if (trades.length === 0) {
      setScore(0);
      return;
    }

    // Calculate metrics
    const wins = trades.filter(t => t.result === "win").length;
    const winRate = (wins / trades.length) * 100;
    const profitLoss = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const avgRMultiple = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.length;

    // Consistency (based on win rate stability)
    const consistency = Math.min(winRate * 1.5, 100);

    // Risk Management (based on R-multiple)
    const riskManagement = Math.min(Math.max((avgRMultiple + 1) * 50, 0), 100);

    // Profitability
    const profitability = profitLoss > 0 ? Math.min((profitLoss / 1000) * 10 + 50, 100) : Math.max(50 + (profitLoss / 100), 0);

    // Discipline (based on setup adherence - if setup_id exists)
    const tradesWithSetup = trades.filter(t => t.setup_id).length;
    const discipline = (tradesWithSetup / trades.length) * 100;

    setMetrics({
      consistency: Math.round(consistency),
      riskManagement: Math.round(riskManagement),
      profitability: Math.round(profitability),
      discipline: Math.round(discipline),
    });

    // Overall score
    const totalScore = Math.round((consistency + riskManagement + profitability + discipline) / 4);
    setScore(totalScore);
  }, [trades]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-blue-500";
    if (score >= 40) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Elite Trader";
    if (score >= 60) return "Skilled Trader";
    if (score >= 40) return "Developing Trader";
    return "Beginner Trader";
  };

  const scoreMetrics = [
    { label: "Consistency", value: metrics.consistency, icon: Target, color: "text-blue-500" },
    { label: "Risk Control", value: metrics.riskManagement, icon: Shield, color: "text-green-500" },
    { label: "Profitability", value: metrics.profitability, icon: TrendingUp, color: "text-amber-500" },
    { label: "Discipline", value: metrics.discipline, icon: Zap, color: "text-purple-500" },
  ];

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Trading Score
            </CardTitle>
            <CardDescription>Your overall trading performance rating</CardDescription>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {getScoreLabel(score)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
            <div className="text-sm text-muted-foreground text-center">out of 100</div>
          </div>
        </div>

        <div className="space-y-4">
          {scoreMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${metric.color}`} />
                    <span className="text-sm font-medium">{metric.label}</span>
                  </div>
                  <span className="text-sm font-bold">{metric.value}%</span>
                </div>
                <Progress value={metric.value} className="h-2" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
