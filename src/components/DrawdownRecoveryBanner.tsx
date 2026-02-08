import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, 
  TrendingUp, 
  Shield, 
  X, 
  Eye, 
  EyeOff,
  CheckCircle2,
  Target,
  Flame
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface DrawdownRecoveryBannerProps {
  userId: string;
  trades: any[];
  onExitRecovery?: () => void;
  onHidePnLChange?: (hidden: boolean) => void;
  hidePnL?: boolean;
}

interface RecoveryStats {
  consecutiveLosses: number;
  drawdownPercent: number;
  processWins: {
    stopLossFollowed: number;
    stopLossTotal: number;
    checkinStreak: number;
  };
  positivePatterns: string[];
  isInRecovery: boolean;
}

export const DrawdownRecoveryBanner = ({ 
  userId, 
  trades, 
  onExitRecovery,
  onHidePnLChange,
  hidePnL: externalHidePnL
}: DrawdownRecoveryBannerProps) => {
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [internalHidePnL, setInternalHidePnL] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  // Use external state if provided, otherwise use internal state
  const hidePnL = externalHidePnL !== undefined ? externalHidePnL : internalHidePnL;
  
  const handleHidePnLToggle = () => {
    const newValue = !hidePnL;
    setInternalHidePnL(newValue);
    onHidePnLChange?.(newValue);
  };

  useEffect(() => {
    calculateRecoveryStats();
  }, [trades, userId]);

  const calculateRecoveryStats = async () => {
    if (!trades || trades.length === 0) {
      setStats(null);
      return;
    }

    // Calculate consecutive losses
    let consecutiveLosses = 0;
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    for (const trade of sortedTrades) {
      if (trade.result === "loss") {
        consecutiveLosses++;
      } else if (trade.result === "win") {
        break;
      }
    }

    // Calculate 7-day drawdown
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTrades = trades.filter(
      t => new Date(t.created_at) >= sevenDaysAgo
    );
    
    let totalPnL = 0;
    let peakEquity = 0;
    let maxDrawdown = 0;
    
    for (const trade of recentTrades) {
      totalPnL += trade.profit_loss || 0;
      peakEquity = Math.max(peakEquity, totalPnL);
      const drawdown = peakEquity - totalPnL;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    const drawdownPercent = peakEquity > 0 ? (maxDrawdown / peakEquity) * 100 : 0;

    // Check if in recovery mode (3+ consecutive losses OR >5% drawdown)
    const isInRecovery = consecutiveLosses >= 3 || drawdownPercent > 5;

    // Calculate process wins
    const tradesWithSL = trades.filter(t => t.stop_loss);
    const slFollowed = tradesWithSL.filter(t => {
      if (t.result === "loss" && t.exit_price && t.stop_loss) {
        return Math.abs(t.exit_price - t.stop_loss) < (t.stop_loss * 0.01);
      }
      return true;
    }).length;

    // Get check-in streak
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_streak")
      .eq("id", userId)
      .single();

    // Find positive patterns
    const positivePatterns: string[] = [];
    
    // Best performing session
    const sessionPerformance: Record<string, { wins: number; total: number }> = {};
    trades.forEach(t => {
      const hour = new Date(t.created_at).getHours();
      let session = "night";
      if (hour >= 8 && hour < 12) session = "morning";
      else if (hour >= 12 && hour < 16) session = "afternoon";
      else if (hour >= 16 && hour < 20) session = "evening";
      
      if (!sessionPerformance[session]) {
        sessionPerformance[session] = { wins: 0, total: 0 };
      }
      sessionPerformance[session].total++;
      if (t.result === "win") sessionPerformance[session].wins++;
    });

    let bestSession = "";
    let bestWinRate = 0;
    Object.entries(sessionPerformance).forEach(([session, { wins, total }]) => {
      const winRate = total > 0 ? (wins / total) * 100 : 0;
      if (winRate > bestWinRate && total >= 3) {
        bestWinRate = winRate;
        bestSession = session;
      }
    });
    
    if (bestSession && bestWinRate >= 50) {
      positivePatterns.push(`${bestSession.charAt(0).toUpperCase() + bestSession.slice(1)} trades: ${bestWinRate.toFixed(0)}% win rate`);
    }

    // Best pair
    const pairPerformance: Record<string, { wins: number; total: number }> = {};
    trades.forEach(t => {
      if (!pairPerformance[t.pair]) {
        pairPerformance[t.pair] = { wins: 0, total: 0 };
      }
      pairPerformance[t.pair].total++;
      if (t.result === "win") pairPerformance[t.pair].wins++;
    });

    let bestPair = "";
    let bestPairWinRate = 0;
    Object.entries(pairPerformance).forEach(([pair, { wins, total }]) => {
      const winRate = total > 0 ? (wins / total) * 100 : 0;
      if (winRate > bestPairWinRate && total >= 3) {
        bestPairWinRate = winRate;
        bestPair = pair;
      }
    });

    if (bestPair && bestPairWinRate >= 50) {
      positivePatterns.push(`${bestPair}: ${bestPairWinRate.toFixed(0)}% win rate`);
    }

    setStats({
      consecutiveLosses,
      drawdownPercent,
      processWins: {
        stopLossFollowed: slFollowed,
        stopLossTotal: tradesWithSL.length,
        checkinStreak: profile?.current_streak || 0
      },
      positivePatterns,
      isInRecovery
    });
  };

  const handleExitRecovery = async () => {
    await supabase
      .from("profiles")
      .update({ 
        is_in_recovery_mode: false,
        recovery_mode_started_at: null
      })
      .eq("id", userId);
    
    setDismissed(true);
    onExitRecovery?.();
  };

  if (!stats?.isInRecovery || dismissed) return null;

  const slPercentage = stats.processWins.stopLossTotal > 0 
    ? (stats.processWins.stopLossFollowed / stats.processWins.stopLossTotal) * 100 
    : 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6"
      >
        <Card className="p-6 border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-orange-500/10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/20">
                <Heart className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  Recovery Mode
                  <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                    Active
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Focus on process, not P/L. Every trader goes through this.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleExitRecovery}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Process Wins */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Process Wins
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Stop Loss Discipline</span>
                  <span>{slPercentage.toFixed(0)}%</span>
                </div>
                <Progress value={slPercentage} className="h-2" />
              </div>
              {stats.processWins.checkinStreak > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Flame className="h-3 w-3 text-orange-500" />
                  {stats.processWins.checkinStreak} day check-in streak
                </div>
              )}
            </div>

            {/* Positive Patterns */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Your Strengths
              </div>
              {stats.positivePatterns.length > 0 ? (
                <ul className="space-y-1">
                  {stats.positivePatterns.map((pattern, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {pattern}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Keep trading to discover patterns
                </p>
              )}
            </div>

            {/* Focus Metrics */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4 text-purple-500" />
                Recovery Goals
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Trade your best setups only
                </li>
                <li className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Reduce position size by 50%
                </li>
                <li className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Complete daily check-in
                </li>
              </ul>
            </div>
          </div>

          {/* P/L Toggle */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleHidePnLToggle}
                className="text-xs"
              >
                {hidePnL ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    P/L Hidden
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    P/L Visible
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                Hiding P/L reduces emotional trading
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExitRecovery}
              className="text-xs"
            >
              Exit Recovery Mode
            </Button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
