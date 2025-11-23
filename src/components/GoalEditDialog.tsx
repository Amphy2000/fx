import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GoalEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: any;
  onSubmit: (goalData: {
    goal_text: string;
    goal_type: string;
    target_date?: string;
    description?: string;
  }) => void;
}

export default function GoalEditDialog({ open, onOpenChange, goal, onSubmit }: GoalEditDialogProps) {
  const [goalTitle, setGoalTitle] = useState("");
  const [goalType, setGoalType] = useState("daily");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (goal) {
      setGoalTitle(goal.goal_text || "");
      setGoalType(goal.goal_type || "daily");
      setTargetDate(goal.target_date || "");
      setDescription(goal.description || "");
    }
  }, [goal]);

  const handleSubmit = () => {
    if (!goalTitle.trim()) return;

    onSubmit({
      goal_text: goalTitle,
      goal_type: goalType,
      target_date: targetDate || undefined,
      description: description || undefined,
    });

    // Reset form
    setGoalTitle("");
    setGoalType("daily");
    setTargetDate("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal-title">Goal Title *</Label>
            <Input
              id="goal-title"
              placeholder="e.g., Trade only A+ setups"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-type">Goal Type *</Label>
            <Select value={goalType} onValueChange={setGoalType}>
              <SelectTrigger id="goal-type">
                <SelectValue placeholder="Select goal type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-date">Target Date (Optional)</Label>
            <Input
              id="target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add more details about your goal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSubmit} disabled={!goalTitle.trim()} className="flex-1">
              Update Goal
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
