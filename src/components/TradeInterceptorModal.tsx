import { AlertTriangle, CheckCircle, XCircle, Shield, TrendingDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

interface TradeInterceptorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validationResult: {
    interception_id: string;
    risk_score: number;
    pattern_matched: string;
    suggested_action: string;
    similar_trades_count: number;
    win_rate: string;
    ai_insight?: string;
    credits_remaining: number;
  } | null;
  onProceed: () => void;
  onCancel: () => void;
}

export const TradeInterceptorModal = ({
  open,
  onOpenChange,
  validationResult,
  onProceed,
  onCancel,
}: TradeInterceptorModalProps) => {
  const [confirmText, setConfirmText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!validationResult) return null;

  const { risk_score, pattern_matched, suggested_action, similar_trades_count, win_rate, ai_insight } = validationResult;

  const getRiskColor = (score: number) => {
    if (score >= 60) return "text-green-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  const getRiskIcon = (score: number) => {
    if (score >= 60) return <CheckCircle className="w-12 h-12 text-green-500" />;
    if (score >= 40) return <AlertTriangle className="w-12 h-12 text-yellow-500" />;
    return <XCircle className="w-12 h-12 text-red-500" />;
  };

  const getRiskLabel = (score: number) => {
    if (score >= 60) return "LOW RISK";
    if (score >= 40) return "MODERATE RISK";
    return "HIGH RISK";
  };

  const requiresConfirmation = risk_score < 40;

  const handleProceed = async () => {
    if (requiresConfirmation && confirmText !== "I ACCEPT THE RISK") {
      return;
    }
    setIsProcessing(true);
    await onProceed();
    setIsProcessing(false);
    setConfirmText("");
  };

  const handleCancel = () => {
    onCancel();
    setConfirmText("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary mr-2" />
            <DialogTitle className="text-2xl">Trade Quality Check</DialogTitle>
          </div>
          <DialogDescription className="text-center text-muted-foreground">
            Based on your trading history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Risk Score */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">{getRiskIcon(risk_score)}</div>
            <div className={`text-4xl font-bold ${getRiskColor(risk_score)}`}>
              {risk_score}/100
            </div>
            <Badge 
              variant={risk_score >= 60 ? "default" : risk_score >= 40 ? "secondary" : "destructive"}
              className="text-sm"
            >
              {getRiskLabel(risk_score)}
            </Badge>
            <Progress value={risk_score} className="h-2" />
          </div>

          {/* Pattern Analysis */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <TrendingDown className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Pattern Detected</p>
                <p className="text-sm text-muted-foreground mt-1">{pattern_matched}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{similar_trades_count}</p>
              <p className="text-xs text-muted-foreground">Similar Trades</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{win_rate}%</p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
          </div>

          {/* AI Insight */}
          {ai_insight && (
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-primary mb-1">AI Insight</p>
              <p className="text-sm">{ai_insight}</p>
            </div>
          )}

          {/* Suggested Action */}
          <div className="text-center">
            <p className="text-sm font-semibold mb-1">Recommendation</p>
            <p className="text-sm text-muted-foreground">{suggested_action}</p>
          </div>

          {/* High Risk Confirmation */}
          {requiresConfirmation && (
            <div className="space-y-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive">
                ⚠️ High Risk Trade Detected
              </p>
              <p className="text-xs text-muted-foreground">
                To proceed, type <span className="font-mono font-bold">"I ACCEPT THE RISK"</span> below:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                placeholder="Type confirmation here..."
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              Cancel Trade
            </Button>
            <Button
              className="flex-1"
              onClick={handleProceed}
              disabled={
                isProcessing ||
                (requiresConfirmation && confirmText !== "I ACCEPT THE RISK")
              }
            >
              {isProcessing ? "Processing..." : "Log Anyway"}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            💎 2 AI credits used • {validationResult.credits_remaining} remaining
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
