import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Clock } from "lucide-react";

interface NotificationTimesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnershipId: string;
}

export default function NotificationTimesDialog({ 
  open, 
  onOpenChange,
  partnershipId 
}: NotificationTimesDialogProps) {
  const [goalReminderTime, setGoalReminderTime] = useState("09:00");
  const [checkInReminderTime, setCheckInReminderTime] = useState("18:00");
  const [inactivityCheckTime, setInactivityCheckTime] = useState("20:00");

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const handleSave = () => {
    // Here you would save to the database
    // For now, we'll just show a success message
    toast.success("Notification times saved successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Configure Notification Times
          </DialogTitle>
          <DialogDescription>
            Set your preferred times for receiving reminders. Notifications are sent as in-app messages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto max-h-[50vh]">
          <div className="space-y-2">
            <Label htmlFor="goal-time">Goal Check-In Reminders</Label>
            <Select value={goalReminderTime} onValueChange={setGoalReminderTime}>
              <SelectTrigger id="goal-time">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Daily reminder to check in on your goals
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkin-time">Daily Check-In Reminders</Label>
            <Select value={checkInReminderTime} onValueChange={setCheckInReminderTime}>
              <SelectTrigger id="checkin-time">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Evening reminder to log your trading activities
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inactivity-time">Inactivity Check Time</Label>
            <Select value={inactivityCheckTime} onValueChange={setInactivityCheckTime}>
              <SelectTrigger id="inactivity-time">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Check for inactivity and send engagement reminders
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Reminders are sent as in-app messages to your chat with your accountability partner. Times are in your local timezone.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}