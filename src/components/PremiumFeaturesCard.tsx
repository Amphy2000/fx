import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Users, TrendingUp, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const premiumFeatures = [
  {
    icon: Users,
    title: "AI Coach Matching",
    description: "Get matched with certified trading coaches based on your goals and trading style",
    tier: "pro"
  },
  {
    icon: TrendingUp,
    title: "Advanced Analytics",
    description: "Deep insights into partnership performance, behavioral patterns, and goal tracking",
    tier: "pro"
  },
  {
    icon: Shield,
    title: "Priority Support",
    description: "24/7 priority support for all accountability-related questions",
    tier: "pro"
  },
  {
    icon: Zap,
    title: "Unlimited Partners",
    description: "Connect with unlimited accountability partners and join premium groups",
    tier: "lifetime"
  },
  {
    icon: Crown,
    title: "Coaching Marketplace Access",
    description: "Access exclusive coaching marketplace with verified trading coaches",
    tier: "pro"
  },
  {
    icon: Sparkles,
    title: "Custom Goals & Challenges",
    description: "Create custom challenges and goals with advanced tracking features",
    tier: "lifetime"
  }
];

interface PremiumFeaturesCardProps {
  currentTier: string;
}

export const PremiumFeaturesCard = ({ currentTier }: PremiumFeaturesCardProps) => {
  const navigate = useNavigate();
  const isPremium = currentTier === 'pro' || currentTier === 'lifetime';

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Premium Accountability Features
            </CardTitle>
            <CardDescription>
              Unlock advanced features to supercharge your trading accountability
            </CardDescription>
          </div>
          {isPremium && (
            <Badge variant="default" className="bg-primary">
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {premiumFeatures.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
            >
              <div className="flex-shrink-0">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">{feature.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {feature.tier}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {!isPremium && (
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={() => navigate('/pricing')}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Pro - ₦7,500/month
            </Button>
            <Button 
              onClick={() => navigate('/pricing')}
              variant="outline"
              className="flex-1"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Get Lifetime - ₦30,000
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
