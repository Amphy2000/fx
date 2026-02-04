import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, X, TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface QuickTradeCaptureProps {
  onTradeAdded: () => void;
  isOpenExternal?: boolean;
  onOpenChangeExternal?: (open: boolean) => void;
}

const COMMON_PAIRS = [
  "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD",
  "AUDUSD", "USDCAD", "NZDUSD", "GBPJPY", "EURJPY"
];

export const QuickTradeCapture = ({ onTradeAdded, isOpenExternal, onOpenChangeExternal }: QuickTradeCaptureProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isOpenExternal !== undefined ? isOpenExternal : internalOpen;
  const setIsOpen = onOpenChangeExternal || setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const [pair, setPair] = useState("");
  const [result, setResult] = useState<"win" | "loss" | "open" | null>(null);
  const [amount, setAmount] = useState("");
  const [recentPairs, setRecentPairs] = useState<string[]>([]);

  useEffect(() => {
    fetchRecentPairs();
  }, []);

  const fetchRecentPairs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("trades")
      .select("pair")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) {
      const uniquePairs = [...new Set(data.map(t => t.pair))].slice(0, 3);
      setRecentPairs(uniquePairs);
      if (uniquePairs.length > 0) {
        setPair(uniquePairs[0]);
      }
    }
  };

  const handleSubmit = async () => {
    if (!pair || !result) {
      toast.error("Please select a pair and result");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        return;
      }

      const profitLoss = result === "open" ? null : (
        result === "win" ? Math.abs(parseFloat(amount) || 0) : -Math.abs(parseFloat(amount) || 0)
      );

      const { error } = await supabase.from("trades").insert({
        user_id: user.id,
        pair: pair.toUpperCase(),
        direction: "long",
        entry_price: 0,
        result: result === "open" ? null : result,
        profit_loss: profitLoss,
        emotion_before: "neutral",
        emotion_after: result === "open" ? null : "neutral",
        notes: "Quick capture"
      });

      if (error) throw error;

      toast.success("Trade logged!");
      onTradeAdded();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to log trade");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setAmount("");
    setIsOpen(false);
  };

  const displayPairs = recentPairs.length > 0
    ? [...new Set([...recentPairs, ...COMMON_PAIRS])].slice(0, 6)
    : COMMON_PAIRS.slice(0, 6);

  return (
    <>
      {/* Floating Action Button - Only show if not controlled externally */}
      {isOpenExternal === undefined && (
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Zap className="h-6 w-6" />
          </Button>
        </motion.div>
      )}

      {/* Quick Capture Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Card className="m-4 p-6 space-y-6 border-2 border-primary/20 bg-card/95 backdrop-blur-sm">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Quick Trade</h3>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Pair Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Pair</label>
                  <div className="flex flex-wrap gap-2">
                    {displayPairs.map((p) => (
                      <Button
                        key={p}
                        variant={pair === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPair(p)}
                        className="text-xs"
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                  <Input
                    placeholder="Or type custom pair..."
                    value={pair}
                    onChange={(e) => setPair(e.target.value.toUpperCase())}
                    className="mt-2"
                  />
                </div>

                {/* Result Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Result</label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={result === "win" ? "default" : "outline"}
                      onClick={() => setResult("win")}
                      className={result === "win" ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Win
                    </Button>
                    <Button
                      variant={result === "loss" ? "default" : "outline"}
                      onClick={() => setResult("loss")}
                      className={result === "loss" ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                      <TrendingDown className="h-4 w-4 mr-1" />
                      Loss
                    </Button>
                    <Button
                      variant={result === "open" ? "default" : "outline"}
                      onClick={() => setResult("open")}
                      className={result === "open" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                  </div>
                </div>

                {/* Amount (optional) */}
                {result && result !== "open" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-medium text-muted-foreground">
                      Amount (optional)
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="flex-1"
                      />
                      <div className="flex gap-1">
                        {[10, 25, 50].map((preset) => (
                          <Button
                            key={preset}
                            variant="outline"
                            size="sm"
                            onClick={() => setAmount(preset.toString())}
                          >
                            ${preset}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !pair || !result}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? "Saving..." : "Log Trade"}
                </Button>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
