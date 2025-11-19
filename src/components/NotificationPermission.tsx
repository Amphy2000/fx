import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const NotificationPermission = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
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

  const subscribeToPush = async () => {
    setIsLoading(true);
    try {
      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast.error('Notification permission denied');
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

      // Send subscription to backend (auth token is automatically included by Supabase client)
      const deviceInfo = `${navigator.userAgent}`;

      const { error: subError } = await supabase.functions.invoke('subscribe-push', {
        body: {
          subscription: subscription.toJSON(),
          deviceInfo
        }
      });

      if (subError) throw subError;

      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
    } catch (error: any) {
      console.error('Error subscribing to push:', error);
      const errorMsg = error?.message || 'Failed to enable push notifications';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
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
