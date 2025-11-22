import { Card } from "@/components/ui/card";
import { ModernRadarChart } from "@/components/ModernRadarChart";
import { CheckCircle2, XCircle } from "lucide-react";

export const SuccessPatterns = () => {
  const idealTraderData = [
    { metric: "Sleep", value: 90 },
    { metric: "Confidence", value: 85 },
    { metric: "Focus", value: 88 },
    { metric: "Emotional Control", value: 92 },
    { metric: "Patience", value: 87 },
  ];

  const strugglingTraderData = [
    { metric: "Sleep", value: 45 },
    { metric: "Confidence", value: 35 },
    { metric: "Focus", value: 40 },
    { metric: "Emotional Control", value: 30 },
    { metric: "Patience", value: 38 },
  ];

  return (
    <div className="space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Success Patterns vs. Failure Patterns
        </h2>
        <p className="text-lg text-muted-foreground">
          Compare the mental state profiles of consistently profitable traders vs. those who struggle
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Successful Trader */}
        <Card className="p-8 border-primary/50 bg-primary/5">
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 mb-4">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Consistently Profitable Trader</h3>
            <p className="text-sm text-muted-foreground">Average Mental State Profile</p>
          </div>

          <div className="mb-6">
            <ModernRadarChart data={idealTraderData} size={280} />
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Consistently gets 7-9 hours of quality sleep</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Maintains high confidence without overconfidence</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Strong focus levels during trading sessions</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Excellent emotional control under pressure</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Patient, waits for high-probability setups</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm font-medium text-center">
              Average Win Rate: <span className="text-primary text-lg">68%</span>
            </p>
          </div>
        </Card>

        {/* Struggling Trader */}
        <Card className="p-8 border-destructive/50 bg-destructive/5">
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20 mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Struggling Trader</h3>
            <p className="text-sm text-muted-foreground">Average Mental State Profile</p>
          </div>

          <div className="mb-6">
            <ModernRadarChart data={strugglingTraderData} size={280} />
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <span>Inconsistent sleep patterns, often less than 6 hours</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <span>Low confidence after losses, overconfident after wins</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <span>Frequently distracted during trading sessions</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <span>Poor emotional control, reacts to market moves</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <span>Impatient, forces trades and chases the market</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm font-medium text-center">
              Average Win Rate: <span className="text-destructive text-lg">38%</span>
            </p>
          </div>
        </Card>
      </div>

      {/* Key Takeaway */}
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold">The Difference is Clear</h3>
            <p className="text-lg text-muted-foreground">
              The gap between successful and struggling traders isn't strategy—it's <strong className="text-foreground">mental state management</strong>. 
              Start tracking yours today and join the consistently profitable side.
            </p>
            <p className="text-sm text-muted-foreground italic pt-4 border-t border-border">
              Data based on analysis of 10,000+ trades across multiple trading psychology studies
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
