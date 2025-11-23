import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, X, Info } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { detectBrowser, isAppInstalled } from "@/utils/browserDetection";

export const PWAInstallPrompt = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const browser = detectBrowser();

  useEffect(() => {
    // Check if already installed
    if (isAppInstalled()) {
      return;
    }

    // Check session count (show after 2nd session)
    const sessions = parseInt(localStorage.getItem('sessionCount') || '0');
    const promptDismissed = localStorage.getItem('pwaPromptDismissed');
    
    if (sessions < 2 || promptDismissed === 'true') {
      return;
    }

    // For browsers that support beforeinstallprompt (Chrome/Edge)
    if (browser.supportsInstallPrompt) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        
        // Show prompt after 10 seconds
        setTimeout(() => {
          setShowPrompt(true);
        }, 10000);
      };

      window.addEventListener('beforeinstallprompt', handler);

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
      };
    } else if (browser.needsManualInstall) {
      // For Firefox/Safari, show a different prompt after 10 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 10000);
    }
  }, [browser.supportsInstallPrompt, browser.needsManualInstall]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('App installed! You can now access it from your home screen.');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwaPromptDismissed', 'true');
  };

  const handleLearnMore = () => {
    navigate('/install');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  // Chrome/Edge: Show automatic install prompt
  if (browser.supportsInstallPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
        <Card className="border-primary/30 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-sm">Install Amphy AI</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Install our app for faster access, offline support, and push notifications!
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleInstall} className="flex-1">
                    Install
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismiss}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Firefox/Safari: Show manual install guidance
  if (browser.needsManualInstall) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
        <Card className="border-primary/30 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-sm">Install Amphy AI</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {browser.isIOS 
                    ? "Tap the Share button, then 'Add to Home Screen'"
                    : browser.isFirefox
                    ? "Tap the menu (⋮) and select 'Install'"
                    : "Install our app for faster access and offline support"
                  }
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleLearnMore} className="flex-1">
                    Learn How
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismiss}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};