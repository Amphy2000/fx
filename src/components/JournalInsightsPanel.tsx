import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, TrendingDown, Lightbulb, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCostBadge } from "./CreditCostBadge";
import { useNavigate } from "react-router-dom";

interface Insights {
  emotionalPatterns: {
    positiveStates: string[];
    negativeStates: string[];
    neutral: string[];
  };
  performanceCorrelation: {
    bestMoods: string[];
    worstMoods: string[];
    optimalConditions: string[];
  };
  keyInsights: string[];
  recommendations: string[];
  confidenceScore: number;
}

export const JournalInsightsPanel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('journal-insights', {
        body: { periodDays: 30 }
      });

      if (error) {
        if ((error as any)?.status === 402) {
          toast.error("Insufficient credits", {
            description: "You need 5 credits for journal insights. Upgrade to continue.",
            action: { label: "Upgrade", onClick: () => navigate("/pricing") }
          });
          return;
        }
        if ((error as any)?.status === 400) {
          toast.error(data?.message || "Not enough data for analysis");
          return;
        }
        throw error;
      }

      setInsights(data.insights);
      toast.success("AI insights generated successfully!");
    } catch (error: any) {
      console.error("Error generating insights:", error);
      toast.error("Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Emotional Insights
            </CardTitle>
            <CardDescription>
              Discover how your emotions correlate with trading performance
            </CardDescription>
          </div>
          <CreditCostBadge cost={5} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!insights ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Generate AI-powered insights from your journal entries, check-ins, and trade emotions
            </p>
            <Button onClick={generateInsights} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Insights (Last 30 Days)
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">Analysis Confidence</p>
                <p className="text-xs text-muted-foreground">Based on data quality and patterns</p>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {insights.confidenceScore}%
              </Badge>
            </div>
            <Progress value={insights.confidenceScore} className="h-2" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <p className="text-sm font-medium">Positive Emotional States</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {insights.emotionalPatterns.positiveStates.map((state, idx) => (
                    <Badge key={idx} variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      {state}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <p className="text-sm font-medium">Negative Emotional States</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {insights.emotionalPatterns.negativeStates.map((state, idx) => (
                    <Badge key={idx} variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                      {state}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Key Insights</p>
              </div>
              <ul className="space-y-2">
                {insights.keyInsights.map((insight, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-primary">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Recommendations</p>
              </div>
              <ul className="space-y-2">
                {insights.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-primary">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button 
              onClick={generateInsights} 
              disabled={loading}
              variant="outline"
              className="w-full mt-4"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Regenerate Insights
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
