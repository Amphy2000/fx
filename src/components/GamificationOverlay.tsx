import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StreakCelebration } from "./StreakCelebration";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, TrendingUp, Zap } from "lucide-react";

interface Achievement {
  id: string;
  type: string;
  message: string;
  icon: any;
}

export const GamificationOverlay = () => {
  const [celebration, setCelebration] = useState<any>(null);
  const [floatingAchievements, setFloatingAchievements] = useState<Achievement[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    // Listen for achievement events
    const channel = supabase
      .channel('achievements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'achievements',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          const achievement = payload.new as any;
          addFloatingAchievement(achievement);
        }
      )
      .subscribe();

    // Check for streaks
    checkStreaks();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  const checkStreaks = async () => {
    if (!user) return;

    const { data: streaks } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id);

    if (streaks) {
      const dailyStreak = streaks.find(s => s.streak_type === 'daily_trading');
      const weeklyStreak = streaks.find(s => s.streak_type === 'weekly_review');

      if (dailyStreak && dailyStreak.current_count > 0 && dailyStreak.current_count % 7 === 0) {
        setCelebration({
          streakCount: dailyStreak.current_count,
          type: "daily",
          message: `You're on fire! ${dailyStreak.current_count} days of consistent trading!`
        });
      }
    }
  };

  const addFloatingAchievement = (achievement: any) => {
    const icons = {
      'first_trade': Trophy,
      'win_streak': TrendingUp,
      'profit_milestone': Target,
      'consistency': Zap
    };

    const newAchievement = {
      id: achievement.id,
      type: achievement.achievement_type,
      message: achievement.achievement_name,
      icon: icons[achievement.achievement_type as keyof typeof icons] || Trophy
    };

    setFloatingAchievements(prev => [...prev, newAchievement]);

    // Remove after 5 seconds
    setTimeout(() => {
      setFloatingAchievements(prev => prev.filter(a => a.id !== newAchievement.id));
    }, 5000);
  };

  return (
    <>
      {celebration && (
        <StreakCelebration
          {...celebration}
          onClose={() => setCelebration(null)}
        />
      )}

      <div className="fixed top-24 right-8 z-50 space-y-2">
        <AnimatePresence>
          {floatingAchievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ delay: index * 0.1 }}
            >
              <Badge
                variant="default"
                className="p-4 text-base bg-gradient-to-r from-primary to-purple-600 shadow-lg"
              >
                <achievement.icon className="h-5 w-5 mr-2" />
                {achievement.message}
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};