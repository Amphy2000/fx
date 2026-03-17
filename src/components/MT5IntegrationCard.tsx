import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, RefreshCw, TrendingUp, Lock, Zap, Link2, Layers3, BarChart3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MT5AccountCard } from "@/components/MT5AccountCard";

export const MT5IntegrationCard = () => {
  const navigate = useNavigate();
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [serverName, setServerName] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
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
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mt5-sync`;

  useEffect(() => {
    checkSubscription();
    fetchAccountsAndTrades();

    const channel = supabase
      .channel("mt5-account-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mt5_accounts",
        },
        () => {
          fetchAccountsAndTrades();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trades",
        },
        () => {
          fetchAccountsAndTrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const fetchAccountsAndTrades = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const [{ data: accountData, error: accountError }, { data: tradeData, error: tradeError }] = await Promise.all([
      supabase.from("mt5_accounts").select("*").eq("user_id", session.user.id).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("trades").select("id, mt5_account_id, profit_loss, result").eq("user_id", session.user.id),
    ]);

    if (!accountError && accountData) {
      setAccounts(accountData);
    }

    if (!tradeError && tradeData) {
      setTrades(tradeData);
    }
  };

  const accountSummaries = useMemo(() => {
    return accounts.map((account) => {
      const accountTrades = trades.filter((trade) => trade.mt5_account_id === account.id);
      const wins = accountTrades.filter((trade) => trade.result === "win").length;
      const totalPnL = accountTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0);

      return {
        accountId: account.id,
        trades: accountTrades.length,
        totalPnL,
        winRate: accountTrades.length ? (wins / accountTrades.length) * 100 : 0,
      };
    });
  }, [accounts, trades]);

  const overview = useMemo(() => {
    const totalTrades = accountSummaries.reduce((sum, item) => sum + item.trades, 0);
    const totalPnL = accountSummaries.reduce((sum, item) => sum + item.totalPnL, 0);
    const activeSyncs = accounts.filter((account) => account.last_sync_status === "success").length;

    return {
      totalAccounts: accounts.length,
      totalTrades,
      totalPnL,
      activeSyncs,
    };
  }, [accountSummaries, accounts]);

  const getSummaryForAccount = (accountId: string) => {
    return accountSummaries.find((summary) => summary.accountId === accountId);
  };

  const handleConnect = async () => {
    if (!accountNumber || !brokerName || !serverName || !investorPassword) {
      toast.error("Please fill in all required fields");
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

      const { error } = await supabase.from("mt5_accounts").insert({
        user_id: session.user.id,
        account_name: accountName || `${brokerName} ${accountNumber}`,
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

      toast.success("Account linked — automatic sync is being prepared.");
      setAccountName("");
      setAccountNumber("");
      setBrokerName("");
      setServerName("");
      setInvestorPassword("");
      await fetchAccountsAndTrades();
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
      toast.info("Running account sync...");

      const { data, error } = await supabase.functions.invoke("metaapi-sync", {
        body: { accountId },
      });

      if (error) throw error;

      const result = data?.results?.[0];
      if (result?.success) {
        toast.success(`Sync complete: ${result.imported || 0} imported, ${result.updated || 0} updated`);
      } else if (result?.error) {
        throw new Error(result.error);
      } else {
        toast.success("Sync completed");
      }

      await fetchAccountsAndTrades();
    } catch (error: any) {
      console.error("Manual sync error:", error);
      toast.error(error.message || "Failed to sync trades");
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      const { error } = await supabase.from("mt5_accounts").update({ is_active: false }).eq("id", accountId);
      if (error) throw error;
      toast.success("MT5 account disconnected");
      await fetchAccountsAndTrades();
    } catch (error: any) {
      console.error("Error disconnecting account:", error);
      toast.error("Failed to disconnect account");
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

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
          <CardDescription>Automatically import trades across all your prop accounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Layers3 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Multi-account overview</p>
                <p className="text-xs text-muted-foreground">Track each prop account and your combined edge in one place.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Read-only secure sync</p>
                <p className="text-xs text-muted-foreground">Use investor credentials to keep everything automatic and safe.</p>
              </div>
            </div>
          </div>

          <Alert className="bg-primary/5 border-primary/20">
            <Zap className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              Connect once, then let your trading journal update itself.
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
          Link prop accounts once
        </CardTitle>
        <CardDescription>
          Add separate MT5 logins, sync them automatically, and review both account-level and combined performance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            Use each account’s investor password for read-only syncing. This keeps the setup simple while your closed trades flow in automatically.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Connected accounts</p>
            <p className="mt-2 text-2xl font-bold">{overview.totalAccounts}</p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trades synced</p>
            <p className="mt-2 text-2xl font-bold">{overview.totalTrades}</p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Combined P/L</p>
            <p className={`mt-2 text-2xl font-bold ${overview.totalPnL >= 0 ? "text-success" : "text-destructive"}`}>
              {overview.totalPnL >= 0 ? "+" : ""}${overview.totalPnL.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="account-name">Account label</Label>
            <Input id="account-name" placeholder="e.g. FTMO Challenge 100k" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-number">MT5 account number</Label>
            <Input id="account-number" placeholder="123456789" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="broker">Broker / prop firm</Label>
            <Input id="broker" placeholder="e.g. FTMO" value={brokerName} onChange={(e) => setBrokerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="server">Server name</Label>
            <Input id="server" placeholder="e.g. FTMO-Server3" value={serverName} onChange={(e) => setServerName(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="password">Investor password</Label>
            <Input id="password" type="password" placeholder="Read-only investor password" value={investorPassword} onChange={(e) => setInvestorPassword(e.target.value)} />
            <p className="text-xs text-muted-foreground">Read-only access only — perfect for automatic performance tracking without trade execution permissions.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleConnect} disabled={loading} className="sm:flex-1">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
            Add account to auto-sync
          </Button>
          <Button variant="outline" onClick={() => navigate("/integrations/mt5-setup")} className="sm:flex-1">
            See setup guide
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}>
            Copy webhook URL
          </Button>
          {userEmailAddress ? (
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(userEmailAddress, "Email alias")}>
              Copy email alias
            </Button>
          ) : null}
        </div>

        <Separator />

        {accounts.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">Connected prop accounts</h3>
                <p className="text-sm text-muted-foreground">Each account keeps its own sync health and performance summary.</p>
              </div>
              <div className="rounded-lg border bg-muted/20 px-3 py-2 text-right">
                <p className="text-xs text-muted-foreground">Healthy syncs</p>
                <p className="font-semibold">{overview.activeSyncs}/{overview.totalAccounts}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {accounts.map((account) => (
                <MT5AccountCard
                  key={account.id}
                  account={account}
                  onSync={handleManualSync}
                  onDisconnect={handleDisconnect}
                  syncing={syncing === account.id}
                  summary={getSummaryForAccount(account.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <Alert className="bg-muted/30 border-border">
            <BarChart3 className="h-4 w-4" />
            <AlertDescription>
              Start by linking your first MT5 prop account — once connected, the dashboard will automatically show both per-account analysis and a combined overview.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
