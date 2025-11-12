import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface TradeInsightBadgeProps {
  behaviorLabel?: string;
  patternType?: string;
  confidenceScore?: number;
  executionGrade?: string;
  onClick?: () => void;
}

export const TradeInsightBadge = ({ 
  behaviorLabel, 
  patternType, 
  confidenceScore,
  executionGrade,
  onClick 
}: TradeInsightBadgeProps) => {
  if (!behaviorLabel && !patternType) return null;

  const getBehaviorConfig = (behavior: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      perfect_timing: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle, label: "Good Execution" },
      chased_entry: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: AlertTriangle, label: "Chased Entry" },
      held_too_long: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: AlertTriangle, label: "Held Too Long" },
      emotional_exit: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: AlertTriangle, label: "Emotional Exit" },
      revenge_trade: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle, label: "Revenge Trade" },
      high_rr_setup: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: TrendingUp, label: "High R:R Setup" }
    };
    return configs[behavior] || { color: "bg-muted text-muted-foreground border-border", icon: Brain, label: behavior };
  };

  const config = getBehaviorConfig(behaviorLabel || '');
  const Icon = config.icon;

  return (
    <div className="flex flex-wrap gap-2">
      <Badge 
        variant="outline" 
        className={`${config.color} cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5 px-2.5 py-1`}
        onClick={onClick}
      >
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium">{config.label}</span>
        {confidenceScore && (
          <span className="text-xs opacity-70">({confidenceScore}%)</span>
        )}
      </Badge>
      
      {patternType && (
        <Badge 
          variant="outline" 
          className="bg-purple-500/20 text-purple-400 border-purple-500/30 cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5 px-2.5 py-1"
          onClick={onClick}
        >
          <Brain className="h-3 w-3" />
          <span className="text-xs font-medium capitalize">{patternType}</span>
        </Badge>
      )}

      {executionGrade && (
        <Badge 
          variant="outline" 
          className="bg-accent/20 text-accent-foreground border-accent/30 cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5 px-2.5 py-1"
          onClick={onClick}
        >
          <span className="text-xs font-bold">Grade: {executionGrade}</span>
        </Badge>
      )}
    </div>
  );
};
