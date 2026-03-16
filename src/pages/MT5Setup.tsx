import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Settings, CheckCircle, TestTube, Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MT5SetupWizard } from "@/components/MT5SetupWizard";
import { supabase } from "@/integrations/supabase/client";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { Skeleton } from "@/components/ui/skeleton";

export default function MT5Setup() {
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
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">MT5 setup</h1>
          <p className="text-muted-foreground">One focused job: get your trades syncing automatically so the journal becomes effortless to keep using.</p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>First:</strong> connect your account on the <a href="/integrations" className="underline font-semibold">MT5 Auto-Sync page</a>, then finish the terminal setup here.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="wizard" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wizard" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Fast setup
            </TabsTrigger>
            <TabsTrigger value="detailed" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Detailed steps
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wizard" className="mt-6">
            <MT5SetupWizard />
          </TabsContent>

          <TabsContent value="detailed" className="mt-6 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-3 overflow-x-auto">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div key={step} className="flex flex-col items-center gap-2 min-w-[72px]">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm">{step}</div>
                      <Badge variant="outline" className="text-xs">Step {step}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>Download the EA</CardTitle>
                <CardDescription>Use the pre-configured file for the fastest path.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" asChild className="w-full">
                  <a href="/MT5_Trade_Sync_EA.mq5" download>
                    <Download className="h-5 w-5 mr-2" />
                    Download MT5_Trade_Sync_EA.mq5
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>Install it in MT5</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Open <strong>File → Open Data Folder</strong>, then go to <strong>MQL5 → Experts</strong>.</p>
                <p>Copy the EA file there and fully restart MT5.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>Activate it on a chart</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Press <kbd className="px-2 py-1 text-xs bg-muted border rounded">Ctrl+N</kbd>, find the EA under Expert Advisors, and drag it onto any chart.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>Add your API key</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Grab your key from the <a href="/integrations" className="underline font-semibold">MT5 Auto-Sync page</a>, paste it into the EA inputs, enable <strong>Allow Algo Trading</strong>, then click OK.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">5</div>Let it run</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Once the connection is healthy, trades should start appearing automatically without manual uploads.</p>
                <Button size="lg" asChild className="w-full">
                  <a href="/integrations">
                    <TestTube className="h-5 w-5 mr-2" />
                    Back to MT5 Auto-Sync
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong>EA not visible?</strong> Restart MT5 completely after copying the file.</p>
            <p><strong>No smiley face?</strong> Enable algo trading in MT5 settings.</p>
            <p><strong>Still not syncing?</strong> Recheck server name, investor password, and API key.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
