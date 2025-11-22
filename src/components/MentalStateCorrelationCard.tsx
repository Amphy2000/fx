import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const MentalStateCorrelationCard = () => {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <Brain className="h-5 w-5 text-primary" />
          Mental State ↔ Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Discover how your sleep, stress, confidence, and mood directly impact your trading results with data-driven insights.
        </p>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 bg-background/50 rounded-lg border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Sleep Impact</div>
            <div className="text-lg font-bold text-primary">7+ hrs</div>
            <div className="text-xs text-muted-foreground">optimal</div>
          </div>
          <div className="p-3 bg-background/50 rounded-lg border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Stress Effect</div>
            <div className="text-lg font-bold text-primary">-35%</div>
            <div className="text-xs text-muted-foreground">when high</div>
          </div>
          <div className="p-3 bg-background/50 rounded-lg border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Confidence</div>
            <div className="text-lg font-bold text-primary">+42%</div>
            <div className="text-xs text-muted-foreground">when 7+</div>
          </div>
        </div>

        <Button 
          onClick={() => navigate('/analytics/mental-state')}
          variant="outline"
          size="sm"
          className="w-full"
        >
          View Full Analysis
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Your psychology IS your edge. Data proves it.
        </p>
      </CardContent>
    </Card>
  );
};