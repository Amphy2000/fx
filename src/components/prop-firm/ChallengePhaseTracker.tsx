import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Trophy,
  Flame,
  ChevronRight,
  Zap,
  AlertCircle
} from "lucide-react";

interface ChallengePhaseTrackerProps {
  accountSize: number;
  currentBalance: number;
  profitTargetPercent: number;
  maxTotalDrawdown: number;
  onPhaseUpdate?: (phase: PhaseData) => void;
}

interface PhaseData {
  phase: 1 | 2 | "funded";
  startDate: Date;
  endDate: Date;
  profitTarget: number;
  currentProfit: number;
  daysRemaining: number;
  dailyTargetNeeded: number;
  onTrack: boolean;
}

const PHASE_CONFIGS = {
  phase1: { days: 30, profitTarget: 10, name: "Phase 1 - Evaluation" },
  phase2: { days: 60, profitTarget: 5, name: "Phase 2 - Verification" },
  funded: { days: Infinity, profitTarget: 0, name: "Funded Account" },
};

export const ChallengePhaseTracker = ({
  accountSize,
  currentBalance,
  profitTargetPercent,
  maxTotalDrawdown,
  onPhaseUpdate
}: ChallengePhaseTrackerProps) => {
  const [startDate, setStartDate] = useState<string>(() => {
    const saved = localStorage.getItem("propFirmChallengeStart");
    return saved || new Date().toISOString().split("T")[0];
  });
  const [currentPhase, setCurrentPhase] = useState<1 | 2 | "funded">(1);
  const [challengeDays, setChallengeDays] = useState(30);

  useEffect(() => {
    localStorage.setItem("propFirmChallengeStart", startDate);
  }, [startDate]);

  const profitTarget = accountSize * (profitTargetPercent / 100);
  const currentProfit = currentBalance - accountSize;
  const profitProgress = Math.max(0, Math.min(100, (currentProfit / profitTarget) * 100));
  
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + challengeDays);
  const now = new Date();
  
  const totalDays = challengeDays;
  const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const timeProgress = Math.min(100, (daysElapsed / totalDays) * 100);
  
  const remainingProfit = Math.max(0, profitTarget - currentProfit);
  const dailyTargetNeeded = daysRemaining > 0 ? remainingProfit / daysRemaining : 0;
  
  const expectedProgress = timeProgress;
  const onTrack = profitProgress >= expectedProgress * 0.8;
  
  const breachLevel = accountSize - (accountSize * (maxTotalDrawdown / 100));
  const safetyBuffer = currentBalance - breachLevel;
  const safetyProgress = Math.max(0, Math.min(100, 100 - ((accountSize - currentBalance) / (accountSize * maxTotalDrawdown / 100)) * 100));

  const getStatusColor = () => {
    if (profitProgress >= 100) return "text-green-500";
    if (onTrack) return "text-primary";
    if (daysRemaining < 7) return "text-destructive";
    return "text-amber-500";
  };

  const getStatusMessage = () => {
    if (profitProgress >= 100) return "🎉 Target Reached! Ready for next phase";
    if (currentBalance <= breachLevel) return "⚠️ Account Breached";
    if (onTrack) return "✓ On track to pass";
    if (daysRemaining < 7 && profitProgress < 80) return "⚡ Aggressive strategy needed";
    return "📊 Slightly behind schedule";
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-primary/10 border-none rounded-3xl overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 rounded-xl">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-white text-lg font-bold">
                Challenge Tracker
              </CardTitle>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-0.5">
                Phase {currentPhase} Progress
              </p>
            </div>
          </div>
          <Badge 
            className={`${onTrack ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'} text-[10px] px-3 py-1`}
          >
            {onTrack ? "ON TRACK" : "BEHIND"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Quick Setup */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] text-white/40 uppercase font-bold">Start Date</Label>
            <Input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 bg-white/5 border-white/10 text-white text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] text-white/40 uppercase font-bold">Challenge Days</Label>
            <Input 
              type="number" 
              value={challengeDays}
              onChange={(e) => setChallengeDays(Number(e.target.value))}
              className="h-9 bg-white/5 border-white/10 text-white text-sm"
            />
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
            <Calendar className="h-5 w-5 mx-auto text-white/40 mb-2" />
            <p className="text-3xl font-black text-white">{daysRemaining}</p>
            <p className="text-[9px] text-white/40 uppercase font-bold mt-1">Days Left</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
            <Target className="h-5 w-5 mx-auto text-primary mb-2" />
            <p className="text-3xl font-black text-primary">${remainingProfit.toFixed(0)}</p>
            <p className="text-[9px] text-white/40 uppercase font-bold mt-1">To Target</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
            <TrendingUp className="h-5 w-5 mx-auto text-green-400 mb-2" />
            <p className="text-3xl font-black text-green-400">${dailyTargetNeeded.toFixed(0)}</p>
            <p className="text-[9px] text-white/40 uppercase font-bold mt-1">Per Day</p>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-white/60 uppercase">Profit Progress</span>
              <span className={getStatusColor()}>{profitProgress.toFixed(1)}%</span>
            </div>
            <div className="relative">
              <Progress value={profitProgress} className="h-3 bg-white/10" />
              {/* Time marker */}
              <div 
                className="absolute top-0 w-0.5 h-3 bg-white/60" 
                style={{ left: `${timeProgress}%` }}
              />
            </div>
            <p className="text-[9px] text-white/40 italic">
              White line = where you should be based on time elapsed
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-white/60 uppercase">Safety Buffer</span>
              <span className={safetyProgress > 50 ? 'text-green-400' : 'text-red-400'}>
                ${safetyBuffer.toFixed(0)} remaining
              </span>
            </div>
            <Progress 
              value={safetyProgress} 
              className={`h-2 ${safetyProgress > 50 ? 'bg-green-500/20' : 'bg-red-500/20'}`} 
            />
          </div>
        </div>

        {/* Status Message */}
        <div className={`p-4 rounded-xl border ${onTrack ? 'bg-green-500/10 border-green-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
          <p className={`text-sm font-bold ${getStatusColor()}`}>
            {getStatusMessage()}
          </p>
          {!onTrack && daysRemaining > 0 && (
            <p className="text-[10px] text-white/50 mt-1">
              You need ~${(remainingProfit / daysRemaining).toFixed(0)}/day with {daysRemaining} days left
            </p>
          )}
        </div>

        {/* Daily Breakdown */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <p className="text-[10px] text-white/40 uppercase font-bold mb-3">Daily Target Breakdown</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-white/60">Conservative</p>
              <p className="text-lg font-bold text-white">${(dailyTargetNeeded * 0.8).toFixed(0)}</p>
              <p className="text-[9px] text-white/40">{Math.ceil(daysRemaining * 1.25)} days</p>
            </div>
            <div className="border-x border-white/10">
              <p className="text-xs text-primary">On Schedule</p>
              <p className="text-lg font-bold text-primary">${dailyTargetNeeded.toFixed(0)}</p>
              <p className="text-[9px] text-white/40">{daysRemaining} days</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Aggressive</p>
              <p className="text-lg font-bold text-white">${(dailyTargetNeeded * 1.5).toFixed(0)}</p>
              <p className="text-[9px] text-white/40">{Math.ceil(daysRemaining * 0.67)} days</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
