import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Award } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ConsentModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export const ConsentModal = ({ open, onClose, userId }: ConsentModalProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConsent = async (consent: boolean) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          data_collection_consent: consent,
          consent_date: consent ? new Date().toISOString() : null,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: consent ? "Thank you!" : "Preferences saved",
        description: consent
          ? "You'll now receive personalized insights and weekly summaries."
          : "You can change this anytime in settings.",
      });

      onClose();
    } catch (error) {
      console.error("Error updating consent:", error);
      toast({
        title: "Error",
        description: "Failed to save your preference. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-6 w-6 text-primary" />
            Personalize Your Trading Journey
          </DialogTitle>
          <DialogDescription className="text-base pt-4">
            To provide you with meaningful insights and help improve your trading performance, 
            we'd like your permission to analyze your trade data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-success mt-1 flex-shrink-0" />
            <div>
              <p className="font-medium">Weekly Performance Summaries</p>
              <p className="text-sm text-muted-foreground">
                Get AI-powered insights on your win rate trends, emotional patterns, and improvement areas
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Award className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <p className="font-medium">Achievement Tracking</p>
              <p className="text-sm text-muted-foreground">
                Earn badges for consistency and see your trading streaks
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mt-4">
            <p className="text-sm">
              <strong>Your privacy matters:</strong> Your data is only used to generate personalized 
              insights for you. We never share your trading data with third parties.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleConsent(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Not Now
          </Button>
          <Button
            onClick={() => handleConsent(true)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? "Saving..." : "Enable Personalization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
