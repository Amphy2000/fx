import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TradeEditModalProps {
  trade: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const TradeEditModal = ({ trade, isOpen, onClose, onUpdated }: TradeEditModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    pair: trade?.pair || "",
    direction: trade?.direction || "buy",
    entry_price: trade?.entry_price || "",
    stop_loss: trade?.stop_loss || "",
    take_profit: trade?.take_profit || "",
    exit_price: trade?.exit_price || "",
    result: trade?.result || "open",
    profit_loss: trade?.profit_loss || "",
    notes: trade?.notes || "",
    emotion_before: trade?.emotion_before || "",
    emotion_after: trade?.emotion_after || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("trades")
        .update({
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
          emotion_after: formData.emotion_after || null,
        })
        .eq("id", trade.id);

      if (error) throw error;

      toast.success("Trade updated successfully! ✅");
      onUpdated();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update trade");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trade</DialogTitle>
        </DialogHeader>
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
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calm">😌 Calm</SelectItem>
                <SelectItem value="confident">😎 Confident</SelectItem>
                <SelectItem value="disciplined">🎯 Disciplined</SelectItem>
                <SelectItem value="anxious">😟 Anxious</SelectItem>
                <SelectItem value="greedy">🤑 Greedy</SelectItem>
                <SelectItem value="fearful">😨 Fearful</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.result !== "open" && (
            <div className="space-y-2">
              <Label htmlFor="emotion_after">Emotion After</Label>
              <Select
                value={formData.emotion_after}
                onValueChange={(value) => setFormData({ ...formData, emotion_after: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="satisfied">😁 Satisfied</SelectItem>
                  <SelectItem value="relieved">😮‍💨 Relieved</SelectItem>
                  <SelectItem value="accomplished">🎉 Accomplished</SelectItem>
                  <SelectItem value="disappointed">😞 Disappointed</SelectItem>
                  <SelectItem value="frustrated">😠 Frustrated</SelectItem>
                  <SelectItem value="regretful">😔 Regretful</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Trade notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
