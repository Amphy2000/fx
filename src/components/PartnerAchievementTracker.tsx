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
        <Card className="bg-gradient-to-br from-primary/5 via-background to-background border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {userStats.completionRate}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10 backdrop-blur-sm">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </div>
            <Progress value={parseFloat(userStats.completionRate)} className="mt-4 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/5 via-background to-background border-orange-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                  {checkInStreak?.current_streak || 0} days
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-500/10 backdrop-blur-sm">
                <Flame className="h-8 w-8 text-orange-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Best: <span className="font-semibold">{checkInStreak?.longest_streak || 0}</span> days
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/5 via-background to-background border-green-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Goals Completed</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                  {userStats.totalCompleted}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10 backdrop-blur-sm">
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              of <span className="font-semibold">{userStats.totalGoals}</span> total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card className="shadow-lg border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-amber-500/20">
              <Trophy className="h-5 w-5 text-yellow-600" />
            </div>
            Recent Achievements
          </CardTitle>
          <CardDescription>
            Your latest milestones and accomplishments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Complete goals and maintain streaks to earn achievements!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.slice(0, 6).map((achievement) => {
                const Icon = getAchievementIcon(achievement.achievement_type);
                return (
                  <div
                    key={achievement.id}
                    className="group flex items-start gap-3 p-4 rounded-xl border bg-gradient-to-br from-card to-muted/20 hover:shadow-md hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="p-2.5 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">
                        {getAchievementTitle(achievement.achievement_type)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Earned {new Date(achievement.earned_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs font-semibold bg-gradient-to-r from-primary/10 to-primary/5">
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
      <Card className="shadow-lg border-orange-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20">
              <Flame className="h-5 w-5 text-orange-600" />
            </div>
            Active Streaks
          </CardTitle>
          <CardDescription>
            Keep your momentum going!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {streaks.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Flame className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Start checking in daily to build your streak!
                </p>
              </div>
            ) : (
              streaks.map((streak) => (
                <div 
                  key={streak.id} 
                  className="flex items-center justify-between p-4 rounded-xl border bg-gradient-to-br from-card to-orange-500/5 hover:shadow-md hover:border-orange-500/30 transition-all duration-300"
                >
                  <div>
                    <p className="font-semibold capitalize">
                      {streak.streak_type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Last activity: {new Date(streak.last_activity_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                      {streak.current_streak}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Best: <span className="font-semibold">{streak.longest_streak}</span>
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
