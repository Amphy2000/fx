import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const CreditDisplay = () => {
  const [credits, setCredits] = useState<number | null>(null);
  const [tier, setTier] = useState<string>("free");
  const navigate = useNavigate();

  useEffect(() => {
    fetchCredits();
    const interval = setInterval(fetchCredits, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchCredits = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('ai_credits, subscription_tier')
      .eq('id', user.id)
      .single();

    if (data) {
      setCredits(data.ai_credits);
      setTier(data.subscription_tier);
    }
  };

  if (credits === null) return null;

  // Premium users show "Unlimited" badge
  const isPremium = tier && ['pro', 'lifetime', 'monthly'].includes(tier);
  
  if (isPremium) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/pricing')}
              className="gap-2 text-primary"
            >
              <Sparkles className="h-4 w-4" />
              <span className="font-semibold">∞</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2 p-2">
              <p className="font-semibold text-primary">⚡ Unlimited AI Credits</p>
              <p className="text-xs text-muted-foreground">
                As a {tier === 'lifetime' ? 'Lifetime' : 'Pro'} member, you have unlimited access to all AI features:
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>• Trade Validation</div>
                <div>• AI Coach & Assistant</div>
                <div>• Weekly AI Summaries</div>
                <div>• Pattern Recognition</div>
                <div>• Setup Analysis</div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const isLow = credits < 10;
  const isCritical = credits < 5;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/pricing')}
            className={`gap-2 ${isCritical ? 'text-red-500 animate-pulse' : isLow ? 'text-yellow-500' : ''}`}
          >
            <Sparkles className="h-4 w-4" />
            <span className="font-semibold">{credits}</span>
            {isCritical && <AlertTriangle className="h-3 w-3" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2 p-2">
            <p className="font-semibold">AI Credits: {credits}</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>• Check-in Analysis: 2 credits</div>
              <div>• Trade Validation: 2 credits</div>
              <div>• Trade Analysis: 5 credits</div>
              <div>• AI Coach Chat: 3 credits/msg</div>
              <div>• Weekly Summary: 10 credits</div>
            </div>
            {isLow && (
              <p className="text-xs text-yellow-600 dark:text-yellow-500 pt-2 border-t">
                ⚠️ Low credits! Upgrade for UNLIMITED AI features.
              </p>
            )}
            <p className="text-xs text-primary pt-1">
              💎 Pro/Lifetime = Unlimited AI
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};