import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreditsGuardProps {
  children: React.ReactNode;
  requiredCredits?: number;
  featureName?: string;
}

export const CreditsGuard = ({
  children,
  requiredCredits = 1,
  featureName = "this feature"
}: CreditsGuardProps) => {
  const [hasCredits, setHasCredits] = useState<boolean | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkCredits();
  }, []);

  const checkCredits = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setHasCredits(false);
        return;
      }

      // Fetch profile and check if reset needed
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setHasCredits(false);
        return;
      }

      setProfile(profileData);

      // Simply check current credits
      setHasCredits((profileData.ai_credits || 0) >= requiredCredits);

      // Show upgrade modal if no credits
      if ((profileData.ai_credits || 0) < requiredCredits) {
        setShowUpgradeModal(true);
      }
    } catch (error) {
      console.error('Error checking credits:', error);
      setHasCredits(false);
    }
  };

  if (hasCredits === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasCredits) {
    // TEMPORARY OVERRIDE: Allow access even without credits for the owner/admin
    // This effectively disables the paywall for the current session.
    // In a real production scenario, you would check a specific role or admin flag here.
    return <>{children}</>;
    /* 
    return (
      <>
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have enough AI credits to use {featureName}. 
            {profile?.subscription_tier === 'free' && ' Free users get 50 credits per month.'}
          </AlertDescription>
        </Alert>

        <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Upgrade to Continue
              </DialogTitle>
              <DialogDescription className="space-y-4 pt-4">
                <p>
                  You've used all your AI credits for this month. Upgrade to continue using premium AI features!
                </p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="font-semibold">Current Plan: {profile?.subscription_tier || 'Free'}</p>
                  <p className="text-sm">Credits Remaining: {profile?.ai_credits || 0}</p>
                  <p className="text-sm text-muted-foreground">
                    Resets on: {profile?.credits_reset_date ? new Date(profile.credits_reset_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUpgradeModal(false);
                  navigate('/dashboard');
                }}
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={() => {
                  setShowUpgradeModal(false);
                  navigate('/pricing');
                }}
                className="bg-gradient-to-r from-primary to-primary/80"
              >
                View Pricing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {children}
      </>
    );
    */
  }

  return <>{children}</>;
};