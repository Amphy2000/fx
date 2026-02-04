import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  AlertTriangle, 
  TrendingDown, 
  Shield,
  Skull,
  CheckCircle2,
  ArrowDown,
  Zap
} from "lucide-react";

interface BreachSimulatorProps {
  accountSize: number;
  currentBalance: number;
  maxDailyDrawdown: number;
  maxTotalDrawdown: number;
  riskPerTrade: number;
  stopLossPips: number;
  suggestedLots: number;
}

export const BreachSimulator = ({
  accountSize,
  currentBalance,
  maxDailyDrawdown,
  maxTotalDrawdown,
  riskPerTrade,
  stopLossPips,
  suggestedLots
}: BreachSimulatorProps) => {
  const [consecutiveLosses, setConsecutiveLosses] = useState(3);
  const [lotSizeMultiplier, setLotSizeMultiplier] = useState(1);

  const simulation = useMemo(() => {
    const riskAmount = currentBalance * (riskPerTrade / 100) * lotSizeMultiplier;
    const dailyBreachLevel = currentBalance - (currentBalance * (maxDailyDrawdown / 100));
    const totalBreachLevel = accountSize - (accountSize * (maxTotalDrawdown / 100));
    
    let balance = currentBalance;
    const scenarios: { losses: number; balance: number; dailyBreach: boolean; totalBreach: boolean; status: string }[] = [];
    
    for (let i = 1; i <= 10; i++) {
      balance -= riskAmount;
      const dailyBreach = balance <= dailyBreachLevel;
      const totalBreach = balance <= totalBreachLevel;
      
      let status = "safe";
      if (totalBreach) status = "total_breach";
      else if (dailyBreach) status = "daily_breach";
      else if (balance <= dailyBreachLevel + riskAmount) status = "danger";
      else if (balance <= dailyBreachLevel + (riskAmount * 2)) status = "warning";
      
      scenarios.push({
        losses: i,
        balance,
        dailyBreach,
        totalBreach,
        status
      });
    }

    const lossesToDailyBreach = scenarios.findIndex(s => s.dailyBreach) + 1 || Infinity;
    const lossesToTotalBreach = scenarios.findIndex(s => s.totalBreach) + 1 || Infinity;
    
    return {
      scenarios,
      riskAmount,
      lossesToDailyBreach,
      lossesToTotalBreach,
      dailyBreachLevel,
      totalBreachLevel,
      selectedScenario: scenarios[consecutiveLosses - 1]
    };
  }, [currentBalance, accountSize, riskPerTrade, maxDailyDrawdown, maxTotalDrawdown, consecutiveLosses, lotSizeMultiplier]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe": return "bg-green-500/20 border-green-500/30 text-green-400";
      case "warning": return "bg-amber-500/20 border-amber-500/30 text-amber-400";
      case "danger": return "bg-orange-500/20 border-orange-500/30 text-orange-400";
      case "daily_breach": return "bg-red-500/20 border-red-500/30 text-red-400";
      case "total_breach": return "bg-red-900/40 border-red-500/50 text-red-300";
      default: return "bg-muted";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "safe": return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case "danger": return <AlertTriangle className="h-5 w-5 text-orange-400" />;
      case "daily_breach": return <Skull className="h-5 w-5 text-red-400" />;
      case "total_breach": return <Skull className="h-5 w-5 text-red-300" />;
      default: return null;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-red-950/20 border-none rounded-3xl overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/20 rounded-xl">
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <CardTitle className="text-white text-lg font-bold">
                Breach Simulator
              </CardTitle>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-0.5">
                "What If" Scenario Analysis
              </p>
            </div>
          </div>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
            RISK ANALYSIS
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Controls */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-white/60 uppercase">Consecutive Losses</span>
              <span className="text-red-400">{consecutiveLosses} trades</span>
            </div>
            <Slider
              value={[consecutiveLosses]}
              onValueChange={(v) => setConsecutiveLosses(v[0])}
              min={1}
              max={10}
              step={1}
              className="py-2"
            />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-white/60 uppercase">Position Size</span>
              <span className="text-primary">{lotSizeMultiplier}x normal</span>
            </div>
            <Slider
              value={[lotSizeMultiplier]}
              onValueChange={(v) => setLotSizeMultiplier(v[0])}
              min={0.5}
              max={3}
              step={0.5}
              className="py-2"
            />
          </div>
        </div>

        {/* Main Result */}
        <div className={`p-6 rounded-2xl border ${getStatusColor(simulation.selectedScenario?.status || 'safe')}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold opacity-60 mb-1">
                After {consecutiveLosses} consecutive losses
              </p>
              <p className="text-4xl font-black">
                ${simulation.selectedScenario?.balance.toFixed(0)}
              </p>
              <p className="text-sm font-medium mt-2 flex items-center gap-2">
                {getStatusIcon(simulation.selectedScenario?.status || 'safe')}
                {simulation.selectedScenario?.status === 'total_breach' && "ACCOUNT BREACHED - Challenge Failed"}
                {simulation.selectedScenario?.status === 'daily_breach' && "Daily limit hit - Stop trading today"}
                {simulation.selectedScenario?.status === 'danger' && "One more loss = Daily breach"}
                {simulation.selectedScenario?.status === 'warning' && "Approaching danger zone"}
                {simulation.selectedScenario?.status === 'safe' && "Still within safe limits"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold opacity-60 mb-1">Total Loss</p>
              <p className="text-2xl font-bold text-red-400">
                -${(simulation.riskAmount * consecutiveLosses).toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        {/* Visual Breakdown */}
        <div className="space-y-3">
          <p className="text-[10px] text-white/40 uppercase font-bold">Loss Cascade Visualization</p>
          <div className="flex gap-2">
            {simulation.scenarios.slice(0, 7).map((s, i) => (
              <div 
                key={i}
                className={`flex-1 p-3 rounded-xl text-center border transition-all cursor-pointer
                  ${i + 1 === consecutiveLosses ? 'ring-2 ring-white/40 scale-105' : ''}
                  ${getStatusColor(s.status)}`}
                onClick={() => setConsecutiveLosses(i + 1)}
              >
                <ArrowDown className={`h-3 w-3 mx-auto mb-1 ${i + 1 === consecutiveLosses ? 'animate-bounce' : ''}`} />
                <p className="text-[10px] font-bold">{i + 1}</p>
                <p className="text-[8px] opacity-60 mt-0.5">
                  ${(s.balance / 1000).toFixed(1)}k
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Insights */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-[10px] text-white/40 uppercase font-bold mb-2">Losses to Daily Breach</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-black text-amber-400">
                {simulation.lossesToDailyBreach === Infinity ? "10+" : simulation.lossesToDailyBreach}
              </p>
              <span className="text-[10px] text-white/40">consecutive</span>
            </div>
            {simulation.lossesToDailyBreach <= 3 && (
              <p className="text-[9px] text-red-400 mt-2 font-medium">
                ⚠️ Very tight - consider reducing size
              </p>
            )}
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-[10px] text-white/40 uppercase font-bold mb-2">Losses to Total Breach</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-black text-red-400">
                {simulation.lossesToTotalBreach === Infinity ? "10+" : simulation.lossesToTotalBreach}
              </p>
              <span className="text-[10px] text-white/40">consecutive</span>
            </div>
            {simulation.lossesToTotalBreach <= 5 && (
              <p className="text-[9px] text-red-400 mt-2 font-medium">
                ⚠️ High risk - challenge at stake
              </p>
            )}
          </div>
        </div>

        {/* Plain English Summary */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-[10px] text-white/40 uppercase font-bold mb-2 flex items-center gap-2">
            <Zap className="h-3 w-3" /> Plain English
          </p>
          <p className="text-sm text-white/80 leading-relaxed">
            At your current risk of <span className="text-primary font-bold">{riskPerTrade}%</span> per trade 
            (${simulation.riskAmount.toFixed(0)} per loss), you can afford 
            <span className="text-amber-400 font-bold"> {Math.min(simulation.lossesToDailyBreach - 1, simulation.lossesToTotalBreach - 1)} losses in a row</span> before 
            hitting a limit. 
            {simulation.lossesToDailyBreach <= 3 && 
              " This is risky - a normal losing streak could end your challenge."}
            {simulation.lossesToDailyBreach > 5 && 
              " You have a healthy buffer to weather normal losing streaks."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
