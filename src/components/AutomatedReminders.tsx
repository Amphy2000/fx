import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Clock, Target, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Props {
  partnershipId: string;
}

export default function AutomatedReminders({ partnershipId }: Props) {
  const [settings, setSettings] = useState({
    goalReminders: true,
    dailyCheckIns: true,
    inactivityAlerts: true,
    progressUpdates: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success(`${key} ${!settings[key] ? 'enabled' : 'disabled'}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Automated Reminders
        </CardTitle>
        <CardDescription>
          Configure automatic notifications to stay on track
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <Label htmlFor="goal-reminders" className="text-base font-medium">
                  Goal Check-In Reminders
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Get reminded when it's time to update your goal progress
                </p>
              </div>
            </div>
            <Switch
              id="goal-reminders"
              checked={settings.goalReminders}
              onCheckedChange={() => handleToggle('goalReminders')}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <Label htmlFor="daily-checkins" className="text-base font-medium">
                  Daily Check-In Reminders
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Daily reminder to log your trading activities
                </p>
              </div>
            </div>
            <Switch
              id="daily-checkins"
              checked={settings.dailyCheckIns}
              onCheckedChange={() => handleToggle('dailyCheckIns')}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <Label htmlFor="inactivity-alerts" className="text-base font-medium">
                  Inactivity Alerts
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Get notified if you or your partner haven't been active
                </p>
              </div>
            </div>
            <Switch
              id="inactivity-alerts"
              checked={settings.inactivityAlerts}
              onCheckedChange={() => handleToggle('inactivityAlerts')}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <Label htmlFor="progress-updates" className="text-base font-medium">
                  Auto Progress Updates
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Automatically sync trading data to goal progress
                </p>
              </div>
            </div>
            <Switch
              id="progress-updates"
              checked={settings.progressUpdates}
              onCheckedChange={() => handleToggle('progressUpdates')}
            />
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              Reminders are sent automatically based on your activity patterns
            </p>
            <Button variant="outline" className="w-full">
              <Clock className="h-4 w-4 mr-2" />
              Configure Notification Times
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}