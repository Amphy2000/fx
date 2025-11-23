import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Download, Wifi, TrendingUp } from "lucide-react";
import { Layout } from "@/components/Layout";
import { detectBrowser, isAppInstalled } from "@/utils/browserDetection";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const browser = detectBrowser();

  useEffect(() => {
    // Check if already installed
    if (isAppInstalled()) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <Layout>
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-2">Install Amphy AI</CardTitle>
            <CardDescription className="text-base">
              Get the full app experience on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isInstalled ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Already Installed!</h3>
                <p className="text-muted-foreground">
                  You're using the installed version of Amphy AI
                </p>
              </div>
            ) : (
              <>
                {/* Browser Detection Alert */}
                {!browser.supportsInstallPrompt && (
                  <Alert className="mb-4">
                    <AlertDescription>
                      You're using {browser.browserName}. Follow the manual installation steps below for your platform.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Wifi className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Work Offline</h3>
                    <p className="text-sm text-muted-foreground">
                      Log trades and view stats without internet
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Faster Access</h3>
                    <p className="text-sm text-muted-foreground">
                      Launch instantly from your home screen
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Smartphone className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">App Experience</h3>
                    <p className="text-sm text-muted-foreground">
                      Full-screen mode without browser UI
                    </p>
                  </div>
                </div>

                {isInstallable ? (
                  <div className="text-center pt-4">
                    <Button onClick={handleInstallClick} size="lg" className="gap-2">
                      <Download className="w-5 h-5" />
                      Install App
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Automatic installation available on {browser.browserName}
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted p-6 rounded-lg space-y-4">
                    <h3 className="font-semibold text-center mb-4">How to Install</h3>
                    
                    <div className="space-y-4">
                      {/* iOS Instructions */}
                      <div className={browser.isIOS ? "border-2 border-primary/50 rounded-lg p-3" : ""}>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          {browser.isIOS && <span className="text-primary">→</span>}
                          On iPhone/iPad (Safari):
                        </h4>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Tap the Share button (□ with arrow) at the bottom</li>
                          <li>Scroll down and tap "Add to Home Screen"</li>
                          <li>Tap "Add" to confirm</li>
                        </ol>
                      </div>
                      
                      {/* Android Chrome/Edge Instructions */}
                      <div className={browser.isAndroid && browser.supportsInstallPrompt ? "border-2 border-primary/50 rounded-lg p-3" : ""}>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          {browser.isAndroid && browser.supportsInstallPrompt && <span className="text-primary">→</span>}
                          On Android (Chrome/Edge):
                        </h4>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Tap the menu (⋮) in your browser</li>
                          <li>Select "Install app" or "Add to Home screen"</li>
                          <li>Tap "Install" to confirm</li>
                        </ol>
                      </div>

                      {/* Android Firefox Instructions */}
                      <div className={browser.isAndroid && browser.isFirefox ? "border-2 border-primary/50 rounded-lg p-3" : ""}>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          {browser.isAndroid && browser.isFirefox && <span className="text-primary">→</span>}
                          On Android (Firefox):
                        </h4>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Tap the menu (⋮) at the top right</li>
                          <li>Select "Install"</li>
                          <li>Confirm the installation</li>
                        </ol>
                      </div>

                      {/* Desktop Instructions */}
                      {!browser.isIOS && !browser.isAndroid && (
                        <div className="border-2 border-primary/50 rounded-lg p-3">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <span className="text-primary">→</span>
                            On Desktop ({browser.browserName}):
                          </h4>
                          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                            {browser.supportsInstallPrompt ? (
                              <>
                                <li>Look for the install icon (⊕) in the address bar</li>
                                <li>Click it and select "Install"</li>
                                <li>The app will open in its own window</li>
                              </>
                            ) : browser.isFirefox ? (
                              <>
                                <li>Click the menu (≡) at the top right</li>
                                <li>Look for "Install Amphy AI"</li>
                                <li>Click to install the app</li>
                              </>
                            ) : (
                              <>
                                <li>Use Chrome or Edge for automatic installation</li>
                                <li>Or bookmark this page for quick access</li>
                              </>
                            )}
                          </ol>
                        </div>
                      )}
                    </div>

                    {/* Helpful tip */}
                    <p className="text-xs text-center text-muted-foreground mt-4">
                      💡 For the best experience, we recommend using Chrome or Edge
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
