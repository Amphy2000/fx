import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Target, Award, Zap } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";

interface Milestone {
  title: string;
  description: string;
  icon: any;
  color: string;
}

interface MilestoneNotificationProps {
  trades: any[];
  userId: string;
}

export function MilestoneNotification({ trades, userId }: MilestoneNotificationProps) {
  const [open, setOpen] = useState(false);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [checkedMilestones, setCheckedMilestones] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load achieved milestones from database on mount
  useEffect(() => {
    const loadAchievements = async () => {
      const { data } = await supabase
        .from('achievements')
        .select('achievement_name')
        .eq('user_id', userId)
        .eq('achievement_type', 'milestone');
      
      if (data) {
        setCheckedMilestones(new Set(data.map(a => a.achievement_name)));
      }
      setLoading(false);
    };
    
    loadAchievements();
  }, [userId]);

  useEffect(() => {
    if (trades.length === 0 || loading) return;

    const totalTrades = trades.length;
    const wins = trades.filter(t => t.result === "win").length;
    const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const winRate = (wins / totalTrades) * 100;

    const milestones: Record<string, Milestone> = {
      "first_trade": {
        title: "First Trade Logged!",
        description: "You've started your trading journey. Every expert was once a beginner.",
        icon: Zap,
        color: "text-blue-500",
      },
      "10_trades": {
        title: "10 Trades Milestone!",
        description: "You're building momentum! Keep analyzing and learning from each trade.",
        icon: Target,
        color: "text-purple-500",
      },
      "50_trades": {
        title: "50 Trades Achievement!",
        description: "Impressive dedication! Your data is now rich enough for deep insights.",
        icon: Award,
        color: "text-amber-500",
      },
      "100_trades": {
        title: "Century of Trades!",
        description: "100 trades completed! You're developing serious trading experience.",
        icon: Trophy,
        color: "text-green-500",
      },
      "profitable": {
        title: "Overall Profitability!",
        description: `Amazing! You're up $${totalPnL.toFixed(2)}. Keep maintaining this edge!`,
        icon: TrendingUp,
        color: "text-green-500",
      },
      "60_wr": {
        title: "60% Win Rate!",
        description: `Outstanding! ${winRate.toFixed(1)}% win rate shows strong edge in the market.`,
        icon: Trophy,
        color: "text-gold-500",
      },
    };

    // Check milestones
    if (totalTrades === 1 && !checkedMilestones.has("first_trade")) {
      showMilestone(milestones["first_trade"], "first_trade");
    } else if (totalTrades === 10 && !checkedMilestones.has("10_trades")) {
      showMilestone(milestones["10_trades"], "10_trades");
    } else if (totalTrades === 50 && !checkedMilestones.has("50_trades")) {
      showMilestone(milestones["50_trades"], "50_trades");
    } else if (totalTrades === 100 && !checkedMilestones.has("100_trades")) {
      showMilestone(milestones["100_trades"], "100_trades");
    } else if (totalPnL > 0 && !checkedMilestones.has("profitable")) {
      showMilestone(milestones["profitable"], "profitable");
    } else if (winRate >= 60 && !checkedMilestones.has("60_wr")) {
      showMilestone(milestones["60_wr"], "60_wr");
    }
  }, [trades]);

  const showMilestone = async (ms: Milestone, key: string) => {
    // Save to database
    await supabase.from('achievements').insert({
      user_id: userId,
      achievement_type: 'milestone',
      achievement_name: key
    });
    
    setMilestone(ms);
    setCheckedMilestones(prev => new Set([...prev, key]));
    setOpen(true);
    
    // Confetti celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  if (!milestone) return null;

  const Icon = milestone.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Icon className={`h-12 w-12 ${milestone.color}`} />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center">{milestone.title}</DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {milestone.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Button onClick={() => setOpen(false)} size="lg" className="w-full">
            Keep Trading! 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
