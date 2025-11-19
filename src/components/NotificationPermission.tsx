import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

declare global {
  interface Window {
    OneSignalDeferred?: Promise<any>;
  }
}

export const NotificationPermission = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oneSignalInitialized, setOneSignalInitialized] = useState(false);

  useEffect(() => {
    initializeOneSignal();
  }, []);

  const initializeOneSignal = async () => {
    try {
      if (!window.OneSignalDeferred) {
        console.error('OneSignal SDK not loaded');
        return;
      }

      const OneSignal = await window.OneSignalDeferred;
      
      const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
      
      if (!appId) {
        console.error('OneSignal App ID not configured');
        return;
      }

      await OneSignal.init({
        appId: appId,
        allowLocalhostAsSecureOrigin: true,
      });

      setOneSignalInitialized(true);

      const isPushEnabled = await OneSignal.User.PushSubscription.optedIn;
      setIsSubscribed(isPushEnabled);

      OneSignal.User.PushSubscription.addEventListener('change', (subscription: any) => {
        setIsSubscribed(subscription.current.optedIn);
      });

    } catch (error) {
      console.error('Error initializing OneSignal:', error);
    }
  };

  const subscribeToPush = async () => {
    if (!oneSignalInitialized) {
      toast.error('Push notifications not ready');
      return;
    }

    setIsLoading(true);
    try {
      const OneSignal = await window.OneSignalDeferred!;

      await OneSignal.Slidedown.promptPush();

      const isPushEnabled = await OneSignal.User.PushSubscription.optedIn;
      
      if (!isPushEnabled) {
        toast.error('Notification permission denied');
        setIsLoading(false);
        return;
      }

      const playerId = await OneSignal.User.PushSubscription.id;
      
      if (!playerId) {
        throw new Error('Failed to get OneSignal player ID');
      }

      const deviceInfo = `${navigator.userAgent}`;

      const { error } = await supabase.functions.invoke('subscribe-push', {
        body: {
          oneSignalPlayerId: playerId,
          deviceInfo
        }
      });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
    } catch (error: any) {
      console.error('Error subscribing to push:', error);
      toast.error(error?.message || 'Failed to enable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!oneSignalInitialized) {
      toast.error('Push notifications not ready');
      return;
    }

    setIsLoading(true);
    try {
      const OneSignal = await window.OneSignalDeferred!;

      await OneSignal.User.PushSubscription.optOut();

      setIsSubscribed(false);
      toast.success('Push notifications disabled');
    } catch (error: any) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to disable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <h3 className="font-medium">Push Notifications</h3>
            <p className="text-sm text-muted-foreground">
              {isSubscribed ? 'You will receive push notifications' : 'Enable to receive notifications'}
            </p>
          </div>
        </div>
        <Button
          onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
          disabled={isLoading}
          variant={isSubscribed ? "outline" : "default"}
        >
          {isLoading ? 'Loading...' : isSubscribed ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </Card>
  );
};
