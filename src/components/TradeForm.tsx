import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface TradeFormProps {
  onTradeAdded: () => void;
}

const TradeForm = ({ onTradeAdded }: TradeFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    pair: "",
    direction: "buy",
    entry_price: "",
    stop_loss: "",
    take_profit: "",
    exit_price: "",
    result: "open",
    profit_loss: "",
    notes: "",
    emotion_before: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const tradeData = {
        user_id: user.id,
        pair: formData.pair,
        direction: formData.direction,
        entry_price: parseFloat(formData.entry_price),
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
        exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
        result: formData.result,
        profit_loss: formData.profit_loss ? parseFloat(formData.profit_loss) : null,
        notes: formData.notes || null,
        emotion_before: formData.emotion_before || null,
      };

      const { error } = await supabase.from("trades").insert(tradeData);

      if (error) throw error;

      toast.success("Trade logged successfully! Getting AI feedback...");

      // Get AI feedback
      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('analyze-trade', {
          body: { trade: tradeData }
        });

        if (aiError) throw aiError;

        if (aiData?.feedback) {
          toast.success(aiData.feedback, { duration: 8000 });
        }
      } catch (aiError) {
        console.error("AI analysis error:", aiError);
      }

      setFormData({
        pair: "",
        direction: "buy",
        entry_price: "",
        stop_loss: "",
        take_profit: "",
        exit_price: "",
        result: "open",
        profit_loss: "",
        notes: "",
        emotion_before: "",
      });
      onTradeAdded();
    } catch (error: any) {
      toast.error(error.message || "Failed to log trade");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Log New Trade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pair">Pair</Label>
            <Input
              id="pair"
              placeholder="EUR/USD, XAU/USD"
              value={formData.pair}
              onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direction">Direction</Label>
            <Select
              value={formData.direction}
              onValueChange={(value) => setFormData({ ...formData, direction: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry_price">Entry Price</Label>
            <Input
              id="entry_price"
              type="number"
              step="0.00001"
              placeholder="1.08500"
              value={formData.entry_price}
              onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stop_loss">Stop Loss</Label>
              <Input
                id="stop_loss"
                type="number"
                step="0.00001"
                placeholder="1.08000"
                value={formData.stop_loss}
                onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="take_profit">Take Profit</Label>
              <Input
                id="take_profit"
                type="number"
                step="0.00001"
                placeholder="1.09000"
                value={formData.take_profit}
                onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="result">Result</Label>
            <Select
              value={formData.result}
              onValueChange={(value) => setFormData({ ...formData, result: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="win">Win</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
                <SelectItem value="breakeven">Breakeven</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.result !== "open" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="exit_price">Exit Price</Label>
                <Input
                  id="exit_price"
                  type="number"
                  step="0.00001"
                  placeholder="1.08750"
                  value={formData.exit_price}
                  onChange={(e) => setFormData({ ...formData, exit_price: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profit_loss">Profit/Loss ($)</Label>
                <Input
                  id="profit_loss"
                  type="number"
                  step="0.01"
                  placeholder="150.00"
                  value={formData.profit_loss}
                  onChange={(e) => setFormData({ ...formData, profit_loss: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="emotion_before">Emotion Before</Label>
            <Select
              value={formData.emotion_before}
              onValueChange={(value) => setFormData({ ...formData, emotion_before: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select emotion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calm">Calm</SelectItem>
                <SelectItem value="confident">Confident</SelectItem>
                <SelectItem value="fearful">Fearful</SelectItem>
                <SelectItem value="greedy">Greedy</SelectItem>
                <SelectItem value="anxious">Anxious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Trade setup, market conditions, etc."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging trade..." : "Log Trade"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TradeForm;
