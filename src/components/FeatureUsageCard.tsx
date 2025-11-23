import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFeatureUsage } from "@/hooks/useFeatureUsage";
import { Sparkles, TrendingUp, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export const FeatureUsageCard = () => {
  const { usage, loading, totalCreditsUsed, getMostUsedFeature } = useFeatureUsage();
  const navigate = useNavigate();
  const mostUsed = getMostUsedFeature();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (usage.length === 0) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
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
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Your AI Usage
        </CardTitle>
        <CardDescription>
          {totalCreditsUsed} credits used across {usage.length} features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mostUsed && (
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Most Used Feature</span>
              <span className="text-xs text-muted-foreground">
                {mostUsed.creditsSpent} credits
              </span>
            </div>
            <p className="text-lg font-bold capitalize mb-2">
              {mostUsed.featureName.replace(/_/g, ' ')}
            </p>
            <Progress value={(mostUsed.creditsSpent / totalCreditsUsed) * 100} className="h-2" />
          </div>
        )}

        <div className="space-y-2">
          {usage.slice(0, 3).map((feature) => (
            <div key={feature.featureName} className="flex items-center justify-between text-sm">
              <span className="capitalize text-muted-foreground">
                {feature.featureName.replace(/_/g, ' ')}
              </span>
              <span className="font-medium">{feature.creditsSpent} credits</span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t">
          <Button 
            onClick={() => navigate('/pricing')} 
            variant="outline" 
            className="w-full gap-2"
          >
            <Crown className="h-4 w-4" />
            Upgrade for Unlimited AI
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
