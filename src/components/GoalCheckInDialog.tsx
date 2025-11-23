import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";

interface GoalCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: any;
  onSubmit: (data: any) => void;
}

export default function GoalCheckInDialog({
  open,
  onOpenChange,
  goal,
  onSubmit
}: GoalCheckInDialogProps) {
  const [status, setStatus] = useState<string>("completed");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    onSubmit({ status, notes });
    setStatus("completed");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check-In: {goal.goal_text}</DialogTitle>
          <DialogDescription>
            How did you do with this goal today?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Status</Label>
            <RadioGroup value={status} onValueChange={setStatus}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="completed" id="completed" />
                <Label htmlFor="completed" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium">Completed</p>
                    <p className="text-xs text-muted-foreground">Successfully achieved the goal</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="flex items-center gap-2 cursor-pointer flex-1">
                  <MinusCircle className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="font-medium">Partial</p>
                    <p className="text-xs text-muted-foreground">Made progress but didn't complete</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="missed" id="missed" />
                <Label htmlFor="missed" className="flex items-center gap-2 cursor-pointer flex-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="font-medium">Missed</p>
                    <p className="text-xs text-muted-foreground">Didn't work on the goal</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about your progress, challenges, or insights..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Submit Check-In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
