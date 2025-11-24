import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Behavior {
  id: string;
  behavior_type: string;
  detected_at: string;
  severity: 'low' | 'medium' | 'high';
  ai_recommendation: string;
  is_resolved: boolean;
}

export const BehavioralAlerts = () => {
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadBehaviors();
    // Set up realtime subscription
    const channel = supabase
      .channel('behaviors')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trading_behaviors'
      }, () => {
        loadBehaviors();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadBehaviors = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_behaviors')
        .select('*')
        .eq('is_resolved', false)
        .order('detected_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setBehaviors((data || []) as Behavior[]);
    } catch (error) {
      console.error('Error loading behaviors:', error);
    } finally {
      setLoading(false);
    }
  };

  const scanBehaviors = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-behavior');
      if (error) throw error;
      await loadBehaviors();
    } catch (error) {
      console.error('Error scanning behaviors:', error);
    } finally {
      setScanning(false);
    }
  };

  const resolveBehavior = async (id: string) => {
    try {
      const { error } = await supabase
        .from('trading_behaviors')
        .update({ is_resolved: true })
        .eq('id', id);

      if (error) throw error;
      await loadBehaviors();
    } catch (error) {
      console.error('Error resolving behavior:', error);
    }
  };

  const getBehaviorLabel = (type: string) => {
    const labels: Record<string, string> = {
      'revenge_trading': '⚠️ Revenge Trading',
      'overtrading': '📈 Overtrading',
      'lot_size_escalation': '💰 Lot Size Escalation',
      'fomo': '😰 FOMO Trading'
    };
    return labels[type] || type;
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return 'destructive';
    if (severity === 'medium') return 'default';
    return 'secondary';
  };

  if (loading) {
    return null;
  }

  if (behaviors.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Behavioral Alerts</h3>
          </div>
          <Button onClick={scanBehaviors} disabled={scanning} size="sm">
            {scanning ? 'Scanning...' : 'Scan Now'}
          </Button>
        </div>
        
        <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">No behavioral issues detected</p>
              <p className="text-sm text-green-700 dark:text-green-300">You're trading with discipline! Keep it up.</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold">Behavioral Alerts</h3>
        </div>
        <Button onClick={scanBehaviors} disabled={scanning} size="sm" variant="outline">
          {scanning ? 'Scanning...' : 'Scan Again'}
        </Button>
      </div>

      {behaviors.map((behavior) => (
        <Card key={behavior.id} className="p-4 border-l-4 border-l-orange-500">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="font-medium">{getBehaviorLabel(behavior.behavior_type)}</span>
                <Badge variant={getSeverityColor(behavior.severity)}>
                  {behavior.severity}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {behavior.ai_recommendation}
              </p>

              <div className="text-xs text-muted-foreground">
                Detected: {new Date(behavior.detected_at).toLocaleString()}
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => resolveBehavior(behavior.id)}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
