import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, AlertTriangle, TrendingUp, Activity, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AICoachDashboardProps {
  userId: string;
}

export const AICoachDashboard = ({ userId }: AICoachDashboardProps) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysis();
    
    // Set up real-time updates
    const channel = supabase
      .channel('trades-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trades',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadAnalysis();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-behavior-analysis', {
        body: { period: 'day' }
      });

      if (error) throw error;
      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Failed to load AI analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            AI Coach Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Analyzing your trading behavior...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const getEmotionalStateColor = (state: string) => {
    const colors: any = {
      calm: 'text-green-600',
      disciplined: 'text-blue-600',
      stressed: 'text-red-600',
      overconfident: 'text-orange-600',
      fearful: 'text-yellow-600',
      neutral: 'text-gray-600',
      inconsistent: 'text-purple-600'
    };
    return colors[state] || 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Coach Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Emotional State */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Emotional State</span>
              <span className={`text-lg font-bold ${getEmotionalStateColor(analysis.emotionalState)}`}>
                {analysis.emotionalState.toUpperCase()}
              </span>
            </div>
            {analysis.patterns?.consistency && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Consistency Score</span>
                  <span className="font-semibold">{analysis.patterns.consistency.score}/100</span>
                </div>
                <Progress value={analysis.patterns.consistency.score} className="h-2" />
              </div>
            )}
          </div>

          {/* Behavior Warnings */}
          {analysis.behaviorWarnings && analysis.behaviorWarnings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span className="font-semibold">Behavior Warnings</span>
              </div>
              <div className="space-y-2">
                {analysis.behaviorWarnings.map((warning: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="w-full justify-start py-2 text-left">
                    {warning}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Overtrading Detection */}
          {analysis.overtrading?.detected && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-orange-500" />
                <span className="font-semibold text-orange-500">Overtrading Detected</span>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.overtrading.message}</p>
              <div className="mt-2">
                <Progress value={analysis.overtrading.severity * 10} className="h-2 bg-orange-500/20" />
                <p className="text-xs text-muted-foreground mt-1">Severity: {analysis.overtrading.severity}/10</p>
              </div>
            </div>
          )}

          {/* Revenge Trading Detection */}
          {analysis.revengeTrading?.detected && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="font-semibold text-red-500">Revenge Trading Detected</span>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.revengeTrading.message}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {analysis.revengeTrading.instances.length} instances found
              </p>
            </div>
          )}

          {/* AI Insights */}
          {analysis.aiInsights && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-5 w-5 text-primary" />
                <span className="font-semibold">AI Insights</span>
              </div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {analysis.aiInsights}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Recommendations</span>
              </div>
              <div className="space-y-2">
                {analysis.recommendations.map((rec: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
