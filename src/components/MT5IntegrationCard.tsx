import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, RefreshCw, TrendingUp, Trash2, Lock, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export const MT5IntegrationCard = () => {
  const { toast: toastHook } = useToast();
  const navigate = useNavigate();
  const [accountNumber, setAccountNumber] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [serverName, setServerName] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [isPaidUser, setIsPaidUser] = useState<boolean | null>(null);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
  });

  const user = session?.user;
  const userEmailAddress = user?.email ? `user_${user.id}@yvclpmdgrwugayrvjtqg.supabase.co` : "";

  useEffect(() => {
    checkSubscription();
    fetchAccounts();

    const channel = supabase
      .channel("mt5-account-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mt5_accounts",
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.last_sync_status === "success" && updated.last_sync_at) {
            const oldAccount = accounts.find((acc) => acc.id === updated.id);
            if (oldAccount && !oldAccount.last_sync_at) {
              toast.success("🎉 MT5 account connected", {
                description: `${updated.account_number} is now syncing automatically.`,
                duration: 6000,
              });
            }
          }
          fetchAccounts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accounts]);

  const checkSubscription = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsPaidUser(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();

      setIsPaidUser(profile?.subscription_tier !== "free");
    } catch (error) {
      console.error("Error checking subscription:", error);
      setIsPaidUser(false);
    }
  };

  const fetchAccounts = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("mt5_accounts")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in first");
        return;
      }

      const { error } = await supabase
        .from("mt5_accounts")
        .insert({
          user_id: session.user.id,
          account_number: accountNumber,
          broker_name: brokerName,
          server_name: serverName,
          account_type: "live",
          is_active: true,
          auto_sync_enabled: true,
          last_sync_status: "pending",
          api_secret_encrypted: investorPassword,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("This MT5 account is already connected");
        } else {
          throw error;
        }
        return;
      }

      toast.success("MT5 account connected. Syncing will start automatically.");
      setAccountNumber("");
      setBrokerName("");
      setServerName("");
      setInvestorPassword("");
      await fetchAccounts();
    } catch (error: any) {
      console.error("Error connecting MT5:", error);
      toast.error(error.message || "Failed to connect MT5 account");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      const account = accounts.find((acc) => acc.id === accountId);
      if (!account) {
        toast.error("Account not found");
        return;
      }

      toast.info("Starting manual sync...");

      const { data, error } = await supabase.functions.invoke("mt5-sync", {
        body: {
          accountId,
          trades: [],
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Sync completed! ${data.imported || 0} trades imported, ${data.updated || 0} updated`);
        await fetchAccounts();
      } else {
        toast.warning("Sync completed but no new trades found");
      }
    } catch (error: any) {
      console.error("Manual sync error:", error);
      toast.error(error.message || "Failed to sync trades");
    } finally {
      setSyncing(null);
    }
  };

  const getSyncStatusIcon = (status: string, lastSyncAt: string | null) => {
    if (status === "success" && lastSyncAt) {
      return <CheckCircle2 className="h-4 w-4 text-primary" />;
    }
    if (status === "error") {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
  };

  const getSyncStatusText = (status: string, lastSyncAt: string | null) => {
    if (status === "success" && lastSyncAt) return "Connected";
    if (status === "error") return "Error";
    return "Provisioning";
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
      const { error } = await supabase.from("mt5_accounts").delete().eq("id", accountId);
      if (error) throw error;
      toast.success("MT5 account deleted successfully");
      await fetchAccounts();
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete MT5 account");
    }
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mt5-sync`;

  if (isPaidUser === null) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isPaidUser) {
    return (
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            MT5 Auto-Sync - Premium Feature
          </CardTitle>
          <CardDescription>
            Automatically import your trades with zero manual effort.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Zero Manual Entry</p>
                <p className="text-xs text-muted-foreground">Every trade is logged automatically.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Accurate history</p>
                <p className="text-xs text-muted-foreground">Direct MT5 connection keeps your journal clean.</p>
              </div>
            </div>
          </div>

          <Alert className="bg-primary/5 border-primary/20">
            <Zap className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              Set it up once and let automation do the repetitive work for you.
            </AlertDescription>
          </Alert>

          <Button onClick={() => navigate("/pricing")} className="w-full" size="lg">
            <Lock className="h-4 w-4 mr-2" />
            Upgrade to unlock MT5 Auto-Sync
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Connect MT5 once
        </CardTitle>
        <CardDescription>
          This is the highest-leverage setup in the app: automate trade capture first, then build habits on top of it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            Use your MT5 investor password for read-only syncing. After connection, your closed trades import automatically in the background.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="account">MT5 Account Number</Label>
            <Input id="account" placeholder="123456789" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="broker">Broker Name</Label>
            <Input id="broker" placeholder="e.g., IC Markets" value={brokerName} onChange={(e) => setBrokerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="server">Server Name</Label>
            <Input id="server" placeholder="e.g., ICMarkets-Server" value={serverName} onChange={(e) => setServerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Investor Password</Label>
            <Input id="password" type="password" placeholder="Read-only investor password" value={investorPassword} onChange={(e) => setInvestorPassword(e.target.value)} />
            <p className="text-xs text-muted-foreground">Read-only access only. Used to fetch your trade history securely.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleConnect} disabled={loading} className="sm:flex-1">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start auto-sync
          </Button>
          <Button variant="outline" onClick={() => navigate("/integrations/mt5-setup")} className="sm:flex-1">
            See setup guide
          </Button>
        </div>

        <Separator />

        {accounts.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Connected MT5 accounts</h3>

            <Alert className="bg-primary/5 border-primary/20">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>
                <p className="text-sm font-medium">Automation is active</p>
                <p className="text-xs text-muted-foreground mt-1">Keep this page lean: connection status, sync health, and nothing extra.</p>
              </AlertDescription>
            </Alert>

            {accounts.map((account) => (
              <Card key={account.id} className="p-4">
                <div className="flex items-center justify-between mb-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{account.account_number}</p>
                    <p className="text-sm text-muted-foreground">{account.broker_name} - {account.server_name}</p>
                    {account.last_sync_at && <p className="text-xs text-muted-foreground mt-1">Last sync: {new Date(account.last_sync_at).toLocaleString()}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      {getSyncStatusIcon(account.last_sync_status, account.last_sync_at)}
                      <span>{getSyncStatusText(account.last_sync_status, account.last_sync_at)}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(account.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleManualSync(account.id)} disabled={syncing === account.id}>
                    {syncing === account.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}<span className="ml-2">Sync now</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}>Copy webhook URL</Button>
                  {userEmailAddress ? <Button size="sm" variant="outline" onClick={() => copyToClipboard(userEmailAddress, "Email alias")}>Copy email alias</Button> : null}
                </div>

                {!account.last_sync_at && (
                  <Alert className="bg-muted/30 border-border mt-3">
                    <RefreshCw className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-xs text-muted-foreground">
                      <strong>First sync in progress.</strong>
                      <p className="mt-1">Initial connection can take a few minutes while the account is provisioned.</p>
                    </AlertDescription>
                  </Alert>
                )}

                {account.last_sync_at && account.last_sync_status === "success" && (
                  <Alert className="bg-primary/5 border-primary/20 mt-3">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-xs text-muted-foreground">
                      <strong>Healthy sync.</strong> Closed trades are flowing in automatically.
                    </AlertDescription>
                  </Alert>
                )}

                {account.sync_error && (
                  <Alert className="bg-destructive/10 border-destructive/20 mt-3">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-xs text-destructive">
                      <strong>Sync error:</strong> {account.sync_error}
                    </AlertDescription>
                  </Alert>
                )}
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
