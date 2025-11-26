// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export interface RiskCheckResult {
  hasWarnings: boolean;
  warnings: string[];
  riskScore: number;
}

export async function performLocalRiskCheck(userId: string, tradeData: any): Promise<RiskCheckResult> {
  const result: RiskCheckResult = { hasWarnings: false, warnings: [], riskScore: 0 };

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentPairTrades } = await supabase
      .from("trades")
      .select("result")
      .eq("user_id", userId)
      .eq("pair", tradeData.pair)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    if (recentPairTrades && recentPairTrades.length >= 5) {
      const recentLosses = recentPairTrades.slice(0, 5).filter(t => t.result === 'loss').length;
      if (recentLosses >= 3) {
        result.hasWarnings = true;
        result.warnings.push(`⚠️ You've lost ${recentLosses} of your last 5 trades on ${tradeData.pair}`);
        result.riskScore += 30;
      }

      const wins = recentPairTrades.filter(t => t.result === 'win').length;
      const winRate = (wins / recentPairTrades.length) * 100;
      if (winRate < 40) {
        result.hasWarnings = true;
        result.warnings.push(`📊 Your win rate on ${tradeData.pair} is ${winRate.toFixed(0)}% (below 40%)`);
        result.riskScore += 25;
      }
    }

    const { data: recentAllTrades } = await supabase
      .from("trades")
      .select("result")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentAllTrades && recentAllTrades.length >= 3) {
      let currentStreak = 0;
      for (const trade of recentAllTrades) {
        if (trade.result === 'loss') currentStreak++;
        else break;
      }
      if (currentStreak >= 3) {
        result.hasWarnings = true;
        result.warnings.push(`🔴 You're on a ${currentStreak}-trade losing streak`);
        result.riskScore += 20;
      }
    }

    result.riskScore = Math.min(result.riskScore, 100);
  } catch (error) {
    console.error("Error in local risk check:", error);
  }

  return result;
}
