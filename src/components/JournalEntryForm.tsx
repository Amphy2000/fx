import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { BookOpen, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JournalEntryFormProps {
  onEntrySaved?: () => void;
}

const MOOD_OPTIONS = [
  "Confident", "Anxious", "Calm", "Excited", "Frustrated", 
  "Focused", "Distracted", "Optimistic", "Pessimistic", "Neutral"
];

export const JournalEntryForm = ({ onEntrySaved }: JournalEntryFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    mood: "",
    energyLevel: 5,
    marketConditions: "",
    tradingMindset: "",
    goalsForSession: "",
    lessonsLearned: "",
    notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: user.id,
          mood: formData.mood,
          energy_level: formData.energyLevel,
          market_conditions: formData.marketConditions,
          trading_mindset: formData.tradingMindset,
          goals_for_session: formData.goalsForSession,
          lessons_learned: formData.lessonsLearned,
          notes: formData.notes
        });

      if (error) throw error;

      toast.success("Journal entry saved successfully!");
      
      // Reset form
      setFormData({
        mood: "",
        energyLevel: 5,
        marketConditions: "",
        tradingMindset: "",
        goalsForSession: "",
        lessonsLearned: "",
        notes: ""
      });

      onEntrySaved?.();
    } catch (error: any) {
      console.error("Error saving journal entry:", error);
      toast.error("Failed to save journal entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          New Journal Entry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mood">Current Mood *</Label>
            <Select 
              value={formData.mood} 
              onValueChange={(value) => setFormData({ ...formData, mood: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your mood" />
              </SelectTrigger>
              <SelectContent>
                {MOOD_OPTIONS.map((mood) => (
                  <SelectItem key={mood} value={mood}>
                    {mood}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Energy Level: {formData.energyLevel}/10</Label>
            <Slider
              value={[formData.energyLevel]}
              onValueChange={(value) => setFormData({ ...formData, energyLevel: value[0] })}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketConditions">Market Conditions</Label>
            <Textarea
              id="marketConditions"
              placeholder="Describe current market conditions, volatility, trends..."
              value={formData.marketConditions}
              onChange={(e) => setFormData({ ...formData, marketConditions: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tradingMindset">Trading Mindset</Label>
            <Textarea
              id="tradingMindset"
              placeholder="How are you feeling about trading today? Any concerns or confidence?"
              value={formData.tradingMindset}
              onChange={(e) => setFormData({ ...formData, tradingMindset: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goalsForSession">Goals for This Session</Label>
            <Textarea
              id="goalsForSession"
              placeholder="What do you want to achieve today?"
              value={formData.goalsForSession}
              onChange={(e) => setFormData({ ...formData, goalsForSession: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessonsLearned">Lessons Learned</Label>
            <Textarea
              id="lessonsLearned"
              placeholder="What have you learned from recent trades?"
              value={formData.lessonsLearned}
              onChange={(e) => setFormData({ ...formData, lessonsLearned: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any other thoughts or observations..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading || !formData.mood} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
