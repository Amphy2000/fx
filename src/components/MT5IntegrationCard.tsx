import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Mail, Server, Copy, ExternalLink, Download, TrendingUp, AlertTriangle, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export const MT5IntegrationCard = () => {
  const { toast: toastHook } = useToast();
  const [accountNumber, setAccountNumber] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [serverName, setServerName] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
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
    
    // Listen for account sync updates via realtime
    const channel = supabase
      .channel('mt5-account-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mt5_accounts'
        },
        (payload) => {
          const updated = payload.new as any;
          
          // Check if this is a first sync (status changed from pending to success with last_sync_at)
          if (updated.last_sync_status === 'success' && updated.last_sync_at) {
            const oldAccount = accounts.find(acc => acc.id === updated.id);
            
            // If old account didn't have last_sync_at, this is first sync
            if (oldAccount && !oldAccount.last_sync_at) {
              toast.success(
                `🎉 MT5 Account Connected!`,
                {
                  description: `${updated.account_number} is now syncing automatically. Check your email for details!`,
                  duration: 6000,
                }
              );
            }
          }
          
          // Refresh accounts list
          fetchAccounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accounts]);

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
    if (!accountNumber || !brokerName || !serverName || !investorPassword) {
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

      // Insert MT5 account with investor password
      const { data, error } = await supabase
        .from('mt5_accounts')
        .insert({
          user_id: session.user.id,
          account_number: accountNumber,
          broker_name: brokerName,
          server_name: serverName,
          account_type: 'live',
          is_active: true,
          auto_sync_enabled: true,
          last_sync_status: 'pending',
          api_secret_encrypted: investorPassword // Store investor password
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

      toast.success("MT5 account connected! Syncing will start automatically every 15 minutes.");
      setAccountNumber("");
      setBrokerName("");
      setServerName("");
      setInvestorPassword("");
      await fetchAccounts();

    } catch (error: any) {
      console.error('Error connecting MT5:', error);
      toast.error(error.message || "Failed to connect MT5 account");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) {
        toast.error("Account not found");
        return;
      }

      toast.info("Starting manual sync...");

      // Call the mt5-sync function directly
      const { data, error } = await supabase.functions.invoke('mt5-sync', {
        body: {
          accountId: accountId,
          trades: [] // Empty trades array to trigger a sync check
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(
          `Sync completed! ${data.imported || 0} trades imported, ${data.updated || 0} updated`
        );
        await fetchAccounts();
      } else {
        toast.warning("Sync completed but no new trades found");
      }
    } catch (error: any) {
      console.error('Manual sync error:', error);
      toast.error(error.message || "Failed to sync trades");
    } finally {
      setSyncing(null);
    }
  };

  const getSyncStatusIcon = (status: string, lastSyncAt: string | null) => {
    // Only show success if there was an actual sync
    if (status === 'success' && lastSyncAt) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    } else if (status === 'error') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <RefreshCw className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getSyncStatusText = (status: string, lastSyncAt: string | null) => {
    if (status === 'success' && lastSyncAt) {
      return 'Connected';
    } else if (status === 'error') {
      return 'Error';
    } else {
      return 'Waiting for EA';
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm("Are you sure you want to delete this MT5 account? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('mt5_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast.success("MT5 account deleted successfully");
      await fetchAccounts();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error("Failed to delete MT5 account");
    }
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

          <div className="space-y-2">
            <Label htmlFor="password">Investor Password (Read-Only)</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your MT5 investor password"
              value={investorPassword}
              onChange={(e) => setInvestorPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              We only need read-only access to sync your trades. Your investor password is encrypted and secure.
            </p>
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
            <h3 className="font-semibold">Connected Accounts</h3>
            
            <div className="space-y-3">
              <Alert className="bg-primary/5 border-primary/20">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <p className="text-sm font-medium">Automatic Cloud Sync Active</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your trades sync automatically every 15 minutes via MetaAPI cloud service. 
                    No software installation needed on your computer.
                  </p>
                </AlertDescription>
              </Alert>
                  
              {accounts.map((account) => (
                <Card key={account.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-medium">{account.account_number}</p>
                      <p className="text-sm text-muted-foreground">{account.broker_name} - {account.server_name}</p>
                      {account.last_sync_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last sync: {new Date(account.last_sync_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        {getSyncStatusIcon(account.last_sync_status, account.last_sync_at)}
                        <span>{getSyncStatusText(account.last_sync_status, account.last_sync_at)}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(account.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {!account.last_sync_at && (
                    <Alert className="bg-yellow-500/10 border-yellow-500/20">
                      <RefreshCw className="h-4 w-4 text-yellow-500" />
                      <AlertDescription className="text-xs text-yellow-700 dark:text-yellow-400">
                        <strong>First sync in progress...</strong>
                        <p className="mt-1">Your account is being connected to MetaAPI. First sync may take up to 15 minutes.</p>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {account.last_sync_at && account.last_sync_status === 'success' && (
                    <Alert className="bg-green-500/10 border-green-500/20">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-xs text-green-700 dark:text-green-400">
                        <strong>Syncing Successfully!</strong> Your trades are automatically imported every 15 minutes.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {account.sync_error && (
                    <Alert className="bg-red-500/10 border-red-500/20 mt-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <AlertDescription className="text-xs text-red-700 dark:text-red-400">
                        <strong>Sync Error:</strong> {account.sync_error}
                      </AlertDescription>
                    </Alert>
                  )}
                </Card>
              ))}
                      
                        <div className="space-y-3">
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                            <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400 mb-2">⚠️ CRITICAL STEP - Must do first or EA won't work:</p>
                            <ol className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1 list-decimal list-inside ml-2">
                              <li>In MT5: <strong>Tools → Options → Expert Advisors</strong></li>
                              <li>✅ Check "<strong>Allow WebRequest for listed URL</strong>"</li>
                              <li>Click <strong>Add</strong> and paste: <code className="bg-yellow-500/20 px-1 py-0.5 rounded text-[10px] font-mono">https://yvclpmdgrwugayrvjtqg.supabase.co</code></li>
                              <li>Click <strong>OK</strong> and <strong>restart MT5</strong></li>
                            </ol>
                          </div>
                          
                          <p className="text-xs font-medium">Setup Steps:</p>
                          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                            <li>Download the EA file below</li>
                            <li>In MT5: <strong>File → Open Data Folder → MQL5 → Experts</strong></li>
                            <li>Paste the EA file there and <strong>restart MT5</strong></li>
                            <li>Drag the EA onto any chart</li>
                            <li>Paste both <strong>Webhook URL</strong> and <strong>API Key</strong> from below</li>
                            <li>✅ Check "<strong>Allow Algo Trading</strong>" and click OK</li>
                            <li>Check MT5 <strong>Experts tab</strong> (bottom) for "✓ Successfully sent" message</li>
                          </ol>
                        </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="default" asChild>
                          <a href="/MT5_Trade_Sync_EA.mq5" download>
                            <Download className="h-4 w-4 mr-2" />
                            Download EA
                          </a>
                        </Button>
                      </div>
                      
                      <Alert className="bg-muted/30">
                        <AlertDescription className="text-xs">
                          Once you've installed the EA in MT5 and added both the Webhook URL and API Key, the EA will automatically start syncing trades. The status above will change to "Connected" after the first successful sync.
                        </AlertDescription>
                      </Alert>

                      {account.api_key_encrypted && (
                        <div className="space-y-3 pt-2 border-t">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Webhook URL (paste this in EA):</Label>
                            <div className="flex gap-2">
                              <Input 
                                value={`https://yvclpmdgrwugayrvjtqg.supabase.co/functions/v1/mt5-sync`}
                                readOnly 
                                className="text-xs font-mono"
                              />
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => copyToClipboard(`https://yvclpmdgrwugayrvjtqg.supabase.co/functions/v1/mt5-sync`, 'Webhook URL')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">API Key (paste this in EA):</Label>
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