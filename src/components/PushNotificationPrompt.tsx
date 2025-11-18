import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const PushNotificationPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    checkShouldShowPrompt();
  }, []);

  const checkShouldShowPrompt = async () => {
    // Check if user has dismissed or already subscribed
    const dismissed = localStorage.getItem('push-prompt-dismissed');
    const dismissedAt = dismissed ? new Date(dismissed) : null;
    const daysSinceDismissal = dismissedAt 
      ? (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    // Show again after 7 days
    if (dismissedAt && daysSinceDismissal < 7) {
      return;
    }

    // Check if browser supports notifications
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    // Check current permission status
    if (Notification.permission === 'granted') {
      return;
    }

    if (Notification.permission === 'denied') {
      return;
    }

    // Check if already subscribed
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        return;
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }

    // Show prompt after a short delay
    setTimeout(() => {
      setShowPrompt(true);
    }, 3000);
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const result = await Notification.requestPermission();
      
      if (result !== 'granted') {
        toast.error('Please allow notifications to stay updated');
        setShowPrompt(false);
        return;
      }

      // Get VAPID public key
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-public-key');
      if (vapidError) throw vapidError;

      const { publicKey } = vapidData;

      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to backend
      const deviceInfo = `${navigator.userAgent}`;
      const { error: subError } = await supabase.functions.invoke('subscribe-push', {
        body: {
          subscription: subscription.toJSON(),
          deviceInfo
        }
      });

      if (subError) throw subError;

      toast.success('🔔 Notifications enabled! You\'ll receive important updates.');
      setShowPrompt(false);
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push-prompt-dismissed', new Date().toISOString());
    setShowPrompt(false);
    toast.info('You can enable notifications anytime in Settings');
  };

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-xl">Stay Updated!</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="pt-4 text-base">
            Get instant notifications for:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">📊</div>
            <div>
              <p className="font-medium">Trade Updates</p>
              <p className="text-sm text-muted-foreground">Stay on top of your trading performance</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1">🎯</div>
            <div>
              <p className="font-medium">Achievement Unlocks</p>
              <p className="text-sm text-muted-foreground">Celebrate your milestones</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1">📈</div>
            <div>
              <p className="font-medium">Market Reminders</p>
              <p className="text-sm text-muted-foreground">Never miss important trading sessions</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="flex-1"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleSubscribe}
            disabled={isSubscribing}
            className="flex-1"
          >
            {isSubscribing ? 'Enabling...' : 'Enable Notifications'}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          You can change this anytime in Settings
        </p>
      </DialogContent>
    </Dialog>
  );
};
