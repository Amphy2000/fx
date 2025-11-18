import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle, XCircle, Clock, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SyncLog {
  id: string;
  mt5_account_id: string;
  sync_type: string;
  status: string;
  trades_imported: number;
  trades_updated: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  mt5_accounts?: {
    account_number: string;
    broker_name: string;
  };
}

export const MT5SyncLogs = () => {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('sync_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_logs'
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("sync_logs")
        .select(`
          *,
          mt5_accounts!inner(account_number, broker_name)
        `)
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching sync logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "started":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
            <Activity className="w-3 h-3 mr-1 animate-pulse" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20">
            <Clock className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Sync History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Sync History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No sync history yet</p>
            <p className="text-sm mt-1">Sync attempts will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(log.status)}
                        <Badge variant="secondary" className="text-xs">
                          {log.sync_type}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {log.mt5_accounts?.broker_name} - {log.mt5_accounts?.account_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                      </p>
                    </div>
                    {log.status === "completed" && (
                      <div className="text-right text-sm">
                        <div className="text-green-600 dark:text-green-400 font-medium">
                          +{log.trades_imported} imported
                        </div>
                        {log.trades_updated > 0 && (
                          <div className="text-blue-600 dark:text-blue-400 text-xs">
                            {log.trades_updated} updated
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {log.duration_ms && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Duration: {formatDuration(log.duration_ms)}
                      </span>
                    </div>
                  )}

                  {log.error_message && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                      <p className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">
                        Error:
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 font-mono">
                        {log.error_message}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
