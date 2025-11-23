import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Target, Award, TrendingUp } from "lucide-react";

interface PartnerAchievementTrackerProps {
  achievements: any[];
  streaks: any[];
  userStats: {
    totalCompleted: number;
    totalGoals: number;
    completionRate: string;
  };
}

export default function PartnerAchievementTracker({
  achievements,
  streaks,
  userStats,
}: PartnerAchievementTrackerProps) {
  const getAchievementIcon = (type: string) => {
    const icons: Record<string, any> = {
      perfect_week: Trophy,
      consistency: Award,
      streak_milestone: Flame,
      goal_master: Target,
    };
    return icons[type] || Award;
  };

  const getAchievementTitle = (type: string) => {
    const titles: Record<string, string> = {
      perfect_week: "Perfect Week",
      consistency: "Consistency Champion",
      streak_milestone: "Streak Master",
      goal_master: "Goal Crusher",
    };
    return titles[type] || type;
  };

  const checkInStreak = streaks.find(s => s.streak_type === 'check_in');
  const goalStreak = streaks.find(s => s.streak_type === 'goal_completion');

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-3xl font-bold">{userStats.completionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <Progress value={parseFloat(userStats.completionRate)} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-3xl font-bold">{checkInStreak?.current_streak || 0} days</p>
              </div>
              <Flame className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Best: {checkInStreak?.longest_streak || 0} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Goals Completed</p>
                <p className="text-3xl font-bold">{userStats.totalCompleted}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              of {userStats.totalGoals} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Recent Achievements
          </CardTitle>
          <CardDescription>
            Your latest milestones and accomplishments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Complete goals and maintain streaks to earn achievements!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.slice(0, 6).map((achievement) => {
                const Icon = getAchievementIcon(achievement.achievement_type);
                return (
                  <div
                    key={achievement.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="p-2 rounded-full bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {getAchievementTitle(achievement.achievement_type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Earned {new Date(achievement.earned_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      +10 XP
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Streak Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            Active Streaks
          </CardTitle>
          <CardDescription>
            Keep your momentum going!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {streaks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Start checking in daily to build your streak!
              </p>
            ) : (
              streaks.map((streak) => (
                <div key={streak.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium capitalize">
                      {streak.streak_type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Last activity: {new Date(streak.last_activity_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{streak.current_streak}</p>
                    <p className="text-xs text-muted-foreground">
                      Best: {streak.longest_streak}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}