import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CreditCard, Zap, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CreditExhaustionModalProps {
  open: boolean;
  onClose: () => void;
  currentTier: string;
}

export const CreditExhaustionModal = ({ open, onClose, currentTier }: CreditExhaustionModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Zap className="h-6 w-6 text-primary" />
            Out of AI Credits
          </DialogTitle>
          <DialogDescription className="text-base">
            You've used all your AI credits for this month
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Current Plan:</p>
            <Badge variant="outline" className="text-base">
              {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} - 50 credits/month
            </Badge>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Upgrade for More Power
            </h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Pro: 500 credits/month + Voice features</li>
              <li>• Elite: 2000 credits/month + AI Risk Manager</li>
              <li>• Unlimited trades & advanced analytics</li>
              <li>• Priority AI processing</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Maybe Later
          </Button>
          <Button 
            onClick={() => {
              navigate("/pricing");
              onClose();
            }}
            className="flex-1"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            View Plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};