import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, Trophy, Target, Wallet, Calendar, CheckCircle2, ArrowRight } from "lucide-react";

interface PayoutCalculatorProps {
  accountSize: number;
  currentBalance: number;
  profitTargetPercent: number;
  propFirm: string;
}

interface PhaseInfo {
  name: string;
  profitTarget: number;
  minDays: number;
  maxDays: number;
  payoutSplit: number;
  scalingBonus: number;
}

const PROP_FIRM_PHASES: Record<string, PhaseInfo[]> = {
  ftmo: [
    { name: "Challenge", profitTarget: 10, minDays: 4, maxDays: 30, payoutSplit: 0, scalingBonus: 0 },
    { name: "Verification", profitTarget: 5, minDays: 4, maxDays: 60, payoutSplit: 0, scalingBonus: 0 },
    { name: "Funded", profitTarget: 0, minDays: 0, maxDays: 0, payoutSplit: 80, scalingBonus: 90 },
  ],
  fundedNext: [
    { name: "Phase 1", profitTarget: 10, minDays: 0, maxDays: 30, payoutSplit: 0, scalingBonus: 0 },
    { name: "Phase 2", profitTarget: 5, minDays: 0, maxDays: 60, payoutSplit: 0, scalingBonus: 0 },
    { name: "Funded", profitTarget: 0, minDays: 0, maxDays: 0, payoutSplit: 80, scalingBonus: 95 },
  ],
  e8Funding: [
    { name: "Evaluation", profitTarget: 8, minDays: 5, maxDays: 30, payoutSplit: 0, scalingBonus: 0 },
    { name: "Funded", profitTarget: 0, minDays: 0, maxDays: 0, payoutSplit: 80, scalingBonus: 100 },
  ],
  myForexFunds: [
    { name: "Evaluation", profitTarget: 8, minDays: 5, maxDays: 30, payoutSplit: 0, scalingBonus: 0 },
    { name: "Verification", profitTarget: 5, minDays: 5, maxDays: 60, payoutSplit: 0, scalingBonus: 0 },
    { name: "Funded", profitTarget: 0, minDays: 0, maxDays: 0, payoutSplit: 75, scalingBonus: 85 },
  ],
  custom: [
    { name: "Phase 1", profitTarget: 10, minDays: 0, maxDays: 30, payoutSplit: 0, scalingBonus: 0 },
    { name: "Funded", profitTarget: 0, minDays: 0, maxDays: 0, payoutSplit: 80, scalingBonus: 90 },
  ],
};

export const PayoutCalculator = ({
  accountSize,
  currentBalance,
  profitTargetPercent,
  propFirm,
}: PayoutCalculatorProps) => {
  const calculations = useMemo(() => {
    const phases = PROP_FIRM_PHASES[propFirm] || PROP_FIRM_PHASES.custom;
    const fundedPhase = phases.find(p => p.payoutSplit > 0) || phases[phases.length - 1];
    
    // Calculate potential earnings
    const monthlyProfitEstimates = [2, 5, 10]; // Conservative, Moderate, Aggressive %
    const projectedEarnings = monthlyProfitEstimates.map(monthlyPercent => {
      const monthlyProfit = accountSize * (monthlyPercent / 100);
      const yourCut = monthlyProfit * (fundedPhase.payoutSplit / 100);
      const yearlyEstimate = yourCut * 12;
      return { monthlyPercent, monthlyProfit, yourCut, yearlyEstimate };
    });

    // Calculate progress to funded
    const profit = currentBalance - accountSize;
    const profitPercent = (profit / accountSize) * 100;
    const targetProfit = accountSize * (profitTargetPercent / 100);
    const progressToTarget = Math.min(100, Math.max(0, (profit / targetProfit) * 100));

    // Scaling potential
    const scalingMultipliers = [1, 1.25, 1.5, 2, 4];
    const scalingPotential = scalingMultipliers.map(mult => ({
      multiplier: mult,
      newAccountSize: accountSize * mult,
      potentialPayout: (accountSize * mult) * 0.05 * (fundedPhase.payoutSplit / 100) // 5% monthly
    }));

    return {
      phases,
      fundedPhase,
      projectedEarnings,
      profit,
      profitPercent,
      progressToTarget,
      scalingPotential,
      targetProfit,
    };
  }, [accountSize, currentBalance, profitTargetPercent, propFirm]);

  return (
    <div className="space-y-6">
      {/* Journey Progress */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-none rounded-[32px] overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Your Path to Payout</h3>
              <p className="text-sm text-white/40">Track your journey from challenge to funded trader</p>
            </div>
          </div>

          {/* Phase Journey */}
          <div className="relative mb-8">
            <div className="flex items-center justify-between relative">
              {calculations.phases.map((phase, index) => (
                <div key={phase.name} className="flex flex-col items-center relative z-10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 && calculations.profitPercent < calculations.phases[0].profitTarget
                      ? 'bg-primary text-white ring-4 ring-primary/20'
                      : index === 0 && calculations.profitPercent >= calculations.phases[0].profitTarget
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-800 text-white/40'
                  }`}>
                    {index === 0 && calculations.profitPercent >= calculations.phases[0].profitTarget ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-white/60 mt-2 uppercase tracking-wider">{phase.name}</p>
                  {phase.profitTarget > 0 && (
                    <Badge className="mt-1 bg-white/10 text-white/60 border-none text-[9px]">
                      {phase.profitTarget}% target
                    </Badge>
                  )}
                  {phase.payoutSplit > 0 && (
                    <Badge className="mt-1 bg-green-500/20 text-green-400 border-none text-[9px]">
                      {phase.payoutSplit}% split
                    </Badge>
                  )}
                </div>
              ))}
              {/* Progress line */}
              <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-slate-800">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, (calculations.progressToTarget / calculations.phases.length) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Current Progress */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-slate-800/50 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Current Profit</p>
              <p className={`text-2xl font-black ${calculations.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${calculations.profit.toFixed(0)}
              </p>
              <p className={`text-xs font-medium ${calculations.profitPercent >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
                {calculations.profitPercent >= 0 ? '+' : ''}{calculations.profitPercent.toFixed(2)}%
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Target</p>
              <p className="text-2xl font-black text-primary">${calculations.targetProfit.toFixed(0)}</p>
              <p className="text-xs font-medium text-primary/60">+{profitTargetPercent}%</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Remaining</p>
              <p className="text-2xl font-black text-white">
                ${Math.max(0, calculations.targetProfit - calculations.profit).toFixed(0)}
              </p>
              <p className="text-xs font-medium text-white/40">to pass</p>
            </div>
          </div>

          <Progress value={calculations.progressToTarget} className="h-3 rounded-full" />
          <p className="text-center text-xs font-bold text-white/40 mt-2">
            {calculations.progressToTarget.toFixed(1)}% to Phase Complete
          </p>
        </CardContent>
      </Card>

      {/* Projected Earnings When Funded */}
      <Card className="bg-slate-900 border-none rounded-2xl">
        <CardHeader className="pb-2 border-b border-white/5">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-400" />
            Projected Monthly Earnings (When Funded)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3">
            {calculations.projectedEarnings.map((earning, index) => (
              <Card 
                key={earning.monthlyPercent}
                className={`p-4 border-none rounded-xl ${
                  index === 0 ? 'bg-slate-800/50' :
                  index === 1 ? 'bg-primary/10 ring-2 ring-primary/20' :
                  'bg-green-500/10'
                }`}
              >
                <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${
                  index === 0 ? 'text-white/40' :
                  index === 1 ? 'text-primary' :
                  'text-green-400'
                }`}>
                  {index === 0 ? 'Conservative' : index === 1 ? 'Moderate' : 'Aggressive'}
                </p>
                <p className={`text-3xl font-black ${
                  index === 0 ? 'text-white' :
                  index === 1 ? 'text-primary' :
                  'text-green-400'
                }`}>
                  ${earning.yourCut.toFixed(0)}
                </p>
                <p className="text-[10px] text-white/40 mt-1">
                  {earning.monthlyPercent}% monthly • {calculations.fundedPhase.payoutSplit}% split
                </p>
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-[9px] font-bold text-white/30 uppercase">Yearly Potential</p>
                  <p className="text-lg font-bold text-white/60">${earning.yearlyEstimate.toLocaleString()}</p>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scaling Potential */}
      <Card className="bg-slate-900 border-none rounded-2xl">
        <CardHeader className="pb-2 border-b border-white/5">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Scaling Potential (5% Monthly Profit)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            {calculations.scalingPotential.map((scale, index) => (
              <div 
                key={scale.multiplier}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  index === 0 ? 'bg-primary/10 ring-1 ring-primary/20' : 'bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Badge className={`${index === 0 ? 'bg-primary text-white' : 'bg-white/10 text-white/60'} border-none`}>
                    {scale.multiplier}x
                  </Badge>
                  <div>
                    <p className="text-sm font-bold text-white">${scale.newAccountSize.toLocaleString()}</p>
                    <p className="text-[10px] text-white/40">Account Size</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-green-400">${scale.potentialPayout.toLocaleString()}</p>
                  <p className="text-[10px] text-white/40">Monthly Payout</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-center text-white/30 mt-4">
            Scale up by maintaining consistency and following rules. Up to {calculations.fundedPhase.scalingBonus}% profit split available!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
