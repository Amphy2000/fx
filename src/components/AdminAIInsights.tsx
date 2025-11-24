import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, RefreshCw, TrendingUp, TrendingDown, AlertCircle, Lightbulb, Target, Users, Activity } from "lucide-react";
import { toast } from "sonner";

interface FeatureUsage {
  name: string;
  totalUsers: number;
  totalUsage: number;
  adoptionRate: string;
}

interface AIInsight {
  topFeatures: Array<{ name: string; metric: string; reason: string }>;
  underutilized: Array<{ name: string; adoptionRate: string; suggestion: string }>;
  improvements: Array<{
    title: string;
    impact: string;
    effort: string;
    reasoning: string;
    expectedOutcome: string;
  }>;
  newFeatures: Array<{
    title: string;
    rationale: string;
    priority: string;
    relatedBehavior: string;
  }>;
  userJourneys: Array<{ pattern: string; insight: string; action: string }>;
}

interface AnalyticsData {
  platformStats: {
    totalUsers: number;
    activeUsers: number;
    activityRate: string;
    subscriptionBreakdown: Record<string, number>;
    dateRange: number;
  };
  featureUsage: Record<string, FeatureUsage>;
  creditsByFeature: Record<string, number>;
  aiInsights: AIInsight;
  generatedAt: string;
}

export const AdminAIInsights = () => {
  const [dateRange, setDateRange] = useState(30);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-ai-insights', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('analyze-platform-insights', {
        body: { dateRange }
      });

      if (error) throw error;
      return data as AnalyticsData;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleRefresh = async () => {
    toast.loading("Analyzing platform data...");
    await refetch();
    toast.dismiss();
    toast.success("Insights updated!");
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      default: return 'outline';
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load insights: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const { platformStats, featureUsage, aiInsights } = data;
  const features = Object.values(featureUsage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI-Powered Platform Insights
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Last {dateRange} days • Generated {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange(7)}
            className={dateRange === 7 ? 'bg-primary/10' : ''}
          >
            7d
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange(30)}
            className={dateRange === 30 ? 'bg-primary/10' : ''}
          >
            30d
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange(90)}
            className={dateRange === 90 ? 'bg-primary/10' : ''}
          >
            90d
          </Button>
          <Button onClick={handleRefresh} size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{platformStats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{platformStats.activeUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {platformStats.activityRate}% activity rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Most Used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {features.sort((a, b) => parseFloat(b.adoptionRate) - parseFloat(a.adoptionRate))[0]?.name || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {features.sort((a, b) => parseFloat(b.adoptionRate) - parseFloat(a.adoptionRate))[0]?.adoptionRate}% adoption
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Least Used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {features.sort((a, b) => parseFloat(a.adoptionRate) - parseFloat(b.adoptionRate))[0]?.name || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {features.sort((a, b) => parseFloat(a.adoptionRate) - parseFloat(b.adoptionRate))[0]?.adoptionRate}% adoption
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Adoption Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Adoption Overview</CardTitle>
          <CardDescription>Detailed breakdown of all platform features</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Usage</TableHead>
                <TableHead className="text-right">Adoption Rate</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.sort((a, b) => parseFloat(b.adoptionRate) - parseFloat(a.adoptionRate)).map((feature) => {
                const rate = parseFloat(feature.adoptionRate);
                const status = rate > 50 ? '🟢' : rate > 20 ? '🟡' : '🔴';
                
                return (
                  <TableRow key={feature.name}>
                    <TableCell className="font-medium">{feature.name}</TableCell>
                    <TableCell className="text-right">{feature.totalUsers}</TableCell>
                    <TableCell className="text-right">{feature.totalUsage}</TableCell>
                    <TableCell className="text-right">{feature.adoptionRate}%</TableCell>
                    <TableCell className="text-right">{status}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AI Insights Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Performing Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Top Performing Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiInsights.topFeatures.map((feature, idx) => (
              <div key={idx} className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold">{feature.name}</h4>
                <p className="text-sm text-muted-foreground">{feature.metric}</p>
                <p className="text-sm mt-1">{feature.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Underutilized Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Underutilized Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiInsights.underutilized.map((feature, idx) => (
              <div key={idx} className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-semibold">{feature.name}</h4>
                <p className="text-sm text-muted-foreground">{feature.adoptionRate} adoption</p>
                <p className="text-sm mt-1">{feature.suggestion}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Improvement Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Improvement Opportunities
          </CardTitle>
          <CardDescription>Prioritized recommendations for product enhancement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiInsights.improvements.map((improvement, idx) => (
            <div key={idx} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-start justify-between">
                <h4 className="font-semibold text-lg">{improvement.title}</h4>
                <div className="flex gap-2">
                  <Badge variant={getImpactColor(improvement.impact)}>
                    {improvement.impact} Impact
                  </Badge>
                  <Badge variant="outline">{improvement.effort} Effort</Badge>
                </div>
              </div>
              <p className="text-sm">{improvement.reasoning}</p>
              <div className="bg-muted/50 p-3 rounded">
                <p className="text-sm font-medium">Expected Outcome:</p>
                <p className="text-sm text-muted-foreground">{improvement.expectedOutcome}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* New Feature Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            New Feature Ideas
          </CardTitle>
          <CardDescription>Data-driven suggestions for new features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiInsights.newFeatures.map((feature, idx) => (
            <div key={idx} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-start justify-between">
                <h4 className="font-semibold text-lg">{feature.title}</h4>
                <Badge variant={getPriorityColor(feature.priority)}>
                  {feature.priority} Priority
                </Badge>
              </div>
              <p className="text-sm">{feature.rationale}</p>
              <div className="bg-muted/50 p-3 rounded">
                <p className="text-sm font-medium">Related User Behavior:</p>
                <p className="text-sm text-muted-foreground">{feature.relatedBehavior}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* User Journey Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500" />
            User Journey Insights
          </CardTitle>
          <CardDescription>Behavioral patterns and navigation flows</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiInsights.userJourneys.map((journey, idx) => (
            <div key={idx} className="p-4 border rounded-lg space-y-2">
              <h4 className="font-semibold">{journey.pattern}</h4>
              <p className="text-sm">{journey.insight}</p>
              <div className="bg-muted/50 p-3 rounded">
                <p className="text-sm font-medium">Recommended Action:</p>
                <p className="text-sm text-muted-foreground">{journey.action}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};