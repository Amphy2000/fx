import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw } from 'lucide-react';

export const PWAUpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered');
          setRegistration(reg);

          // Check for updates every 30 seconds
          const intervalId = setInterval(() => {
            console.log('Checking for updates...');
            reg.update().catch(err => console.error('Update check failed:', err));
          }, 30000);

          // Listen for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New version available!');
                setShowPrompt(true);
              }
            });
          });

          return () => clearInterval(intervalId);
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });

      // Listen for controller changes
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    setShowPrompt(false);
    
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

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
