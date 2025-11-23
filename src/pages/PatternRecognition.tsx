import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Target, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCostBadge } from "@/components/CreditCostBadge";
import { toast } from "sonner";
import { CreditsGuard } from "@/components/CreditsGuard";
import { CREDIT_COSTS } from "@/utils/creditManager";

interface TradePattern {
  setupName: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  avgR: number;
  bestConditions: string[];
  commonMistakes: string[];
  confidence: number;
  trending: 'up' | 'down' | 'stable';
}

const PatternRecognition = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [patterns, setPatterns] = useState<TradePattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadPatterns(session.user.id);
    });
  }, [navigate]);

  const loadPatterns = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pattern-recognition', {
        body: { userId }
      });

      if (error) {
        if ((error as any)?.status === 402) {
          toast.error("Insufficient credits", {
            description: "You need 3 credits to analyze patterns. Upgrade to continue.",
            action: { label: "Upgrade", onClick: () => navigate("/pricing") }
          });
          return;
        }
        throw error;
      }
      setPatterns(data.patterns || []);
    } catch (error) {
      console.error('Failed to load patterns:', error);
      toast.error("Failed to load patterns");
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
    return <div className="h-4 w-4" />;
  };

  const getPerformanceColor = (value: number, threshold: number) => {
    return value >= threshold ? 'text-green-500' : 'text-red-500';
  };

  return (
    <Layout>
      <CreditsGuard requiredCredits={CREDIT_COSTS.pattern_recognition} featureName="Pattern Recognition">
        <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Pattern Recognition</h1>
            <p className="text-muted-foreground">
              AI-identified successful trade setups from your historical data
            </p>
          </div>
          <CreditCostBadge cost={3} />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : patterns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Patterns Detected Yet</h3>
              <p className="text-muted-foreground">
                The AI needs more trade history to identify your successful patterns. Keep trading!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {patterns.map((pattern, idx) => (
              <Card key={idx} className="border-border/50 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {pattern.setupName}
                        {getTrendIcon(pattern.trending)}
                      </CardTitle>
                      <CardDescription>
                        {pattern.totalTrades} trades identified
                      </CardDescription>
                    </div>
                    <Badge variant={pattern.winRate >= 50 ? "default" : "secondary"}>
                      {pattern.winRate}% WR
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Profit Factor</p>
                      <p className={`text-xl font-bold ${getPerformanceColor(pattern.profitFactor, 1.5)}`}>
                        {pattern.profitFactor.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Avg R</p>
                      <p className={`text-xl font-bold ${getPerformanceColor(pattern.avgR, 1)}`}>
                        {pattern.avgR.toFixed(2)}R
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                      <p className="text-xl font-bold text-primary">
                        {pattern.confidence}%
                      </p>
                    </div>
                  </div>

                  {/* AI Confidence */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">AI Confidence</span>
                      <span className="text-sm text-muted-foreground">{pattern.confidence}%</span>
                    </div>
                    <Progress value={pattern.confidence} className="h-2" />
                  </div>

                  {/* Best Conditions */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Best Conditions
                    </h4>
                    <ul className="space-y-1">
                      {pattern.bestConditions.map((condition, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          {condition}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Common Mistakes */}
                  {pattern.commonMistakes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Common Mistakes
                      </h4>
                      <ul className="space-y-1">
                        {pattern.commonMistakes.map((mistake, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">•</span>
                            {mistake}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      </CreditsGuard>
    </Layout>
  );
};

export default PatternRecognition;
