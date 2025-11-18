import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Mail, Server, Copy, ExternalLink, Download, TrendingUp, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export const MT5IntegrationCard = () => {
  const { toast: toastHook } = useToast();
  const [accountNumber, setAccountNumber] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [serverName, setServerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    }
  });

  const user = session?.user;
  const userEmailAddress = user?.email ? `user_${user.id}@yvclpmdgrwugayrvjtqg.supabase.co` : '';

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('mt5_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAccounts(data);
    }
  };

  const handleConnect = async () => {
    if (!accountNumber || !brokerName || !serverName) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in first");
        return;
      }

      // Generate unique API key for MT5 EA
      const apiKey = `mt5_${crypto.randomUUID().replace(/-/g, '')}`;

      // Insert MT5 account
      const { data, error } = await supabase
        .from('mt5_accounts')
        .insert({
          user_id: session.user.id,
          account_number: accountNumber,
          broker_name: brokerName,
          server_name: serverName,
          account_type: 'live',
          is_active: true,
          last_sync_status: 'pending',
          api_key_encrypted: apiKey
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error("This MT5 account is already connected");
        } else {
          throw error;
        }
        return;
      }

      toast.success("MT5 account connected! Copy your API key to use in MT5 EA.");
      setAccountNumber("");
      setBrokerName("");
      setServerName("");
      await fetchAccounts();

    } catch (error: any) {
      console.error('Error connecting MT5:', error);
      toast.error(error.message || "Failed to connect MT5 account");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      // Call MT5 sync edge function
      const { data, error } = await supabase.functions.invoke('mt5-sync', {
        body: { accountId }
      });

      if (error) throw error;

      if (data?.imported > 0 || data?.updated > 0) {
        toast.success(`Synced ${data.imported} new and ${data.updated} updated trades`);
      } else {
        toast.success("Account synced - ready to receive trades");
      }
      await fetchAccounts();
    } catch (error: any) {
      console.error('Error syncing:', error);
      toast.error("Failed to sync MT5 account");
    } finally {
      setSyncing(null);
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-yellow-500" />;
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mt5-sync`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          MT5 Auto-Import
        </CardTitle>
        <CardDescription>
          Two easy ways to automatically import your trades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connect Account First */}
        <Alert>
          <AlertDescription>
            Connect your MT5 account below, then choose how to import your trades.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account">MT5 Account Number</Label>
            <Input
              id="account"
              placeholder="123456789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker">Broker Name</Label>
            <Input
              id="broker"
              placeholder="e.g., IC Markets"
              value={brokerName}
              onChange={(e) => setBrokerName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="server">Server Name</Label>
            <Input
              id="server"
              placeholder="e.g., ICMarkets-Server"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleConnect} 
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect MT5 Account
          </Button>
        </div>

        <Separator />

        {accounts.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Import Methods</h3>
            
            {/* Auto-Sync EA - Best Option */}
            <div className="space-y-3 p-4 border-2 border-primary rounded-lg bg-primary/5">
              <div className="flex items-start gap-3">
                <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      Auto-Sync (Recommended)
                      <span className="text-xs font-normal px-2 py-0.5 bg-primary text-primary-foreground rounded">Best</span>
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Trades sync automatically after each trade - one-time 5-minute setup
                    </p>
                  </div>
                  
                  {accounts.map((account) => (
                    <div key={account.id} className="space-y-3 p-3 bg-background rounded border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{account.account_number}</p>
                          <p className="text-xs text-muted-foreground">{account.broker_name}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {getSyncStatusIcon(account.last_sync_status)}
                          <span className="capitalize">{account.last_sync_status}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-medium">Quick Setup:</p>
                        <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                          <li>Download the EA file below</li>
                          <li>In MT5: File → Open Data Folder → MQL5 → Experts</li>
                          <li>Paste the EA file there and restart MT5</li>
                          <li>Drag the EA onto any chart</li>
                          <li>Copy your API Key below and paste it in the EA settings</li>
                        </ol>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="default" asChild>
                          <a href="/MT5_Trade_Sync_EA.mq5" download>
                            <Download className="h-4 w-4 mr-2" />
                            Download EA
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSync(account.id)}
                          disabled={syncing === account.id}
                        >
                          {syncing === account.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Testing
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Test Connection
                            </>
                          )}
                        </Button>
                      </div>

                      {account.api_key_encrypted && (
                        <div className="space-y-2 pt-2 border-t">
                          <Label className="text-xs font-medium">Your API Key (paste this in EA):</Label>
                          <div className="flex gap-2">
                            <Input 
                              value={account.api_key_encrypted} 
                              readOnly 
                              className="text-xs font-mono"
                            />
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => copyToClipboard(account.api_key_encrypted, 'API Key')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <Button variant="link" size="sm" asChild className="px-0">
                    <a href="/integrations/mt5-setup">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View detailed setup guide with screenshots
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            {/* Manual Upload - Fallback */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-start gap-3">
                <Download className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-sm">Manual Upload (Backup method)</h4>
                  <p className="text-sm text-muted-foreground">
                    If auto-sync doesn't work, upload your history manually
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/integrations">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Upload Trade History
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};