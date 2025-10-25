import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Brain, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Trade {
  emotion_before: string | null;
  result: string;
  created_at: string;
}

interface TradingBadgesProps {
  trades: Trade[];
}

const TradingBadges = ({ trades }: TradingBadgesProps) => {
  const badges = [];

  // Zen Trader: 5 calm trades in a row
  let consecutiveCalm = 0;
  let maxConsecutiveCalm = 0;
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  sortedTrades.forEach(trade => {
    if (trade.emotion_before === 'calm' || trade.emotion_before === 'confident') {
      consecutiveCalm++;
      maxConsecutiveCalm = Math.max(maxConsecutiveCalm, consecutiveCalm);
    } else {
      consecutiveCalm = 0;
    }
  });

  if (maxConsecutiveCalm >= 5) {
    badges.push({
      id: 'zen-trader',
      icon: '🧘',
      title: 'Zen Trader',
      description: `${maxConsecutiveCalm} calm trades in a row`,
      color: 'text-green-500',
    });
  }

  // Emotionally Aware: 10+ emotional entries
  const emotionalTrades = trades.filter(t => t.emotion_before || t.emotion_before);
  if (emotionalTrades.length >= 10) {
    badges.push({
      id: 'emotionally-aware',
      icon: '🧠',
      title: 'Emotionally Aware',
      description: `${emotionalTrades.length} emotional entries logged`,
      color: 'text-primary',
    });
  }

  // Self-Control Master: No impatient/anxious trades for 2 weeks
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const recentTrades = trades.filter(t => new Date(t.created_at) >= twoWeeksAgo);
  const hasNegativeEmotions = recentTrades.some(t => 
    t.emotion_before === 'anxious' || t.emotion_before === 'impatient'
  );

  if (recentTrades.length >= 5 && !hasNegativeEmotions) {
    badges.push({
      id: 'self-control',
      icon: '💎',
      title: 'Self-Control Master',
      description: '2 weeks of disciplined trading',
      color: 'text-blue-500',
    });
  }

  // Consistent Performer: 70%+ win rate with 10+ trades
  const wins = trades.filter(t => t.result === 'win').length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
  
  if (trades.length >= 10 && winRate >= 70) {
    badges.push({
      id: 'consistent-performer',
      icon: '🏆',
      title: 'Consistent Performer',
      description: `${Math.round(winRate)}% win rate over ${trades.length} trades`,
      color: 'text-primary',
    });
  }

  if (badges.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Your Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {badges.map(badge => (
            <div 
              key={badge.id} 
              className="bg-card border border-border/50 rounded-lg p-4 hover:border-primary/50 transition-smooth"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{badge.icon}</span>
                <div className="flex-1">
                  <h4 className={`font-semibold ${badge.color}`}>{badge.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingBadges;
