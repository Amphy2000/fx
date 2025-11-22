import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const FreeTierLimitWarning = () => {
  const [tradesCount, setTradesCount] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(10);
  const [tier, setTier] = useState("free");
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('trades_count, monthly_trade_limit, subscription_tier')
      .eq('id', user.id)
      .single();

    if (profile) {
      setTradesCount(profile.trades_count || 0);
      setMonthlyLimit(profile.monthly_trade_limit || 10);
      setTier(profile.subscription_tier || 'free');
    }
  };

  if (tier !== 'free') return null;

  const percentUsed = (tradesCount / monthlyLimit) * 100;
  const isNearLimit = percentUsed >= 70;
  const isAtLimit = tradesCount >= monthlyLimit;

  if (!isNearLimit) return null;

  return (
    <Alert variant={isAtLimit ? "destructive" : "default"} className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-semibold">
            {isAtLimit ? "Trade Limit Reached" : `${tradesCount}/${monthlyLimit} trades used this month`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isAtLimit 
              ? "Upgrade to log unlimited trades and unlock all AI features" 
              : `${monthlyLimit - tradesCount} trades remaining • Upgrade for unlimited`
            }
          </p>
        </div>
        <Button 
          size="sm" 
          variant={isAtLimit ? "default" : "outline"}
          onClick={() => navigate('/pricing')}
          className="ml-4"
        >
          <Zap className="mr-2 h-3 w-3" />
          Upgrade
        </Button>
      </AlertDescription>
    </Alert>
  );
};