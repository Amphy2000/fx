import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Sparkles, Zap, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LowCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credits: number;
  featureName: string;
  creditsNeeded: number;
}

export const LowCreditModal = ({ open, onOpenChange, credits, featureName, creditsNeeded }: LowCreditModalProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/pricing');
  };

  const getMotivationalMessage = () => {
    if (credits === 0) {
      return "You've been actively using our AI features! That's exactly what successful traders do.";
    }
    if (credits < 10) {
      return "You're almost out of credits. Don't let this stop your winning streak!";
    }
    return "You're using AI features regularly. Why not unlock unlimited access?";
  };

  const getPlanRecommendation = () => {
    if (featureName === "AI Coach" || featureName === "Weekly Summary") {
      return "Pro users get 500 credits/month, or go Lifetime for unlimited everything.";
    }
    return "Upgrade to Pro (500 credits/month) or Lifetime (unlimited forever).";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Running Low on AI Credits</DialogTitle>
          <DialogDescription className="text-center">
            You need {creditsNeeded} credits for {featureName}, but only have {credits} remaining.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Balance:</span>
              <span className="font-semibold">{credits} credits</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Needed for {featureName}:</span>
              <span className="font-semibold text-yellow-600 dark:text-yellow-500">{creditsNeeded} credits</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-orange-500/10 p-4 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3 mb-3">
              <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">{getMotivationalMessage()}</p>
                <p className="text-xs text-muted-foreground">
                  {getPlanRecommendation()}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-background/50 p-2 rounded">
                <p className="font-semibold text-primary">Pro Plan</p>
                <p className="text-muted-foreground">500 credits/mo</p>
              </div>
              <div className="bg-background/50 p-2 rounded">
                <p className="font-semibold text-amber-600">Lifetime</p>
                <p className="text-muted-foreground">Unlimited ∞</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Maybe Later
            </Button>
            <Button onClick={handleUpgrade} className="flex-1 gap-2 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90">
              <Sparkles className="h-4 w-4" />
              View Plans
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Free: 50 credits/month • Pro: 500 credits/month • Lifetime: Unlimited
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};