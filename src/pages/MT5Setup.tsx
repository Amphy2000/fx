import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Settings, Play, CheckCircle, FolderOpen, Upload, Link2, TestTube, Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MT5SetupWizard } from "@/components/MT5SetupWizard";
import { supabase } from "@/integrations/supabase/client";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { Skeleton } from "@/components/ui/skeleton";

export default function MT5Setup() {
  const [videoUrl, setVideoUrl] = useState("");
  const [isPaidUser, setIsPaidUser] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsPaidUser(false);
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      setIsPaidUser(profile?.subscription_tier !== 'free');
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsPaidUser(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 space-y-8">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!isPaidUser) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <UpgradePrompt
            title="MT5 Auto-Sync: Automate Your Trading Journal"
            description="Say goodbye to manual trade logging. MT5 Auto-Sync automatically imports all your trades in real-time, saving you hours every week. Focus on trading while we handle the data entry."
            featureName="MT5 Auto-Sync"
          />
          
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Why Professional Traders Love MT5 Auto-Sync</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold">Zero Manual Entry</p>
                      <p className="text-sm text-muted-foreground">Every trade automatically logged the moment you close it</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold">100% Accurate</p>
                      <p className="text-sm text-muted-foreground">Direct MT5 connection ensures perfect data accuracy</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold">Real-Time Analytics</p>
                      <p className="text-sm text-muted-foreground">Instant insights on your performance as you trade</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Settings className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold">5-Minute Setup</p>
                      <p className="text-sm text-muted-foreground">One-time configuration, lifetime of automation</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">MT5 Auto-Sync Setup Guide</h1>
          <p className="text-muted-foreground">
            One-time 5-minute setup for automatic trade synchronization
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Make sure you've connected your MT5 account in the{" "}
            <a href="/integrations" className="underline font-semibold">Integrations page</a> first.
          </AlertDescription>
        </Alert>

        {/* Setup Options */}
        <Tabs defaultValue="wizard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wizard" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Interactive Wizard
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Video Guide
            </TabsTrigger>
            <TabsTrigger value="detailed" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Detailed Steps
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wizard" className="mt-6">
            <MT5SetupWizard />
          </TabsContent>

          <TabsContent value="video" className="mt-6">
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Video Tutorial
                </CardTitle>
                <CardDescription>
                  Watch this step-by-step video guide for visual learners
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {videoUrl ? (
                  <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden">
                    <iframe
                      src={videoUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-muted rounded-lg flex flex-col items-center justify-center gap-4">
                    <Play className="h-16 w-16 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Video tutorial coming soon</p>
                    <div className="space-y-2 w-full max-w-md px-4">
                      <Label htmlFor="videoUrl" className="text-xs">Admin: Paste YouTube/Loom URL</Label>
                      <Input
                        id="videoUrl"
                        placeholder="https://youtube.com/watch?v=..."
                        onChange={(e) => {
                          const url = e.target.value;
                          if (url.includes('youtube.com') || url.includes('youtu.be')) {
                            const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
                            setVideoUrl(`https://www.youtube.com/embed/${videoId}`);
                          } else if (url.includes('loom.com')) {
                            setVideoUrl(url.replace('share', 'embed'));
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detailed" className="mt-6 space-y-6">
            {/* Progress Indicator */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div key={step} className="flex flex-col items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm">
                        {step}
                      </div>
                      <Badge variant="outline" className="text-xs">Step {step}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Step 1 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                  Download the Expert Advisor
                </CardTitle>
                <CardDescription>
                  Get our pre-configured EA file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <Download className="h-16 w-16 text-muted-foreground" />
                </div>
                <Button size="lg" asChild className="w-full">
                  <a href="/MT5_Trade_Sync_EA.mq5" download>
                    <Download className="h-5 w-5 mr-2" />
                    Download MT5_Trade_Sync_EA.mq5
                  </a>
                </Button>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Save to an easy-to-find location
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                  Open MT5 Data Folder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-background p-4 rounded-lg border space-y-3">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Click <Badge variant="secondary">File</Badge> → <Badge variant="secondary">Open Data Folder</Badge></li>
                    <li>Open <Badge variant="secondary">MQL5</Badge> → <Badge variant="secondary">Experts</Badge></li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
                  Install the EA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-background p-4 rounded-lg border space-y-3">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Copy EA file to Experts folder</li>
                    <li>Restart MT5</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Step 4 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
                  Activate the EA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-background p-4 rounded-lg border space-y-3">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Press <kbd className="px-2 py-1 text-xs bg-muted border rounded">Ctrl+N</kbd></li>
                    <li>Drag EA onto any chart</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Step 5 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">5</div>
                  Configure API Key
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-primary/5 border-primary">
                  <AlertDescription>
                    Get your API key from{" "}
                    <a href="/integrations" className="underline font-semibold">Integrations page</a>
                  </AlertDescription>
                </Alert>
                <div className="bg-background p-4 rounded-lg border space-y-3">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Paste API key in <code className="text-xs bg-muted px-2 py-1 rounded">API_KEY</code></li>
                    <li>Enable <Badge variant="secondary">Allow Algo Trading</Badge></li>
                    <li>Click OK</li>
                  </ol>
                </div>
                <Button size="lg" asChild className="w-full">
                  <a href="/integrations">
                    <TestTube className="h-5 w-5 mr-2" />
                    Test Connection
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="font-medium text-sm">EA not appearing?</p>
                <p className="text-sm text-muted-foreground">
                  Fully restart MT5 after copying the file
                </p>
              </div>
              <div>
                <p className="font-medium text-sm">No smiley face icon?</p>
                <p className="text-sm text-muted-foreground">
                  Enable "Allow Algo Trading" in Tools → Options → Expert Advisors
                </p>
              </div>
              <div>
                <p className="font-medium text-sm">Trades not syncing?</p>
                <p className="text-sm text-muted-foreground">
                  Verify API key and test connection on Integrations page
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
