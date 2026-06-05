import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Target, ShieldAlert, TrendingUp, TrendingDown, Clock } from "lucide-react";

interface BotSignal {
  id: string;
  symbol: string;
  direction: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  ob_zone: string;
  status: string;
  created_at: string;
}

export const BotSignals = () => {
  const [signals, setSignals] = useState<BotSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSignals();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('public:bot_signals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bot_signals' }, () => {
        fetchSignals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSignals = async () => {
    const { data, error } = await supabase
      .from('bot_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setSignals(data);
    }
    setLoading(false);
  };

  if (loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="text-xl font-black italic tracking-tight">SMC AI Signals</h3>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 animate-pulse">
          Live Bot Scanning
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {signals.map((signal) => (
            <motion.div
              key={signal.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border-border/40 bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-colors overflow-hidden">
                <div className={`h-1 w-full ${signal.direction === 'buy' ? 'bg-green-500' : 'bg-destructive'}`} />
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg">{signal.symbol}</span>
                        <Badge className={signal.direction === 'buy' ? 'bg-green-500/20 text-green-500' : 'bg-destructive/20 text-destructive'}>
                          {signal.direction === 'buy' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {signal.direction.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(signal.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Status</p>
                      <Badge variant="outline" className="capitalize">{signal.status}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-muted/30 border border-border/20">
                      <p className="text-[8px] text-muted-foreground uppercase font-bold mb-1">Entry</p>
                      <p className="font-black text-xs">{signal.entry_price}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                      <p className="text-[8px] text-destructive/60 uppercase font-bold mb-1">Stop Loss</p>
                      <p className="font-black text-xs text-destructive">{signal.stop_loss}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                      <p className="text-[8px] text-green-500/60 uppercase font-bold mb-1">Take Profit</p>
                      <p className="font-black text-xs text-green-500">{signal.take_profit}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/20 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-bold text-muted-foreground">OB Zone: {signal.ob_zone}</span>
                    </div>
                    <ShieldAlert className="h-4 w-4 text-primary/40" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {signals.length === 0 && (
          <Card className="col-span-full border-dashed border-border/40 bg-transparent">
            <CardContent className="p-8 text-center space-y-2">
              <p className="text-muted-foreground font-medium italic">Bot is scanning XAUUSD for SMC setups...</p>
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
