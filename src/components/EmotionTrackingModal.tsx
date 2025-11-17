import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Brain } from "lucide-react";

interface EmotionTrackingModalProps {
  trade: any;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const emotionOptions = [
  { value: "calm", label: "😌 Calm", description: "Relaxed and focused" },
  { value: "confident", label: "😎 Confident", description: "Trusting your analysis" },
  { value: "neutral", label: "😐 Neutral", description: "No strong feelings" },
  { value: "anxious", label: "😟 Anxious", description: "Worried or uncertain" },
  { value: "impatient", label: "😤 Impatient", description: "Eager to enter" },
  { value: "satisfied", label: "😁 Satisfied", description: "Happy with outcome" },
  { value: "regretful", label: "😔 Regretful", description: "Wish you did differently" },
  { value: "frustrated", label: "😣 Frustrated", description: "Annoyed with result" },
  { value: "content", label: "😌 Content", description: "At peace with result" },
];

export const EmotionTrackingModal = ({ trade, open, onClose, onUpdated }: EmotionTrackingModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [emotionBefore, setEmotionBefore] = useState(trade?.emotion_before || "");
  const [emotionAfter, setEmotionAfter] = useState(trade?.emotion_after || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("trades")
        .update({
          emotion_before: emotionBefore || null,
          emotion_after: emotionAfter || null,
        })
        .eq("id", trade.id);

      if (error) throw error;

      toast.success("Emotions tracked successfully!");
      onUpdated();
      onClose();
    } catch (error: any) {
      console.error("Error updating emotions:", error);
      toast.error("Failed to track emotions");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Track Your Trading Emotions
          </DialogTitle>
          <DialogDescription>
            Understanding your emotional state before and after trades helps identify patterns and improve decision-making.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="emotion_before">How did you feel BEFORE taking this trade?</Label>
            <Select value={emotionBefore} onValueChange={setEmotionBefore}>
              <SelectTrigger>
                <SelectValue placeholder="Select your emotion..." />
              </SelectTrigger>
              <SelectContent>
                {emotionOptions.slice(0, 5).map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {trade?.result && trade.result !== "open" && (
            <div className="space-y-2">
              <Label htmlFor="emotion_after">How did you feel AFTER the trade closed?</Label>
              <Select value={emotionAfter} onValueChange={setEmotionAfter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your emotion..." />
                </SelectTrigger>
                <SelectContent>
                  {emotionOptions.slice(5).map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Track emotions regularly to see which emotional states lead to better trading outcomes.
              This data powers your personalized insights in the Insights tab.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Emotions"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
