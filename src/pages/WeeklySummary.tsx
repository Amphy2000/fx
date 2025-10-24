import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Award, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const WeeklySummary = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      const { data, error } = await supabase.functions.invoke('weekly-summary');

      if (error) throw error;

      setSummary(data.summary);
      setStats(data.stats);
    } catch (error: any) {
      console.error("Summary error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load weekly summary",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Weekly Summary
          </h1>
          <p className="text-muted-foreground">Your performance over the last 7 days</p>
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
    </Layout>
  );
};

export default WeeklySummary;
