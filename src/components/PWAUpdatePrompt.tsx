import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export const PWAUpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Register service worker and check for updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { type: 'module' })
        .then((reg) => {
          console.log('Service Worker registered:', reg);
          setRegistration(reg);

          // Check for updates every 60 seconds
          setInterval(() => {
            console.log('Checking for app updates...');
            reg.update();
          }, 60000);

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
        })
        .catch((error) => {
          console.error('SW registration error:', error);
        });

      // Listen for controlling service worker changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Controller changed, reloading page...');
        window.location.reload();
      });
    }
  }, []);

  const handleUpdate = () => {
    setShowPrompt(false);
    
    if (registration?.waiting) {
      // Tell the service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Force reload after a short delay to ensure SW activates
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } else {
      // Fallback: just reload immediately
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
