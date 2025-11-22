import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionBannerProps {
  profile: any;
}

export const SubscriptionBanner = ({ profile }: SubscriptionBannerProps) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  useEffect(() => {
    // Check if returning from successful payment
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      setShowSuccessBanner(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      
      // Auto-hide after 10 seconds
      setTimeout(() => setShowSuccessBanner(false), 10000);
    }
  }, []);

  const getTierInfo = () => {
    switch (profile?.subscription_tier) {
      case 'lifetime':
        return {
          name: 'Lifetime',
          icon: <Crown className="h-5 w-5" />,
          color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30',
          badgeColor: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
          credits: 'Unlimited',
          trades: 'Unlimited'
        };
      case 'pro':
      case 'monthly':
        return {
          name: 'Pro',
          icon: <Zap className="h-5 w-5" />,
          color: 'from-primary/20 to-blue-500/20 border-primary/30',
          badgeColor: 'bg-primary/20 text-primary',
          credits: '500/month',
          trades: 'Unlimited'
        };
      default:
        return {
          name: 'Free',
          icon: <Sparkles className="h-5 w-5" />,
          color: 'from-gray-500/10 to-gray-500/5 border-gray-500/20',
          badgeColor: 'bg-gray-500/20 text-gray-700 dark:text-gray-400',
          credits: '50/month',
          trades: '10/month'
        };
    }
  };

  const tierInfo = getTierInfo();
  const isFree = profile?.subscription_tier === 'free';

  if (dismissed && !showSuccessBanner) return null;

  // Success banner
  if (showSuccessBanner) {
    return (
      <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={() => setShowSuccessBanner(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 bg-green-500/20 p-2 rounded-lg">
              <Crown className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Payment Successful! 🎉</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Your subscription has been activated. You now have full access to all premium features!
              </p>
              <p className="text-xs text-muted-foreground">
                Your AI credits and trade limits have been updated. Enjoy!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Free tier upgrade prompt
  if (isFree) {
    return (
      <Card className={`bg-gradient-to-r ${tierInfo.color} relative`}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={tierInfo.badgeColor}>
                  {tierInfo.icon}
                  <span className="ml-1">{tierInfo.name} Plan</span>
                </Badge>
              </div>
              <h3 className="font-semibold mb-1">Unlock Premium Features</h3>
              <p className="text-sm text-muted-foreground">
                Upgrade to Pro or Lifetime for unlimited trades, 500+ AI credits, advanced analytics, and priority support.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/pricing')}
              className="bg-primary hover:bg-primary/90 whitespace-nowrap"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Premium tier status
  return (
    <Card className={`bg-gradient-to-r ${tierInfo.color}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 bg-background/50 p-2 rounded-lg">
              {tierInfo.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className={tierInfo.badgeColor}>
                  {tierInfo.name} Plan
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {tierInfo.credits} AI Credits • {tierInfo.trades} Trades
              </p>
            </div>
          </div>
          {profile?.subscription_tier === 'pro' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/pricing')}
            >
              Upgrade to Lifetime
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};