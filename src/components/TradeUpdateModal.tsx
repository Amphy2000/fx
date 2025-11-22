import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TradeUpdateModalProps {
  trade: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const TradeUpdateModal = ({ trade, isOpen, onClose, onUpdated }: TradeUpdateModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    exit_price: trade.exit_price || "",
    result: trade.result || "open",
    profit_loss: trade.profit_loss || "",
    emotion_after: trade.emotion_after || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("trades")
        .update({
          exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
          result: formData.result,
          profit_loss: formData.profit_loss ? parseFloat(formData.profit_loss) : null,
          emotion_after: formData.emotion_after || null,
        })
        .eq("id", trade.id);

      if (error) throw error;

      toast.success("Trade updated successfully! 🎯");
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Trade: {trade.pair}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                  required
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
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emotion_after">Emotion After Trade</Label>
                <Select
                  value={formData.emotion_after}
                  onValueChange={(value) => setFormData({ ...formData, emotion_after: value })}
                >
                  <SelectTrigger id="emotion_after">
                    <SelectValue placeholder="Select emotion..." />
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
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Trade"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
