import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw } from 'lucide-react';

export const PWAUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (registration) {
        console.log('Service Worker registered successfully');
        // Check for updates every 30 seconds
        setInterval(() => {
          console.log('Checking for app updates...');
          registration.update();
        }, 30000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <Alert className="fixed bottom-4 right-4 w-auto max-w-md shadow-lg z-50 border-primary">
      <RefreshCw className="h-4 w-4" />
      <AlertTitle>Update Available!</AlertTitle>
      <AlertDescription>
        <p className="mb-3">A new version of Amphy AI is available. Reload to get the latest features and improvements.</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleUpdate} className="gap-2">
            <RefreshCw className="h-3 w-3" />
            Reload Now
          </Button>
          <Button size="sm" variant="outline" onClick={handleDismiss}>
            Later
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
