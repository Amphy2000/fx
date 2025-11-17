import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Brain, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface DailySummary {
  date: string;
  totalTrades: number;
  winRate: number;
  pnl: number;
  emotionalState: string;
  keyInsights: string[];
  recommendations: string[];
  tradingQuality: number;
}

const AIJournal = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadDailySummaries(session.user.id);
    });
  }, [navigate]);

  const loadDailySummaries = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-daily-journal', {
        body: { userId }
      });

      if (error) throw error;
      setDailySummaries(data.summaries || []);
    } catch (error) {
      console.error('Failed to load daily summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmotionalColor = (state: string) => {
    const colors: any = {
      calm: 'bg-green-500/20 text-green-400',
      disciplined: 'bg-blue-500/20 text-blue-400',
      stressed: 'bg-red-500/20 text-red-400',
      overconfident: 'bg-orange-500/20 text-orange-400',
      fearful: 'bg-yellow-500/20 text-yellow-400',
      reckless: 'bg-purple-500/20 text-purple-400'
    };
    return colors[state] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Trading Journal</h1>
          <p className="text-muted-foreground">
            Automatically generated daily insights based on your trading activity
          </p>
          <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20 mt-2">
            <Brain className="h-3 w-3" />
            2 credits per daily summary
          </Badge>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dailySummaries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Journal Entries Yet</h3>
              <p className="text-muted-foreground">
                Start trading and your AI journal will automatically generate daily summaries
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {dailySummaries.map((summary, idx) => (
              <Card key={idx} className="border-border/50 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-xl">
                          {format(new Date(summary.date), 'EEEE, MMMM d, yyyy')}
                        </CardTitle>
                        <CardDescription>
                          {summary.totalTrades} trades • {summary.winRate}% win rate • {summary.pnl >= 0 ? '+' : ''}{summary.pnl.toFixed(2)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={getEmotionalColor(summary.emotionalState)}>
                      {summary.emotionalState}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Trading Quality Score */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Trading Quality</span>
                        <span className="text-lg font-bold text-primary">{summary.tradingQuality}/10</span>
                      </div>
                      <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${summary.tradingQuality * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Key Insights */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Key Insights
                    </h4>
                    <div className="space-y-2">
                      {summary.keyInsights.map((insight, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <span className="text-primary font-bold">{i + 1}.</span>
                          <p className="text-muted-foreground">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Coach's Recommendations
                    </h4>
                    <div className="space-y-2">
                      {summary.recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-3 text-sm p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <span className="text-primary font-bold">{i + 1}.</span>
                          <p>{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AIJournal;
