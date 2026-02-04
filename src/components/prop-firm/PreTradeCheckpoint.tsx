import { useState, useEffect } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Zap,
  Target,
  TrendingDown,
  Clock,
  Brain
} from "lucide-react";

interface PreTradeCheckpointProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  tradeData: {
    lotSize: number;
    stopLossPips: number;
    pair: string;
    direction: "buy" | "sell";
  };
  accountData: {
    currentBalance: number;
    accountSize: number;
    dailyLossRemaining: number;
    totalLossRemaining: number;
    maxDailyDrawdown: number;
    maxTotalDrawdown: number;
  };
  pipValue?: number;
}

interface RiskAssessment {
  riskLevel: "low" | "medium" | "high" | "critical";
  potentialLoss: number;
  percentOfDaily: number;
  percentOfTotal: number;
  warnings: string[];
  checks: { label: string; passed: boolean; critical: boolean }[];
}

export const PreTradeCheckpoint = ({
  isOpen,
  onClose,
  onProceed,
  tradeData,
  accountData,
  pipValue = 10
}: PreTradeCheckpointProps) => {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [acknowledged, setAcknowledged] = useState(false);

  const assessment: RiskAssessment = (() => {
    const potentialLoss = tradeData.lotSize * tradeData.stopLossPips * pipValue;
    const percentOfDaily = (potentialLoss / accountData.dailyLossRemaining) * 100;
    const percentOfTotal = (potentialLoss / accountData.totalLossRemaining) * 100;

    const warnings: string[] = [];
    const checks: { label: string; passed: boolean; critical: boolean }[] = [];

    // Check: Will this breach daily limit?
    const dailyBreachRisk = potentialLoss >= accountData.dailyLossRemaining;
    checks.push({
      label: "Trade won't breach daily limit",
      passed: !dailyBreachRisk,
      critical: true
    });
    if (dailyBreachRisk) warnings.push("This trade could breach your daily drawdown limit!");

    // Check: Will this breach total limit?
    const totalBreachRisk = potentialLoss >= accountData.totalLossRemaining;
    checks.push({
      label: "Trade won't breach total limit",
      passed: !totalBreachRisk,
      critical: true
    });
    if (totalBreachRisk) warnings.push("This trade could breach your total drawdown limit!");

    // Check: Risk per trade reasonable?
    const riskPercent = (potentialLoss / accountData.currentBalance) * 100;
    const reasonableRisk = riskPercent <= 2;
    checks.push({
      label: `Risk per trade is reasonable (${riskPercent.toFixed(2)}%)`,
      passed: reasonableRisk,
      critical: false
    });
    if (!reasonableRisk) warnings.push(`High risk: ${riskPercent.toFixed(1)}% of account on one trade`);

    // Check: Leaves buffer for recovery
    const afterLossBalance = accountData.currentBalance - potentialLoss;
    const afterLossBuffer = afterLossBalance - (accountData.accountSize * (1 - accountData.maxTotalDrawdown / 100));
    const hasRecoveryRoom = afterLossBuffer > potentialLoss;
    checks.push({
      label: "Leaves room for recovery trades",
      passed: hasRecoveryRoom,
      critical: false
    });

    // Check: Not using more than 50% of daily limit
    const withinDailyBudget = percentOfDaily <= 50;
    checks.push({
      label: "Uses less than 50% of daily limit",
      passed: withinDailyBudget,
      critical: false
    });

    // Determine risk level
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (dailyBreachRisk || totalBreachRisk) riskLevel = "critical";
    else if (percentOfDaily > 50 || !reasonableRisk) riskLevel = "high";
    else if (percentOfDaily > 25) riskLevel = "medium";

    return {
      riskLevel,
      potentialLoss,
      percentOfDaily,
      percentOfTotal,
      warnings,
      checks
    };
  })();

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "text-green-400 bg-green-500/20 border-green-500/30";
      case "medium": return "text-amber-400 bg-amber-500/20 border-amber-500/30";
      case "high": return "text-orange-400 bg-orange-500/20 border-orange-500/30";
      case "critical": return "text-red-400 bg-red-500/20 border-red-500/30";
      default: return "";
    }
  };

  const allCriticalPassed = assessment.checks.filter(c => c.critical).every(c => c.passed);
  const canProceed = allCriticalPassed && (assessment.riskLevel !== "critical" || acknowledged);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${getRiskColor(assessment.riskLevel)}`}>
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-white">Pre-Trade Checkpoint</DialogTitle>
              <DialogDescription className="text-white/60">
                Review before executing your trade
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Trade Summary */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] text-white/40 uppercase">Pair</p>
                <p className="text-lg font-bold text-white">{tradeData.pair}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase">Size</p>
                <p className="text-lg font-bold text-primary">{tradeData.lotSize} lots</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase">Stop Loss</p>
                <p className="text-lg font-bold text-white">{tradeData.stopLossPips} pips</p>
              </div>
            </div>
          </div>

          {/* Risk Level Badge */}
          <div className={`p-4 rounded-xl border ${getRiskColor(assessment.riskLevel)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {assessment.riskLevel === "critical" && <AlertTriangle className="h-5 w-5 animate-pulse" />}
                {assessment.riskLevel === "high" && <AlertTriangle className="h-5 w-5" />}
                {assessment.riskLevel === "medium" && <Target className="h-5 w-5" />}
                {assessment.riskLevel === "low" && <CheckCircle2 className="h-5 w-5" />}
                <span className="font-bold uppercase text-sm">
                  {assessment.riskLevel} Risk Trade
                </span>
              </div>
              <Badge className={getRiskColor(assessment.riskLevel)}>
                -${assessment.potentialLoss.toFixed(0)} potential loss
              </Badge>
            </div>
          </div>

          {/* Impact Visualization */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-white/60">Impact on Daily Limit</span>
                <span className={assessment.percentOfDaily > 50 ? "text-amber-400" : "text-white"}>
                  {assessment.percentOfDaily.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.min(100, assessment.percentOfDaily)} 
                className="h-2"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-white/60">Impact on Total Limit</span>
                <span className={assessment.percentOfTotal > 25 ? "text-amber-400" : "text-white"}>
                  {assessment.percentOfTotal.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.min(100, assessment.percentOfTotal)} 
                className="h-2"
              />
            </div>
          </div>

          {/* Warnings */}
          {assessment.warnings.length > 0 && (
            <div className="space-y-2">
              {assessment.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-400">{warning}</p>
                </div>
              ))}
            </div>
          )}

          {/* Checklist */}
          <div className="space-y-2">
            <p className="text-[10px] text-white/40 uppercase font-bold">Safety Checks</p>
            {assessment.checks.map((check, i) => (
              <div 
                key={i}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  check.passed 
                    ? "bg-green-500/10 border-green-500/20" 
                    : check.critical 
                      ? "bg-red-500/10 border-red-500/20"
                      : "bg-amber-500/10 border-amber-500/20"
                }`}
              >
                {check.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <XCircle className={`h-4 w-4 ${check.critical ? "text-red-400" : "text-amber-400"}`} />
                )}
                <span className={`text-sm ${check.passed ? "text-green-400" : check.critical ? "text-red-400" : "text-amber-400"}`}>
                  {check.label}
                </span>
                {check.critical && !check.passed && (
                  <Badge className="ml-auto bg-red-500/20 text-red-400 text-[8px]">CRITICAL</Badge>
                )}
              </div>
            ))}
          </div>

          {/* Acknowledgment for critical trades */}
          {assessment.riskLevel === "critical" && allCriticalPassed && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <Checkbox 
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(v) => setAcknowledged(!!v)}
                className="mt-1"
              />
              <label htmlFor="acknowledge" className="text-sm text-red-400 cursor-pointer">
                I understand this is a high-risk trade and I'm willing to accept the potential consequences
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Review Again
          </Button>
          <Button 
            onClick={onProceed}
            disabled={!canProceed}
            className={`flex-1 ${
              assessment.riskLevel === "critical" 
                ? "bg-red-600 hover:bg-red-700" 
                : assessment.riskLevel === "high"
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {canProceed ? (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Proceed with Trade
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Cannot Proceed
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
