import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Award, Calendar, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CreditsGuard } from "@/components/CreditsGuard";
import { CREDIT_COSTS } from "@/utils/creditManager";
import { Badge } from "@/components/ui/badge";
import { ShareToTwitterButton } from "@/components/ShareToTwitterButton";

const WeeklySummary = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const partnerId = searchParams.get('partnerId');
  const [summary, setSummary] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [partnerName, setPartnerName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  const loadSummary = async () => {
    setIsLoading(true);
    try {
      if (partnerId) {
        // Load partner's summary
        const { data, error } = await supabase.functions.invoke('partner-weekly-summary', {
          body: { partner_id: partnerId }
        });

        if (error) throw error;

        setSummary(data.summary);
        setStats(data.stats);
        setPartnerName(data.partnerName || "Partner");
      } else {
        // Load own summary
        const { data, error } = await supabase.functions.invoke('weekly-summary');

        if (error) throw error;

        setSummary(data.summary);
        setStats(data.stats);
      }
    } catch (error: any) {
      console.error("Summary error:", error);
      toast({
        title: "Oops! Our AI is feeling sleepy 😴",
        description: "Please try again in a moment. We're refreshing the summary generator!",
        variant: "destructive",
      });
      setSummary("Unable to generate summary at this time. Please try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <Layout>
      <CreditsGuard requiredCredits={CREDIT_COSTS.weekly_summary} featureName="Weekly Summary">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Calendar className="h-8 w-8 text-primary" />
                {partnerId ? `${partnerName}'s Weekly Summary` : "Weekly Summary"}
              </h1>
              <p className="text-muted-foreground">
                {partnerId ? `${partnerName}'s performance over the last 7 days` : "Your performance over the last 7 days"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!partnerId && stats && (
                <ShareToTwitterButton 
                  stats={{
                    totalTrades: stats.totalTrades,
                    winRate: stats.winRate,
                    wins: stats.wins,
                    losses: stats.totalTrades - stats.wins,
                    mostTradedPair: stats.mostTradedPair
                  }}
                  type="weekly"
                />
              )}
              <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20">
                <Sparkles className="h-3 w-3" />
                {CREDIT_COSTS.weekly_summary} credits
              </Badge>
            </div>
          </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTrades}</div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.winRate}%</div>
              </CardContent>
            </Card>

            <Card className="border-border/50 border-success/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wins</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{stats.wins}</div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Pair</CardTitle>
                <Award className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{stats.mostTradedPair || "N/A"}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Emotional Overview */}
        {stats && stats.emotionalOverview && (
          <Card className="border-border/50 border-primary/20 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🧘 Emotional Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Most Common Pre-Trade</p>
                  <p className="text-lg font-semibold">{stats.emotionalOverview.mostCommon}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Emotion Linked to Losses</p>
                  <p className="text-lg font-semibold text-destructive">{stats.emotionalOverview.lossEmotion}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Best Performance</p>
                  <p className="text-lg font-semibold text-success">{stats.emotionalOverview.bestEmotion}</p>
                </div>
              </div>
              {stats.emotionalOverview.insight && (
                <div className="bg-primary/5 border border-primary/20 rounded p-3 mt-4">
                  <p className="text-sm text-foreground/90">{stats.emotionalOverview.insight}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-pulse">Generating your personalized summary...</div>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{summary}</p>
              </div>
            )}
            
            <Button 
              onClick={loadSummary} 
              disabled={isLoading}
              className="mt-6"
              variant="outline"
            >
              Refresh Summary
            </Button>
          </CardContent>
        </Card>
      </div>
      </CreditsGuard>
    </Layout>
  );
};

export default WeeklySummary;
