import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  Trophy,
  ArrowRight,
  Clock
} from "lucide-react";

interface RecoveryRoadmapProps {
  accountSize: number;
  currentBalance: number;
  maxDailyDrawdown: number;
  maxTotalDrawdown: number;
  riskPerTrade: number;
}

interface RecoveryPlan {
  daysToRecover: number;
  tradesPerDay: number;
  riskPerTrade: number;
  winRateNeeded: number;
  avgRRNeeded: number;
}

export const RecoveryRoadmap = ({
  accountSize,
  currentBalance,
  maxDailyDrawdown,
  maxTotalDrawdown,
  riskPerTrade,
}: RecoveryRoadmapProps) => {
  const calculations = useMemo(() => {
    const drawdownAmount = accountSize - currentBalance;
    const drawdownPercent = (drawdownAmount / accountSize) * 100;
    const isInDrawdown = drawdownAmount > 0;

    const totalDrawdownLimit = accountSize * (maxTotalDrawdown / 100);
    const remainingBuffer = totalDrawdownLimit - drawdownAmount;
    const bufferPercent = (remainingBuffer / totalDrawdownLimit) * 100;

    // Calculate recovery scenarios
    const safeRiskPercent = Math.min(riskPerTrade, 0.5); // Max 0.5% in recovery
    const riskAmount = currentBalance * (safeRiskPercent / 100);
    
    // Calculate how many winning trades needed at different RR ratios
    const calculateRecoveryTrades = (rrRatio: number): number => {
      const profitPerWin = riskAmount * rrRatio;
      return Math.ceil(drawdownAmount / profitPerWin);
    };

    // Different recovery strategies
    const conservativePlan: RecoveryPlan = {
      daysToRecover: Math.ceil(calculateRecoveryTrades(1.5) / 2),
      tradesPerDay: 2,
      riskPerTrade: 0.25,
      winRateNeeded: 55,
      avgRRNeeded: 1.5,
    };

    const moderatePlan: RecoveryPlan = {
      daysToRecover: Math.ceil(calculateRecoveryTrades(2) / 3),
      tradesPerDay: 3,
      riskPerTrade: 0.5,
      winRateNeeded: 50,
      avgRRNeeded: 2,
    };

    const aggressivePlan: RecoveryPlan = {
      daysToRecover: Math.ceil(calculateRecoveryTrades(2.5) / 4),
      tradesPerDay: 4,
      riskPerTrade: 0.75,
      winRateNeeded: 45,
      avgRRNeeded: 2.5,
    };

    // Daily milestones
    const dailyRecoveryTarget = drawdownAmount / Math.max(conservativePlan.daysToRecover, 1);
    const milestones = [];
    let runningBalance = currentBalance;
    for (let day = 1; day <= conservativePlan.daysToRecover && day <= 14; day++) {
      runningBalance += dailyRecoveryTarget;
      milestones.push({
        day,
        targetBalance: runningBalance,
        percentRecovered: ((runningBalance - currentBalance) / drawdownAmount) * 100,
        dailyGain: dailyRecoveryTarget,
      });
    }

    // Risk status
    const riskStatus = bufferPercent > 50 ? 'safe' : bufferPercent > 25 ? 'caution' : 'danger';

    return {
      isInDrawdown,
      drawdownAmount,
      drawdownPercent,
      remainingBuffer,
      bufferPercent,
      conservativePlan,
      moderatePlan,
      aggressivePlan,
      milestones,
      dailyRecoveryTarget,
      riskStatus,
      safeRiskPercent,
    };
  }, [accountSize, currentBalance, maxDailyDrawdown, maxTotalDrawdown, riskPerTrade]);

  if (!calculations.isInDrawdown) {
    return (
      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 rounded-[32px] overflow-hidden">
        <CardContent className="p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <Trophy className="h-10 w-10 text-green-400" />
          </div>
          <h2 className="text-3xl font-black text-green-400 mb-3">Account Healthy!</h2>
          <p className="text-white/60 max-w-md mx-auto">
            You're at or above your starting balance. No recovery needed. Keep protecting your gains!
          </p>
          <div className="grid grid-cols-2 gap-4 mt-8 max-w-sm mx-auto">
            <div className="p-4 bg-green-500/10 rounded-xl">
              <p className="text-2xl font-black text-green-400">
                ${(currentBalance - accountSize).toFixed(0)}
              </p>
              <p className="text-[10px] font-bold text-green-400/60 uppercase">Profit</p>
            </div>
            <div className="p-4 bg-green-500/10 rounded-xl">
              <p className="text-2xl font-black text-green-400">
                {((currentBalance - accountSize) / accountSize * 100).toFixed(1)}%
              </p>
              <p className="text-[10px] font-bold text-green-400/60 uppercase">Growth</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recovery Header */}
      <Card className="bg-gradient-to-br from-slate-900 to-red-950/30 border-none rounded-[32px] overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Target className="h-48 w-48 text-white" />
        </div>
        <CardContent className="p-8 relative z-10">
          <Badge className="bg-red-500/20 text-red-400 border-red-500/20 mb-4">
            RECOVERY MODE ACTIVE
          </Badge>
          <h2 className="text-4xl font-black text-white mb-2">
            ${calculations.drawdownAmount.toFixed(0)} to Recover
          </h2>
          <p className="text-white/40 mb-6">
            You're {calculations.drawdownPercent.toFixed(2)}% below starting balance
          </p>

          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-white/5 rounded-2xl text-center">
              <p className="text-2xl font-black text-red-400">-${calculations.drawdownAmount.toFixed(0)}</p>
              <p className="text-[10px] font-bold text-white/40 uppercase mt-1">Current Gap</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl text-center">
              <p className="text-2xl font-black text-amber-400">${calculations.remainingBuffer.toFixed(0)}</p>
              <p className="text-[10px] font-bold text-white/40 uppercase mt-1">Buffer Left</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl text-center">
              <p className="text-2xl font-black text-white">{calculations.safeRiskPercent}%</p>
              <p className="text-[10px] font-bold text-white/40 uppercase mt-1">Safe Risk</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl text-center">
              <p className="text-2xl font-black text-primary">${calculations.dailyRecoveryTarget.toFixed(0)}</p>
              <p className="text-[10px] font-bold text-white/40 uppercase mt-1">Daily Target</p>
            </div>
          </div>

          {/* Buffer Progress */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Drawdown Buffer Used</span>
              <span className={`font-bold ${
                calculations.riskStatus === 'safe' ? 'text-green-400' :
                calculations.riskStatus === 'caution' ? 'text-amber-400' : 'text-red-400'
              }`}>
                {(100 - calculations.bufferPercent).toFixed(1)}%
              </span>
            </div>
            <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`absolute left-0 top-0 h-full transition-all duration-500 ${
                  calculations.riskStatus === 'safe' ? 'bg-green-500' :
                  calculations.riskStatus === 'caution' ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${100 - calculations.bufferPercent}%` }}
              />
              <div className="absolute left-[75%] top-0 h-full w-0.5 bg-amber-500/50" />
              <div className="absolute left-[90%] top-0 h-full w-0.5 bg-red-500/50" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Plans Comparison */}
      <Card className="bg-slate-900 border-none rounded-2xl">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Recovery Strategies
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { plan: calculations.conservativePlan, name: "Conservative", icon: Shield, color: "green" },
              { plan: calculations.moderatePlan, name: "Moderate", icon: Target, color: "primary" },
              { plan: calculations.aggressivePlan, name: "Aggressive", icon: Flame, color: "orange" },
            ].map(({ plan, name, icon: Icon, color }) => (
              <Card 
                key={name}
                className={`p-4 border-none rounded-xl ${
                  name === "Conservative" 
                    ? 'bg-green-500/10 ring-2 ring-green-500/20' 
                    : 'bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`h-4 w-4 ${
                    color === 'green' ? 'text-green-400' :
                    color === 'primary' ? 'text-primary' : 'text-orange-400'
                  }`} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    color === 'green' ? 'text-green-400' :
                    color === 'primary' ? 'text-primary' : 'text-orange-400'
                  }`}>
                    {name}
                  </span>
                  {name === "Conservative" && (
                    <Badge className="bg-green-500/20 text-green-400 border-none text-[8px] ml-auto">
                      RECOMMENDED
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-white/40">Days to recover</span>
                    <span className="text-sm font-bold text-white">{plan.daysToRecover} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-white/40">Trades/day</span>
                    <span className="text-sm font-bold text-white">{plan.tradesPerDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-white/40">Risk/trade</span>
                    <span className="text-sm font-bold text-white">{plan.riskPerTrade}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-white/40">Win rate needed</span>
                    <span className="text-sm font-bold text-white">{plan.winRateNeeded}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-white/40">Avg RR</span>
                    <span className="text-sm font-bold text-white">1:{plan.avgRRNeeded}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Milestones */}
      <Card className="bg-slate-900 border-none rounded-2xl">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Daily Recovery Milestones
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {calculations.milestones.slice(0, 7).map((milestone, index) => (
              <div 
                key={milestone.day}
                className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">D{milestone.day}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">
                      Target: ${milestone.targetBalance.toFixed(0)}
                    </span>
                    <span className="text-xs text-green-400">
                      +${milestone.dailyGain.toFixed(0)}/day
                    </span>
                  </div>
                  <Progress value={milestone.percentRecovered} className="h-1.5" />
                </div>
                <Badge className="bg-white/10 text-white/60 border-none text-[10px]">
                  {milestone.percentRecovered.toFixed(0)}%
                </Badge>
              </div>
            ))}
          </div>

          {calculations.milestones.length > 7 && (
            <p className="text-center text-[10px] text-white/30 mt-4">
              +{calculations.milestones.length - 7} more days to full recovery
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recovery Rules */}
      <Alert className="bg-amber-500/10 border-amber-500/20 rounded-xl">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <AlertDescription className="text-amber-400/80">
          <p className="font-bold text-amber-400 mb-2">Recovery Protocol Rules</p>
          <ul className="space-y-1 text-sm">
            <li>• Maximum {calculations.safeRiskPercent}% risk per trade (non-negotiable)</li>
            <li>• Only take A+ setups - no revenge or FOMO trades</li>
            <li>• Complete mental check-in before each session</li>
            <li>• Stop trading after 2 consecutive losses</li>
            <li>• Minimum 1:1.5 risk-reward on all trades</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};
