import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface MT5AccountCardProps {
  account: any;
  onSync: (accountId: string) => void;
  onDisconnect: (accountId: string) => void;
  syncing: boolean;
}

export const MT5AccountCard = ({ account, onSync, onDisconnect, syncing }: MT5AccountCardProps) => {
  const getStatusIcon = () => {
    switch (account.last_sync_status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (account.last_sync_status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Connected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">{account.account_name || account.account_number}</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Account</p>
            <p className="font-medium">{account.account_number}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Broker</p>
            <p className="font-medium">{account.broker_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Server</p>
            <p className="font-medium">{account.server_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium capitalize">{account.account_type || 'Live'}</p>
          </div>
        </div>

        {account.last_sync_at && (
          <div className="text-sm text-muted-foreground">
            Last synced: {format(new Date(account.last_sync_at), 'MMM dd, yyyy HH:mm')}
          </div>
        )}

        {account.sync_error && (
          <div className="text-sm text-red-500 p-2 bg-red-500/10 rounded">
            {account.sync_error}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => onSync(account.id)}
            disabled={syncing}
            className="flex-1"
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
          <Button
            onClick={() => onDisconnect(account.id)}
            variant="outline"
            size="icon"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
