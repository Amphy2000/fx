import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const MT5IntegrationCard = () => {
  const [accountNumber, setAccountNumber] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [serverName, setServerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);

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
          last_sync_status: 'pending'
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

      toast.success("MT5 account connected successfully!");
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

      toast.success("Sync initiated successfully");
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>MT5 Integration</CardTitle>
        <CardDescription>
          Connect your MT5 account to automatically sync trades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            One MT5 account per user. Your account number must be unique.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account">Account Number</Label>
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

        {accounts.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-semibold">Connected Accounts</h4>
            {accounts.map((account) => (
              <Card key={account.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{account.account_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {account.broker_name} • {account.server_name}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      {getSyncStatusIcon(account.last_sync_status)}
                      <span className="capitalize">{account.last_sync_status}</span>
                      {account.sync_error && (
                        <span className="text-red-500">• {account.sync_error}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSync(account.id)}
                    disabled={syncing === account.id}
                  >
                    {syncing === account.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};