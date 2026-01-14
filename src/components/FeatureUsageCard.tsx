import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFeatureUsage } from "@/hooks/useFeatureUsage";
import { Sparkles, TrendingUp, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
export const FeatureUsageCard = () => {
  const {
    usage,
    loading,
    totalCreditsUsed,
    getMostUsedFeature
  } = useFeatureUsage();
  const navigate = useNavigate();
  const mostUsed = getMostUsedFeature();
  if (loading) {
    return <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>;
  }
  if (usage.length === 0) {
    return <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Unlock AI Features
          </CardTitle>
          <CardDescription>
            Start using AI-powered features to improve your trading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              <span>AI Trade Coach - Get personalized coaching</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              <span>Pattern Recognition - Discover winning setups</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              <span>AI Journal - Automatic daily insights</span>
            </div>
          </div>
          <Button onClick={() => navigate('/ai-features')} className="w-full">
            Explore AI Features
          </Button>
        </CardContent>
      </Card>;
  }
  
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          AI Feature Usage
        </CardTitle>
        <CardDescription>
          Your AI-powered trading insights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Credits Used</span>
          <span className="font-bold text-lg">{totalCreditsUsed}</span>
        </div>
        
        {mostUsed && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Most Used</span>
              <span className="font-medium">{mostUsed.featureName}</span>
            </div>
            <Progress value={Math.min((mostUsed.creditsSpent / totalCreditsUsed) * 100, 100)} className="h-2" />
          </div>
        )}
        
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Crown className="h-4 w-4 text-primary" />
            <span>{usage.length} features explored</span>
          </div>
        </div>
        
        <Button onClick={() => navigate('/ai-features')} variant="outline" className="w-full">
          View All Features
        </Button>
      </CardContent>
    </Card>
  );
};