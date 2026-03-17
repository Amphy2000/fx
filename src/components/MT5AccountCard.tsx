import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, CheckCircle, AlertCircle, Clock, BarChart3 } from "lucide-react";
import { format } from "date-fns";

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
  const accountLabel = account.account_name || account.account_number;

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
        </div>

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
      </CardContent>
    </Card>
  );
};
