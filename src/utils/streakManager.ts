import { supabase } from "@/integrations/supabase/client";

export interface StreakData {
  id: string;
  user_id: string;
  streak_type: string;
  current_count: number;
  best_count: number;
  last_updated: string;
}

/**
 * Updates or creates a streak for a user
 */
export async function updateStreak(
  userId: string,
  streakType: 'daily_checkin' | 'routine_completion' | 'trade_journal'
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get existing streak
    const { data: existingStreak } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('streak_type', streakType)
      .maybeSingle();

    if (existingStreak) {
      const lastUpdated = existingStreak.last_updated;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newCount = existingStreak.current_count;

      // Check if last update was today (do nothing)
      if (lastUpdated === today) {
        return;
      }
      // Check if last update was yesterday (increment)
      else if (lastUpdated === yesterdayStr) {
        newCount = existingStreak.current_count + 1;
      }
      // Otherwise reset to 1
      else {
        newCount = 1;
      }

      const newBest = Math.max(existingStreak.best_count, newCount);

      await supabase
        .from('streaks')
        .update({
          current_count: newCount,
          best_count: newBest,
          last_updated: today
        })
        .eq('id', existingStreak.id);
    } else {
      // Create new streak
      await supabase
        .from('streaks')
        .insert({
          user_id: userId,
          streak_type: streakType,
          current_count: 1,
          best_count: 1,
          last_updated: today
        });
    }
  } catch (error) {
    console.error('Error updating streak:', error);
  }
}

/**
 * Awards an achievement to a user
 */
export async function awardAchievement(
  userId: string,
  achievementName: string,
  achievementType: string
): Promise<void> {
  try {
    // Check if achievement already exists
    const { data: existing } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_name', achievementName)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from('achievements')
        .insert({
          user_id: userId,
          achievement_name: achievementName,
          achievement_type: achievementType
        });
    }
  } catch (error) {
    console.error('Error awarding achievement:', error);
  }
}

/**
 * Checks and awards trade-based achievements
 */
export async function checkTradeAchievements(userId: string): Promise<void> {
  try {
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId);

    if (!trades) return;

    const totalTrades = trades.length;
    const wins = trades.filter(t => t.result === 'win').length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    // First Trade
    if (totalTrades >= 1) {
      await awardAchievement(userId, 'First Trade', 'milestone');
    }

    // 10 Trades
    if (totalTrades >= 10) {
      await awardAchievement(userId, '10 Trades', 'milestone');
    }

    // 50 Trades
    if (totalTrades >= 50) {
      await awardAchievement(userId, '50 Trades', 'milestone');
    }

    // 100 Trades
    if (totalTrades >= 100) {
      await awardAchievement(userId, '100 Trades', 'milestone');
    }

    // High Win Rate (70%+)
    if (totalTrades >= 20 && winRate >= 70) {
      await awardAchievement(userId, '70% Win Rate', 'performance');
    }

    // Consistent Performer (80%+)
    if (totalTrades >= 30 && winRate >= 80) {
      await awardAchievement(userId, '80% Win Rate', 'performance');
    }
  } catch (error) {
    console.error('Error checking trade achievements:', error);
  }
}
