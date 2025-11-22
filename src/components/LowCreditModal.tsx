import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Sparkles, Zap } from "lucide-react";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Not Enough AI Credits</DialogTitle>
          <DialogDescription className="text-center">
            You need {creditsNeeded} credits to use {featureName}, but only have {credits} remaining.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Balance:</span>
              <span className="font-semibold">{credits} credits</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Needed:</span>
              <span className="font-semibold text-red-600 dark:text-red-500">{creditsNeeded} credits</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">Upgrade for Unlimited AI</p>
                <p className="text-xs text-muted-foreground">
                  Get 500 credits/month (Monthly Plan) or unlimited credits (Lifetime)
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleUpgrade} className="flex-1 gap-2">
              <Sparkles className="h-4 w-4" />
              View Plans
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Free tier: 50 credits/month • Credits reset monthly
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};