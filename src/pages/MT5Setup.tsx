import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const MT5Setup = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">MT5 Expert Advisor Setup Guide</h1>
          <p className="text-muted-foreground">
            Follow this step-by-step guide to connect your MT5 terminal and automatically sync your trades
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Make sure you've already connected your MT5 account in the{" "}
            <a href="/integrations" className="underline">Integrations page</a> to get your Webhook URL and API Key.
          </AlertDescription>
        </Alert>

        {/* Step 1: Download EA */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Step 1</Badge>
              <CardTitle>Download the Expert Advisor</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              First, download the MT5 Expert Advisor file that will handle the automatic trade synchronization.
            </p>
            <Button asChild>
              <a href="/MT5_Trade_Sync_EA.mq5" download>
                <Download className="h-4 w-4 mr-2" />
                Download MT5_Trade_Sync_EA.mq5
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Install EA */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Step 2</Badge>
              <CardTitle>Install the EA in MT5</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Open MetaTrader 5</p>
                  <p className="text-sm text-muted-foreground">Launch your MT5 terminal</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Open Data Folder</p>
                  <p className="text-sm text-muted-foreground">
                    Click <strong>File → Open Data Folder</strong> in the top menu
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Navigate to Experts Folder</p>
                  <p className="text-sm text-muted-foreground">
                    Go to <strong>MQL5 → Experts</strong> folder
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Copy the EA File</p>
                  <p className="text-sm text-muted-foreground">
                    Copy the downloaded <code className="text-xs bg-muted px-1 py-0.5 rounded">MT5_Trade_Sync_EA.mq5</code> file into this Experts folder
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Restart MT5</p>
                  <p className="text-sm text-muted-foreground">
                    Close and reopen MetaTrader 5 to load the new EA
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Verify Installation</p>
                  <p className="text-sm text-muted-foreground">
                    In the <strong>Navigator</strong> panel, expand <strong>Expert Advisors</strong> - you should see "MT5_Trade_Sync_EA"
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Enable Auto Trading */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Step 3</Badge>
              <CardTitle>Enable Automated Trading</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Enable AutoTrading</p>
                  <p className="text-sm text-muted-foreground">
                    Click <strong>Tools → Options</strong> (or press <code className="text-xs bg-muted px-1 py-0.5 rounded">Ctrl+O</code>)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Expert Advisors Tab</p>
                  <p className="text-sm text-muted-foreground">
                    Go to the <strong>Expert Advisors</strong> tab
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Enable Required Options</p>
                  <p className="text-sm text-muted-foreground mb-2">Check these boxes:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-4">
                    <li>Allow automated trading</li>
                    <li>Allow WebRequest for listed URL</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Add Webhook URL to Allowed List</p>
                  <p className="text-sm text-muted-foreground">
                    In the URL field, paste your Supabase project URL (e.g., <code className="text-xs bg-muted px-1 py-0.5 rounded">https://yourproject.supabase.co</code>)
                  </p>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Important:</strong> Without adding the URL to the allowed list, the EA won't be able to send data to your webhook.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Configure EA */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Step 4</Badge>
              <CardTitle>Configure the Expert Advisor</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Attach EA to Chart</p>
                  <p className="text-sm text-muted-foreground">
                    Drag "MT5_Trade_Sync_EA" from the Navigator onto any chart
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Open Settings Dialog</p>
                  <p className="text-sm text-muted-foreground">
                    A settings dialog will appear. Go to the <strong>Inputs</strong> tab
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Enter Webhook Configuration</p>
                  <div className="text-sm text-muted-foreground space-y-2 mt-1">
                    <p>You'll need to configure these parameters:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong>WebhookURL:</strong> Your full webhook URL (from Integrations page)</li>
                      <li><strong>APIKey:</strong> Your unique API key (from Integrations page)</li>
                      <li><strong>CheckIntervalSeconds:</strong> How often to check for new trades (default: 30)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  Get your Webhook URL and API Key from the <a href="/integrations" className="underline">Integrations page</a>. 
                  Each MT5 account has a unique API key for security.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Enable Automated Trading</p>
                  <p className="text-sm text-muted-foreground">
                    Make sure the "Allow algo trading" checkbox is checked on the <strong>Common</strong> tab
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Click OK</p>
                  <p className="text-sm text-muted-foreground">
                    The EA will now start running and you'll see a smiley face icon in the top-right corner of the chart
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 5: Verify */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Step 5</Badge>
              <CardTitle>Verify It's Working</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Check Expert Tab</p>
                  <p className="text-sm text-muted-foreground">
                    Open the <strong>Toolbox</strong> panel (View → Toolbox) and click the <strong>Experts</strong> tab. 
                    You should see initialization messages from the EA.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Close a Trade</p>
                  <p className="text-sm text-muted-foreground">
                    Close an existing trade or wait for a new trade to close. The EA will automatically detect it.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Check Your Dashboard</p>
                  <p className="text-sm text-muted-foreground">
                    Within {30} seconds, the trade should appear in your <a href="/dashboard" className="underline">Dashboard</a>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Check Integration Status</p>
                  <p className="text-sm text-muted-foreground">
                    Go to the <a href="/integrations" className="underline">Integrations page</a> to see the last sync time and status
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
            <CardDescription>Common issues and solutions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <p className="font-medium mb-1">❌ EA shows "Invalid API key" error</p>
                <p className="text-sm text-muted-foreground">
                  Make sure you copied the API key correctly from the Integrations page. The key is case-sensitive.
                </p>
              </div>

              <div>
                <p className="font-medium mb-1">❌ No trades appearing in dashboard</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-4">
                  <li>Check that the EA is running (smiley face icon should be visible)</li>
                  <li>Verify WebRequest URL is added to allowed list in MT5 options</li>
                  <li>Check the Experts tab for error messages</li>
                  <li>Make sure at least one trade has closed since EA was started</li>
                </ul>
              </div>

              <div>
                <p className="font-medium mb-1">❌ EA initialization failed</p>
                <p className="text-sm text-muted-foreground">
                  This usually means you didn't configure the Webhook URL and API Key. Right-click the chart, 
                  select <strong>Expert Advisors → Properties</strong>, and enter your configuration.
                </p>
              </div>

              <div>
                <p className="font-medium mb-1">❌ "WebRequest not allowed" error</p>
                <p className="text-sm text-muted-foreground">
                  You need to add your Supabase URL to the allowed URLs list in Tools → Options → Expert Advisors.
                </p>
              </div>

              <div>
                <p className="font-medium mb-1">❌ EA stopped working after MT5 restart</p>
                <p className="text-sm text-muted-foreground">
                  Make sure "Allow automated trading" is enabled in Tools → Options → Expert Advisors, 
                  and the AutoTrading button in the toolbar is active (green).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              The Expert Advisor monitors your MT5 account for closed trades every {30} seconds (configurable). 
              When it detects new closed positions:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Collects trade details (symbol, entry/exit prices, profit/loss, etc.)</li>
              <li>Packages the data as JSON</li>
              <li>Sends it securely to your webhook endpoint using your API key</li>
              <li>Our backend processes the trade and stores it in your journal</li>
              <li>The trade appears in your dashboard and is available for AI analysis</li>
            </ol>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              If you're still having issues after following this guide:
            </p>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <a href="/integrations">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Integration Status
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/feedback">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Contact Support
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MT5Setup;
