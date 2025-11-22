import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap, Crown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
const Pricing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const handleUpgrade = async (planType: 'pro' | 'lifetime') => {
    setLoading(planType);
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upgrade your plan.",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('initialize-payment', {
        body: {
          planType,
          email: user.email
        }
      });
      if (error) throw error;
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast({
        title: "Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };
  const plans = [{
    name: "Free Plan",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    icon: <Sparkles className="h-6 w-6" />,
    features: ["Log up to 10 trades/month", "50 AI credits/month", "Basic trade tracking", "Emotion tracking", "Performance overview", "Earn bonus credits"],
    cta: "Get Started",
    variant: "outline" as const,
    onClick: () => navigate("/auth")
  }, {
    name: "Pro Plan",
    price: "$4.99",
    period: "/month",
    priceAlt: "₦7,500/month",
    description: "For serious traders",
    icon: <Zap className="h-6 w-6" />,
    features: ["Unlimited trade logging", "500 AI credits/month", "AI-powered insights", "Advanced analytics", "Psychology tracking", "Weekly summaries", "Priority support"],
    cta: "Upgrade to Pro",
    variant: "default" as const,
    highlight: true,
    onClick: () => handleUpgrade('pro'),
    planType: 'pro' as const
  }, {
    name: "Lifetime Access",
    price: "$19.99",
    period: "one-time",
    priceAlt: "₦30,000 one-time",
    description: "Limited beta offer",
    icon: <Crown className="h-6 w-6" />,
    badge: "🔥 Best Value",
    features: ["All Pro features", "Unlimited AI credits", "Lifetime access", "No recurring fees", "Future updates included", "Early adopter perks", "VIP support"],
    cta: "Get Lifetime Access",
    variant: "secondary" as const,
    onClick: () => handleUpgrade('lifetime'),
    planType: 'lifetime' as const
  }];
  return <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            🚀 Beta Launch Special
          </span>
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade anytime. Lock in lifetime access during our beta phase.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map(plan => <Card key={plan.name} className={`relative ${plan.highlight ? "border-primary shadow-lg scale-105" : ""}`}>
              {plan.badge && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                  {plan.badge}
                </div>}
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                  {plan.icon}
                </div>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                  {plan.priceAlt && <p className="text-sm text-muted-foreground mt-1">{plan.priceAlt}</p>}
                </div>
              </CardHeader>
              <CardContent>
                <Button variant={plan.variant} onClick={plan.onClick} disabled={loading === plan.planType} className="w-full mb-6 bg-yellow-500 hover:bg-yellow-400 text-black">
                  {loading === plan.planType ? "Processing..." : plan.cta}
                </Button>
                <ul className="space-y-3">
                  {plan.features.map(feature => <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>)}
                </ul>
              </CardContent>
            </Card>)}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>All plans include secure data encryption and privacy protection.</p>
          <p className="mt-2">
            Questions? Contact us at support@amphyjournal.com
            {" | "}
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </Layout>;
};
export default Pricing;