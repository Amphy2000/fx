import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { updateStreak, awardAchievement } from "@/utils/streakManager";
import { awardCredits, CREDIT_REWARDS } from "@/utils/creditManager";
import { Heart, Moon, Target, Brain } from "lucide-react";

interface QuickCheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  canSnooze?: boolean;
}

const MOOD_OPTIONS = [
  { value: "excellent", emoji: "😄", label: "Excellent" },
  { value: "good", emoji: "🙂", label: "Good" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "low", emoji: "😔", label: "Low" },
  { value: "anxious", emoji: "😰", label: "Anxious" },
];

const SLEEP_PRESETS = [
  { value: 4, label: "4h" },
  { value: 5, label: "5h" },
  { value: 6, label: "6h" },
  { value: 7, label: "7h" },
  { value: 8, label: "8h+" },
];

export const QuickCheckInModal = ({ open, onOpenChange, onComplete, canSnooze = true }: QuickCheckInModalProps) => {
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState("neutral");
  const [confidence, setConfidence] = useState(5);
  const [sleepHours, setSleepHours] = useState(7);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const today = format(new Date(), 'yyyy-MM-dd');
      
      const checkInData = {
        user_id: user.id,
        check_in_date: today,
        mood,
        confidence,
        stress: 5, // Default neutral
        sleep_hours: sleepHours,
        focus_level: confidence, // Use confidence as proxy
        note: note || null
      };

      const { error } = await supabase
        .from("daily_checkins")
        .insert(checkInData);

      if (error) throw error;

      // Update streak
      await updateStreak(user.id, 'daily_checkin');
      
      // Award credits
      await awardCredits(user.id, 'daily_checkin', CREDIT_REWARDS.daily_checkin, 'Daily mental check-in completed');
      
      // Check for 7-day streak achievement
      const { data: streakData } = await supabase
        .from('streaks')
        .select('current_count')
        .eq('user_id', user.id)
        .eq('streak_type', 'daily_checkin')
        .single();
      
      if (streakData?.current_count >= 7) {
        await awardAchievement(user.id, '7 Day Check-In Streak', 'streak');
      }

      toast.success("Daily check-in complete! 🎯", {
        description: "This helps your AI coach find patterns in your trading"
      });
      
      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save check-in");
    } finally {
      setLoading(false);
    }
  };

  const handleSnooze = () => {
    const snoozeKey = 'checkin_snooze_count';
    const snoozeCount = parseInt(localStorage.getItem(snoozeKey) || '0');
    
    if (snoozeCount < 3) {
      localStorage.setItem(snoozeKey, String(snoozeCount + 1));
      localStorage.setItem('checkin_snooze_until', String(Date.now() + 3600000)); // 1 hour
      toast.info("Reminder snoozed for 1 hour");
      onOpenChange(false);
    } else {
      toast.error("Maximum snoozes reached. Please complete your check-in.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Quick Daily Check-In
          </DialogTitle>
          <DialogDescription>
            Takes 15 seconds • Helps AI find patterns in your trading
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mood Selection */}
          <div className="space-y-3">
            <Label>How are you feeling today?</Label>
            <div className="flex gap-2 justify-between">
              {MOOD_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={mood === option.value ? "default" : "outline"}
                  className="flex-1 h-auto flex-col gap-1 py-3"
                  onClick={() => setMood(option.value)}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="text-xs">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Confidence Slider */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Confidence: {confidence}/10
            </Label>
            <Slider
              value={[confidence]}
              onValueChange={(value) => setConfidence(value[0])}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          {/* Sleep Presets */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Moon className="w-4 h-4" />
              Sleep Last Night
            </Label>
            <div className="flex gap-2">
              {SLEEP_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant={sleepHours === preset.value ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setSleepHours(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          {!showNote ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNote(true)}
              className="w-full"
            >
              + Add note (optional)
            </Button>
          ) : (
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any thoughts or concerns today?"
                rows={2}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {canSnooze && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSnooze}
              className="flex-1"
            >
              Remind me later
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1"
          >
            {loading ? "Saving..." : "Complete Check-In"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
