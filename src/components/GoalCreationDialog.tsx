import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface GoalCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (goalData: { goal_text: string; goal_type: string; target_date?: string; description?: string }) => void;
}

export default function GoalCreationDialog({ open, onOpenChange, onSubmit }: GoalCreationDialogProps) {
  const [goalText, setGoalText] = useState("");
  const [goalType, setGoalType] = useState("weekly");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!goalText.trim()) return;
    
    onSubmit({
      goal_text: goalText,
      goal_type: goalType,
      target_date: targetDate || undefined,
      description: description || undefined
    });

    // Reset form
    setGoalText("");
    setGoalType("weekly");
    setTargetDate("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal-text">Goal Title *</Label>
            <Input
              id="goal-text"
              placeholder="e.g., Complete 5 profitable trades"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-type">Goal Type</Label>
            <Select value={goalType} onValueChange={setGoalType}>
              <SelectTrigger id="goal-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
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
              placeholder="Add details about your goal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!goalText.trim()}>
            Create Goal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
