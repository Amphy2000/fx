import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Users, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const tiers = [
  {
    name: "Basic Group",
    price: 0,
    description: "Perfect for getting started with group accountability",
    features: [
      "Up to 5 members",
      "Basic goal tracking",
      "Weekly check-ins",
      "Group chat",
      "Standard support"
    ],
    tier: "free"
  },
  {
    name: "Pro Group",
    price: 5000,
    description: "Enhanced features for serious trading groups",
    features: [
      "Up to 20 members",
      "Advanced analytics",
      "Daily automated reminders",
      "Custom challenges",
      "Priority support",
      "Group leaderboard",
      "Performance tracking"
    ],
    tier: "pro",
    popular: true
  },
  {
    name: "Elite Group",
    price: 15000,
    description: "Ultimate group accountability experience",
    features: [
      "Unlimited members",
      "AI-powered insights",
      "Custom branding",
      "Dedicated coach access",
      "Advanced integrations",
      "White-label options",
      "24/7 premium support",
      "Custom features"
    ],
    tier: "elite"
  }
];

interface PremiumGroupTiersProps {
  groupId?: string;
  currentTier?: string;
}

export const PremiumGroupTiers = ({ groupId, currentTier = "free" }: PremiumGroupTiersProps) => {
  const navigate = useNavigate();

  const handleUpgrade = async (tier: string, price: number) => {
    if (price === 0) {
      toast.info('You are already on the basic tier');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to upgrade');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      const { data, error } = await supabase.functions.invoke('initialize-payment', {
        body: {
          planType: 'group_premium',
          email: profile?.email,
          amount: price,
          metadata: {
            group_id: groupId,
            tier: tier
          }
        }
      });

      if (error) throw error;

      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error('Error upgrading group:', error);
      toast.error('Failed to upgrade group');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Premium Group Tiers</h2>
        <p className="text-muted-foreground">
          Upgrade your accountability group for enhanced features
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => (
          <Card 
            key={tier.name}
            className={tier.popular ? "border-primary shadow-lg relative" : ""}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}
            <CardHeader>
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2">
                  {tier.tier === 'elite' && <Crown className="h-5 w-5 text-primary" />}
                  {tier.tier === 'pro' && <Users className="h-5 w-5 text-primary" />}
                  {tier.name}
                </CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    ₦{tier.price.toLocaleString()}
                  </span>
                  {tier.price > 0 && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
                <CardDescription>{tier.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={tier.popular ? "default" : "outline"}
                onClick={() => handleUpgrade(tier.tier, tier.price)}
                disabled={currentTier === tier.tier}
              >
                {currentTier === tier.tier ? 'Current Tier' : 
                 tier.price === 0 ? 'Current Plan' : 'Upgrade'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
