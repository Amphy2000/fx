import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Pattern {
  id: string;
  pattern_type: string;
  pattern_description: string;
  win_rate: number;
  sample_size: number;
  confidence_score: number;
  recommendations: string;
  created_at: string;
}

export const PatternsDashboard = () => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      const { data, error } = await supabase
        .from('trade_patterns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPatterns(data || []);
    } catch (error: any) {
      console.error('Error loading patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      
      const { data, error } = await supabase.functions.invoke('analyze-patterns');

      if (error) {
        if (error.message.includes('Insufficient credits')) {
          toast.error('Insufficient AI credits. Please upgrade your plan.');
        } else if (error.message.includes('Not enough trade data')) {
          toast.error('Need at least 5 trades to analyze patterns');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Found ${data.patterns.length} patterns from ${data.trades_analyzed} trades!`);
      await loadPatterns();
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze patterns');
    } finally {
      setAnalyzing(false);
    }
  };

  const getPatternIcon = (type: string) => {
    if (type.includes('pair')) return '💱';
    if (type.includes('time')) return '⏰';
    if (type.includes('session')) return '🌍';
    return '📊';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">AI Pattern Analysis</h3>
          </div>
          <Button onClick={runAnalysis} disabled={analyzing}>
            {analyzing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        </div>

        {patterns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No patterns analyzed yet.</p>
            <p className="text-sm mt-2">Click "Run Analysis" to discover your trading patterns!</p>
            <p className="text-xs mt-4">💎 Cost: 15 AI credits</p>
          </div>
        ) : (
          <div className="space-y-3">
            {patterns.map((pattern) => (
              <Card key={pattern.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getPatternIcon(pattern.pattern_type)}</span>
                      <div>
                        <h4 className="font-medium">{pattern.pattern_description}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={pattern.win_rate >= 60 ? 'default' : 'destructive'}>
                            {pattern.win_rate >= 60 ? (
                              <TrendingUp className="w-3 h-3 mr-1" />
                            ) : (
                              <TrendingDown className="w-3 h-3 mr-1" />
                            )}
                            {pattern.win_rate}% Win Rate
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {pattern.sample_size} trades
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>Confidence</span>
                        <span>{pattern.confidence_score}%</span>
                      </div>
                      <Progress value={pattern.confidence_score} className="h-1" />
                    </div>

                    {pattern.recommendations && (
                      <div className="flex items-start gap-2 text-sm bg-primary/5 p-3 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-primary">{pattern.recommendations}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
