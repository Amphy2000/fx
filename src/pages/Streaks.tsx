import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Trophy, Award, Target, Calendar, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Streaks = () => {
  const navigate = useNavigate();
  const [streaks, setStreaks] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [disciplineScore, setDisciplineScore] = useState(0);

  useEffect(() => {
    checkAuth();
    fetchStreaks();
    fetchAchievements();
    calculateDisciplineScore();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchStreaks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", user.id);

    if (data) {
      setStreaks(data);
    }
  };

  const fetchAchievements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("achievements")
      .select("*")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false });

    if (data) {
      setAchievements(data);
    }
  };

  const calculateDisciplineScore = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get this week's check-ins
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data: checkIns } = await supabase
      .from("daily_checkins")
      .select("*")
      .eq("user_id", user.id)
      .gte("check_in_date", weekAgo.toISOString());

    const { data: routines } = await supabase
      .from("routine_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("entry_date", weekAgo.toISOString());

    const { data: trades } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", weekAgo.toISOString());

    let score = 0;
    
    // Check-ins (max 30 points)
    if (checkIns) score += Math.min(checkIns.length * 5, 30);
    
    // Routines (max 30 points)
    if (routines) {
      const completedRoutines = routines.filter(r => r.trading_rules_checked && r.pre_session_ready);
      score += Math.min(completedRoutines.length * 5, 30);
    }
    
    // Trade journaling (max 40 points)
    if (trades) {
      const journaledTrades = trades.filter(t => t.notes && t.emotion_before);
      score += Math.min(journaledTrades.length * 4, 40);
    }

    setDisciplineScore(Math.min(score, 100));
  };

  const getStreakIcon = (type: string) => {
    switch(type) {
      case "daily_checkin": return <Calendar className="w-6 h-6" />;
      case "routine_completion": return <Target className="w-6 h-6" />;
      case "trade_journal": return <TrendingUp className="w-6 h-6" />;
      default: return <Flame className="w-6 h-6" />;
    }
  };

  const getStreakName = (type: string) => {
    switch(type) {
      case "daily_checkin": return "Daily Check-In Streak";
      case "routine_completion": return "Routine Completion Streak";
      case "trade_journal": return "Trade Journal Streak";
      default: return type;
    }
  };

  const getBadgeColor = (name: string) => {
    if (name.includes("Week")) return "bg-blue-500/20 text-blue-500";
    if (name.includes("Month")) return "bg-purple-500/20 text-purple-500";
    if (name.includes("Legendary")) return "bg-yellow-500/20 text-yellow-500";
    return "bg-green-500/20 text-green-500";
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Consistency & Gamification</h1>
          <p className="text-muted-foreground">Track your discipline and earn achievements</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Discipline Score
              </CardTitle>
              <CardDescription>This week's performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-500">{disciplineScore}/100</div>
              <p className="text-sm text-muted-foreground mt-2">
                {disciplineScore >= 80 && "🔥 Excellent discipline!"}
                {disciplineScore >= 60 && disciplineScore < 80 && "👍 Good consistency"}
                {disciplineScore >= 40 && disciplineScore < 60 && "📈 Keep building"}
                {disciplineScore < 40 && "💪 Room for improvement"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-blue-500" />
                Achievements
              </CardTitle>
              <CardDescription>Total earned</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-500">{achievements.length}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Keep completing streaks to earn more!
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-green-500" />
                Active Streaks
              </CardTitle>
              <CardDescription>Currently maintaining</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-500">
                {streaks.filter(s => s.current_count > 0).length}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Don't break the chain!
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Streaks</CardTitle>
            <CardDescription>Maintain consistency to build momentum</CardDescription>
          </CardHeader>
          <CardContent>
            {streaks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Start building streaks by completing daily check-ins and routines!
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {streaks.map((streak) => (
                  <div key={streak.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                    <div className="text-primary">
                      {getStreakIcon(streak.streak_type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{getStreakName(streak.streak_type)}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-2xl font-bold text-primary">
                          {streak.current_count}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Best: {streak.best_count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Achievements
            </CardTitle>
            <CardDescription>Your earned badges and milestones</CardDescription>
          </CardHeader>
          <CardContent>
            {achievements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Complete challenges to earn your first achievement!
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-lg ${getBadgeColor(achievement.achievement_name)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{achievement.achievement_name}</h4>
                        <p className="text-xs opacity-75 mt-1">
                          {new Date(achievement.earned_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Award className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Streaks;
