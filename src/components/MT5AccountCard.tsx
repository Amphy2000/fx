import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, CheckCircle, AlertCircle, Clock, BarChart3, Key, Copy, Play } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AccountSummary {
  trades: number;
  totalPnL: number;
  winRate: number;
}

interface MT5AccountCardProps {
  account: any;
  onSync: (accountId: string) => void;
  onDisconnect: (accountId: string) => void;
  syncing: boolean;
  summary?: AccountSummary;
}

export const MT5AccountCard = ({ account, onSync, onDisconnect, syncing, summary }: MT5AccountCardProps) => {
  const [apiKey, setApiKey] = useState(account.api_key_encrypted);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const accountLabel = account.account_name || account.account_number;

  const handleGenerateKey = async () => {
    setGeneratingKey(true);
    try {
      const newKey = crypto.randomUUID();
      const { error } = await supabase
        .from("mt5_accounts")
        .update({ api_key_encrypted: newKey })
        .eq("id", account.id);

      if (error) throw error;
      setApiKey(newKey);
      toast.success("API key generated successfully!");
    } catch (error: any) {
      console.error("Error generating API key:", error);
      toast.error("Failed to generate API key");
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleSimulateTrades = async () => {
    setSimulating(true);
    try {
      toast.info("Simulating demo trades...");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in first");
        return;
      }

      const now = new Date();
      const openTime1 = new Date(now.getTime() - 60 * 60 * 1000);
      const closeTime1 = new Date(now.getTime() - 45 * 60 * 1000);
      const openTime2 = new Date(now.getTime() - 40 * 60 * 1000);
      const closeTime2 = new Date(now.getTime() - 35 * 60 * 1000);
      const openTime3 = new Date(now.getTime() - 33 * 60 * 1000);
      const closeTime3 = new Date(now.getTime() - 20 * 60 * 1000);
      const openTime4 = new Date(now.getTime() - 15 * 60 * 1000);
      const closeTime4 = new Date(now.getTime() - 5 * 60 * 1000);

      const mockTrades = [
        {
          ticket: Math.floor(1000000 + Math.random() * 9000000),
          symbol: "EURUSD",
          direction: "buy",
          volume: 0.1,
          entryPrice: 1.08500,
          exitPrice: 1.08750,
          stopLoss: 1.08300,
          takeProfit: 1.08900,
          profit: 250.00,
          commission: -1.50,
          swap: 0.00,
          openTime: openTime1.toISOString(),
          closeTime: closeTime1.toISOString(),
          comment: "Standard Breakout Setup"
        },
        {
          ticket: Math.floor(1000000 + Math.random() * 9000000),
          symbol: "GBPUSD",
          direction: "sell",
          volume: 0.1,
          entryPrice: 1.27200,
          exitPrice: 1.27400,
          stopLoss: 1.27100,
          takeProfit: 1.27500,
          profit: -200.00,
          commission: -1.50,
          swap: 0.00,
          openTime: openTime2.toISOString(),
          closeTime: closeTime2.toISOString(),
          comment: "Support bounce fail"
        },
        {
          ticket: Math.floor(1000000 + Math.random() * 9000000),
          symbol: "GBPUSD",
          direction: "buy",
          volume: 0.1,
          entryPrice: 1.27420,
          exitPrice: 1.27300,
          stopLoss: 1.27500,
          takeProfit: 1.27100,
          profit: -120.00,
          commission: -1.50,
          swap: 0.00,
          openTime: openTime3.toISOString(),
          closeTime: closeTime3.toISOString(),
          comment: "Quick correction attempt"
        },
        {
          ticket: Math.floor(1000000 + Math.random() * 9000000),
          symbol: "EURUSD",
          direction: "buy",
          volume: 2.0,
          entryPrice: 1.08700,
          exitPrice: 1.08500,
          stopLoss: 1.08800,
          takeProfit: 1.08400,
          profit: -400.00,
          commission: -30.00,
          swap: 0.00,
          openTime: openTime4.toISOString(),
          closeTime: closeTime4.toISOString(),
          comment: "Scale in breakout"
        }
      ];

      const { data, error } = await supabase.functions.invoke("mt5-sync", {
        body: {
          accountId: account.id,
          trades: mockTrades
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Demo Simulation Complete! ${data.imported || 0} trades imported.`, {
          description: "Check your Dashboard to see the AI tags and drawdown protectors in action!"
        });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error(data?.error || "Failed to import simulated trades");
      }
    } catch (err: any) {
      console.error("Simulation error:", err);
      toast.error(err.message || "Failed to run simulation");
    } finally {
      setSimulating(false);
    }
  };

  const getStatusIcon = () => {
    switch (account.last_sync_status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (account.last_sync_status) {
      case "success":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Auto-sync live</Badge>;
      case "error":
        return <Badge variant="destructive">Needs attention</Badge>;
      default:
        return <Badge variant="secondary">Connecting</Badge>;
    }
  };

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <CardTitle className="text-lg truncate">{accountLabel}</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {account.broker_name} • {account.server_name}
            </p>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Account Number</p>
            <p className="font-medium truncate">{account.account_number}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="font-medium capitalize">{account.account_type || "Live"}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Trades Synced</p>
            <p className="font-semibold">{summary?.trades ?? 0}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="font-semibold">{summary ? `${summary.winRate.toFixed(1)}%` : "0.0%"}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Performance
            </div>
            <p className={`text-lg font-bold ${summary && summary.totalPnL >= 0 ? "text-success" : "text-destructive"}`}>
              {summary ? `${summary.totalPnL >= 0 ? "+" : ""}$${summary.totalPnL.toFixed(2)}` : "$0.00"}
            </p>
        </div>

        {apiKey ? (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Key className="h-3 w-3" />
              EA API Key
            </div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono select-all truncate bg-background px-1.5 py-0.5 rounded border">{apiKey}</code>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => {
                navigator.clipboard.writeText(apiKey);
                toast.success("API key copied to clipboard");
              }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Key className="h-3 w-3" />
              No API Key generated
            </div>
            <Button size="sm" onClick={handleGenerateKey} disabled={generatingKey}>
              {generatingKey ? "Generating..." : "Generate Key"}
            </Button>
          </div>
        )}

        {account.last_sync_at && (
          <div className="text-sm text-muted-foreground">
            Last synced: {format(new Date(account.last_sync_at), "MMM dd, yyyy HH:mm")}
          </div>
        )}

        {account.sync_error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {account.sync_error}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <div className="flex gap-2">
            <Button onClick={() => onSync(account.id)} disabled={syncing} className="flex-1">
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync now
                </>
              )}
            </Button>
            <Button onClick={() => onDisconnect(account.id)} variant="outline" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <Button onClick={handleSimulateTrades} disabled={simulating} variant="outline" className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/5">
            {simulating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Simulate Demo Trades
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
