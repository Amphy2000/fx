import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle2, Trophy, TrendingUp, Target, Flame, Heart, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'milestone' | 'performance' | 'streak';
  requirement: number;
  currentProgress: number;
  isUnlocked: boolean;
}
interface AchievementProgressTrackerProps {
  trades?: any[];
  compact?: boolean;
}
export default function AchievementProgressTracker({
  trades = [],
  compact = false
}: AchievementProgressTrackerProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<Set<string>>(new Set());
  const [streaks, setStreaks] = useState<any>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchData();
  }, [trades.length]);
  const fetchData = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch earned achievements
    const {
      data: earned
    } = await supabase.from('achievements').select('achievement_name').eq('user_id', user.id);
    const earnedSet = new Set(earned?.map(a => a.achievement_name) || []);
    setEarnedAchievements(earnedSet);

    // Fetch streaks
    const {
      data: streakData
    } = await supabase.from('streaks').select('*').eq('user_id', user.id);
    const streaksMap = streakData?.reduce((acc: any, s: any) => {
      acc[s.streak_type] = s;
      return acc;
    }, {}) || {};
    setStreaks(streaksMap);

    // Fetch all trades for calculations
    const {
      data: allTrades
    } = await supabase.from('trades').select('*').eq('user_id', user.id);
    calculateAchievements(allTrades || [], earnedSet, streaksMap);
    setLoading(false);
  };
  const calculateAchievements = (allTrades: any[], earned: Set<string>, streaksMap: any) => {
    const totalTrades = allTrades.length;
    const wins = allTrades.filter(t => t.result === 'win').length;
    const winRate = totalTrades > 0 ? wins / totalTrades * 100 : 0;
    
    // Count validation achievements
    const validationCount = Array.from(earned).filter(name => 
      name.includes('Validation')
    ).length;

    const achievementsList: Achievement[] = [
    // Milestone Achievements
    {
      id: 'first-trade',
      name: 'First Trade',
      description: 'Log your first trade',
      icon: '🎯',
      type: 'milestone',
      requirement: 1,
      currentProgress: Math.min(totalTrades, 1),
      isUnlocked: earned.has('First Trade') || totalTrades >= 1
    }, {
      id: '10-trades',
      name: '10 Trades',
      description: 'Complete 10 trades',
      icon: '📊',
      type: 'milestone',
      requirement: 10,
      currentProgress: Math.min(totalTrades, 10),
      isUnlocked: earned.has('10 Trades') || totalTrades >= 10
    }, {
      id: '50-trades',
      name: '50 Trades',
      description: 'Complete 50 trades',
      icon: '💪',
      type: 'milestone',
      requirement: 50,
      currentProgress: Math.min(totalTrades, 50),
      isUnlocked: earned.has('50 Trades') || totalTrades >= 50
    }, {
      id: '100-trades',
      name: '100 Trades',
      description: 'Complete 100 trades',
      icon: '🏆',
      type: 'milestone',
      requirement: 100,
      currentProgress: Math.min(totalTrades, 100),
      isUnlocked: earned.has('100 Trades') || totalTrades >= 100
    },
    // Performance Achievements
    {
      id: '70-winrate',
      name: '70% Win Rate',
      description: 'Maintain 70% win rate (20+ trades)',
      icon: '⭐',
      type: 'performance',
      requirement: 70,
      currentProgress: totalTrades >= 20 ? Math.min(winRate, 70) : winRate * (totalTrades / 20),
      isUnlocked: earned.has('70% Win Rate') || totalTrades >= 20 && winRate >= 70
    }, {
      id: '80-winrate',
      name: '80% Win Rate',
      description: 'Maintain 80% win rate (30+ trades)',
      icon: '🌟',
      type: 'performance',
      requirement: 80,
      currentProgress: totalTrades >= 30 ? Math.min(winRate, 80) : winRate * (totalTrades / 30),
      isUnlocked: earned.has('80% Win Rate') || totalTrades >= 30 && winRate >= 80
    },
    // Streak Achievements
    {
      id: '7-day-checkin',
      name: '7 Day Check-In',
      description: 'Complete 7 daily check-ins in a row',
      icon: '❤️',
      type: 'streak',
      requirement: 7,
      currentProgress: Math.min(streaksMap['daily_checkin']?.current_count || 0, 7),
      isUnlocked: earned.has('7 Day Check-In Streak') || streaksMap['daily_checkin']?.current_count >= 7
    }, {
      id: '7-day-routine',
      name: '7 Day Routine',
      description: 'Complete 7 daily routines in a row',
      icon: '✅',
      type: 'streak',
      requirement: 7,
      currentProgress: Math.min(streaksMap['routine_completion']?.current_count || 0, 7),
      isUnlocked: earned.has('7 Day Routine Streak') || streaksMap['routine_completion']?.current_count >= 7
    }, {
      id: '14-day-trading',
      name: '14 Day Trading',
      description: 'Trade for 14 consecutive days',
      icon: '🔥',
      type: 'streak',
      requirement: 14,
      currentProgress: Math.min(streaksMap['trade_journal']?.current_count || 0, 14),
      isUnlocked: streaksMap['trade_journal']?.current_count >= 14
    },
    // Validation Achievements
    {
      id: 'first_validation',
      name: 'Wise Trader',
      description: 'Use trade validator for the first time',
      icon: '🧠',
      type: 'milestone',
      requirement: 1,
      currentProgress: validationCount,
      isUnlocked: earned.has('First Validation')
    },
    {
      id: 'validation_10',
      name: 'Risk Manager',
      description: 'Validate 10 trades',
      icon: '🛡️',
      type: 'milestone',
      requirement: 10,
      currentProgress: validationCount,
      isUnlocked: earned.has('10 Validations')
    },
    {
      id: 'validation_50',
      name: 'Master Analyst',
      description: 'Validate 50 trades',
      icon: '🏆',
      type: 'milestone',
      requirement: 50,
      currentProgress: validationCount,
      isUnlocked: earned.has('50 Validations')
    }];
    setAchievements(achievementsList);
  };
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'milestone':
        return <Target className="h-4 w-4" />;
      case 'performance':
        return <TrendingUp className="h-4 w-4" />;
      case 'streak':
        return <Flame className="h-4 w-4" />;
      default:
        return <Trophy className="h-4 w-4" />;
    }
  };
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'text-blue-500';
      case 'performance':
        return 'text-green-500';
      case 'streak':
        return 'text-orange-500';
      default:
        return 'text-primary';
    }
  };
  if (loading) {
    return <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Achievement Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading achievements...</div>
        </CardContent>
      </Card>;
  }
  const unlockedCount = achievements.filter(a => a.isUnlocked).length;
  const totalCount = achievements.length;
  const overallProgress = unlockedCount / totalCount * 100;
  if (compact) {
    return <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-primary" />
              Achievements
            </CardTitle>
            <Badge variant="secondary">
              {unlockedCount}/{totalCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={overallProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(overallProgress)}% Complete
            </p>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="border-border/50">
      
      
    </Card>;
}