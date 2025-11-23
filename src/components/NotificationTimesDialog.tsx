import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Clock, Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  
  // Notification channels
  const [enableEmail, setEnableEmail] = useState(false);
  const [enableTelegram, setEnableTelegram] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadPreferences();
    }
  }, [open]);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      const { data: accountabilityProfile } = await supabase
        .from('accountability_profiles')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .single();

      if (profile && accountabilityProfile) {
        setEmailAddress(profile.email || "");
        const prefs = accountabilityProfile.notification_preferences as any || {};
        setEnableEmail(prefs.enable_email || false);
        setEnableTelegram(prefs.enable_telegram || false);
        setTelegramUsername(prefs.telegram_username || "");
        setGoalReminderTime(prefs.goal_reminder_time || "09:00");
        setCheckInReminderTime(prefs.check_in_reminder_time || "18:00");
        setInactivityCheckTime(prefs.inactivity_check_time || "20:00");
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const handleSave = async () => {
    if (enableEmail && !emailAddress) {
      toast.error("Please provide an email address");
      return;
    }
    if (enableTelegram && !telegramUsername) {
      toast.error("Please provide your Telegram username");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('accountability_profiles')
        .upsert({
          user_id: user.id,
          notification_preferences: {
            enable_email: enableEmail,
            enable_telegram: enableTelegram,
            enable_in_app: true,
            email_address: emailAddress,
            telegram_username: telegramUsername,
            goal_reminder_time: goalReminderTime,
            check_in_reminder_time: checkInReminderTime,
            inactivity_check_time: inactivityCheckTime,
          }
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success("Notification preferences saved!");
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error("Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Notification Preferences
          </DialogTitle>
          <DialogDescription>
            Configure when and how you receive accountability reminders
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto max-h-[60vh]">
          {/* Notification Channels */}
          <div className="space-y-4 pb-4 border-b">
            <h4 className="font-medium text-sm">Notification Channels</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="enable-email">Email Notifications</Label>
                </div>
                <Switch 
                  id="enable-email"
                  checked={enableEmail}
                  onCheckedChange={setEnableEmail}
                />
              </div>

              {enableEmail && (
                <div className="pl-6 space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="enable-telegram">Telegram Notifications</Label>
                </div>
                <Switch 
                  id="enable-telegram"
                  checked={enableTelegram}
                  onCheckedChange={setEnableTelegram}
                />
              </div>

              {enableTelegram && (
                <div className="pl-6 space-y-2">
                  <Label htmlFor="telegram">Telegram Username</Label>
                  <Input
                    id="telegram"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="@username"
                  />
                  <p className="text-xs text-muted-foreground">
                    Start a chat with our bot @AmphyAccountabilityBot first
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reminder Times */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Reminder Times</h4>
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
                <strong>Note:</strong> Times are in your local timezone. You'll receive notifications via your selected channels.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Preferences"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}