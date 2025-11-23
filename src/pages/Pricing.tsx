import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Zap, Crown, Sparkles, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState(searchParams.get("ref") || "");
  const [promoValidated, setPromoValidated] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      trackPromoClick(ref);
      // Auto-validate promo code from referral link
      validatePromoCode();
    }
  }, [searchParams]);

  const trackPromoClick = async (code: string) => {
    try {
      await supabase.functions.invoke("track-promo-click", {
        body: { promoCode: code }
      });
    } catch (error) {
      console.error("Error tracking promo click:", error);
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode) return;

    try {
      const { data, error } = await supabase
        .from("affiliate_profiles")
        .select("commission_rate, status")
        .eq("promo_code", promoCode.toUpperCase())
        .single();

      console.log("Promo validation response:", { data, error });

      if (error || !data) {
        toast.error("Invalid promo code");
        setPromoValidated(false);
        setPromoDiscount(0);
        return;
      }

      if (data.status !== "active") {
        toast.error("This promo code is not active");
        setPromoValidated(false);
        setPromoDiscount(0);
        return;
      }

      const discountRate = data.commission_rate || 0;
      console.log("Setting discount rate:", discountRate);
      setPromoValidated(true);
      setPromoDiscount(discountRate);
      toast.success(`Promo code applied! ${discountRate}% discount`);
    } catch (error) {
      console.error("Error validating promo:", error);
      toast.error("Failed to validate promo code");
    }
  };

  const handleUpgrade = async (planType: 'pro' | 'lifetime') => {
    setLoading(planType);
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please sign in to upgrade your plan.");
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
          email: user.email,
          promoCode: promoValidated ? promoCode.toUpperCase() : null,
        }
      });
      
      if (error) throw error;
      
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error("Failed to initialize payment. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const calculatePrice = (basePrice: number) => {
    if (!promoValidated) return basePrice.toFixed(2);
    return (basePrice * (1 - promoDiscount / 100)).toFixed(2);
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
    price: promoValidated ? `$${calculatePrice(4.99)}` : "$4.99",
    originalPrice: promoValidated ? "$4.99" : null,
    period: "/month",
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
    price: promoValidated ? `$${calculatePrice(19.99)}` : "$19.99",
    originalPrice: promoValidated ? "$19.99" : null,
    period: "one-time",
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
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            🚀 Beta Launch Special
          </span>
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade anytime. Lock in lifetime access during our beta phase.
          </p>
        </div>

        {searchParams.get("ref") && (
          <div className="max-w-md mx-auto mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <p className="text-sm font-medium">
              🎉 You've been referred! Your promo code <span className="font-mono font-bold">{searchParams.get("ref")}</span> has been applied
            </p>
          </div>
        )}

        <Card className="max-w-md mx-auto mb-12 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Have a Promo Code?
            </CardTitle>
            <CardDescription>Enter your referral or promo code to get 10% off</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="promo">Promo Code</Label>
                <Input
                  id="promo"
                  placeholder="Enter code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={promoValidated}
                />
              </div>
              {!promoValidated && (
                <Button 
                  onClick={validatePromoCode} 
                  className="mt-8"
                  disabled={!promoCode}
                >
                  Apply
                </Button>
              )}
            </div>
            {promoValidated && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                <span>Promo code applied! {promoDiscount}% off</span>
              </div>
            )}
          </CardContent>
        </Card>

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
                  {plan.originalPrice && (
                    <div className="text-lg text-muted-foreground line-through">{plan.originalPrice}</div>
                  )}
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
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
