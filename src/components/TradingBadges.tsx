import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Trade {
  emotion_before: string | null;
  result: string;
  created_at: string;
}

interface TradingBadgesProps {
  trades: Trade[];
  currentStreak?: number;
  longestStreak?: number;
}

interface Achievement {
  id: string;
  achievement_name: string;
  achievement_type: string;
  earned_at: string;
}

const TradingBadges = ({ trades, currentStreak, longestStreak }: TradingBadgesProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    fetchAchievements();
  }, [trades.length]);

  const fetchAchievements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });

    if (data) {
      setAchievements(data);
    }
  };

  const badges = [];

  // Streak Badges
  if (currentStreak && currentStreak >= 7) {
    badges.push({
      id: 'week-warrior',
      icon: '🔥',
      title: 'Week Warrior',
      description: `${currentStreak} day trading streak!`,
      color: 'text-orange-500',
    });
  } else if (currentStreak && currentStreak >= 3) {
    badges.push({
      id: 'momentum-builder',
      icon: '⚡',
      title: 'Momentum Builder',
      description: `${currentStreak} day streak - keep going!`,
      color: 'text-yellow-500',
    });
  }

  if (longestStreak && longestStreak >= 14) {
    badges.push({
      id: 'consistency-champion',
      icon: '🏅',
      title: 'Consistency Champion',
      description: `Longest streak: ${longestStreak} days`,
      color: 'text-primary',
    });
  }

  // Add achievements from database
  achievements.forEach(achievement => {
    const achievementIcons: { [key: string]: string } = {
      'First Trade': '🎯',
      '10 Trades': '📊',
      '50 Trades': '💪',
      '100 Trades': '🏆',
      '70% Win Rate': '⭐',
      '80% Win Rate': '🌟',
      '7 Day Check-In Streak': '❤️',
      '7 Day Routine Streak': '✅',
    };

    badges.push({
      id: achievement.id,
      icon: achievementIcons[achievement.achievement_name] || '🎖️',
      title: achievement.achievement_name,
      description: `Earned ${new Date(achievement.earned_at).toLocaleDateString()}`,
      color: achievement.achievement_type === 'performance' ? 'text-green-500' : 
             achievement.achievement_type === 'streak' ? 'text-blue-500' : 'text-primary',
    });
  });

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
