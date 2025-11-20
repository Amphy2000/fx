import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AISetupInsightsProps {
  insights: {
    performance_grade: string;
    health_score: number;
    strengths: string[];
    weaknesses: string[];
    winning_patterns: {
      summary: string;
      specific_patterns: string[];
    };
    losing_patterns: {
      summary: string;
      specific_patterns: string[];
    };
    recommendations: string[];
    focus_priority: 'high' | 'medium' | 'low' | 'pause';
    confidence_score: number;
    metrics?: {
      totalTrades: number;
      winRate: string;
      profitFactor: string;
      avgR: string;
    };
  };
  setupName: string;
}

export function AISetupInsights({ insights, setupName }: AISetupInsightsProps) {
  const getGradeColor = (grade: string) => {
    if (grade === 'A+' || grade === 'A') return 'text-success';
    if (grade === 'B') return 'text-info';
    if (grade === 'C') return 'text-warning';
    return 'text-destructive';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-success text-success-foreground';
      case 'medium': return 'bg-info text-info-foreground';
      case 'low': return 'bg-warning text-warning-foreground';
      case 'pause': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '🟢 Champion Setup';
      case 'medium': return '🟡 Needs Refinement';
      case 'low': return '🟠 Review Required';
      case 'pause': return '🔴 Pause Trading';
      default: return priority;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{setupName}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">AI Performance Analysis</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${getGradeColor(insights.performance_grade)}`}>
                {insights.performance_grade}
              </div>
              <p className="text-xs text-muted-foreground">Performance Grade</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Health Score</span>
                <span className="text-sm font-bold">{insights.health_score}/100</span>
              </div>
              <Progress value={insights.health_score} className="h-3" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={getPriorityColor(insights.focus_priority)}>
                {getPriorityLabel(insights.focus_priority)}
              </Badge>
              <Badge variant="outline">
                Confidence: {insights.confidence_score}%
              </Badge>
              {insights.metrics && (
                <>
                  <Badge variant="secondary">
                    {insights.metrics.totalTrades} trades
                  </Badge>
                  <Badge variant="secondary">
                    WR: {insights.metrics.winRate}%
                  </Badge>
                  <Badge variant="secondary">
                    PF: {insights.metrics.profitFactor}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              Key Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {insights.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Key Weaknesses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {insights.weaknesses.map((weakness, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Patterns */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Winning Patterns */}
        <Card className="border-success/20">
          <CardHeader>
            <CardTitle className="text-success">Winning Trade Patterns</CardTitle>
            <p className="text-sm text-muted-foreground">{insights.winning_patterns.summary}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.winning_patterns.specific_patterns.map((pattern, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-success">✓</span>
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Losing Patterns */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Losing Trade Patterns</CardTitle>
            <p className="text-sm text-muted-foreground">{insights.losing_patterns.summary}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.losing_patterns.specific_patterns.map((pattern, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-destructive">✗</span>
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Actionable Recommendations
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Prioritized improvements to enhance your setup performance
          </p>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {insights.recommendations.map((rec, idx) => (
              <li key={idx} className="flex gap-3">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{rec}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Warning if pause priority */}
      {insights.focus_priority === 'pause' && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-semibold text-destructive mb-1">
                  Recommendation: Pause This Setup
                </h4>
                <p className="text-sm text-muted-foreground">
                  Based on current performance metrics, we recommend pausing this setup and focusing on your better-performing strategies. 
                  Consider paper trading any modifications before resuming live trading.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
