import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Bell, BellRing, Shield, TrendingDown, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface BreachAlertsProps {
  dailyUsedPercent: number;
  totalUsedPercent: number;
  dailyRemaining: number;
  totalRemaining: number;
  accountName: string;
}

interface AlertLevel {
  threshold: number;
  severity: "warning" | "danger" | "critical";
  color: string;
  bgColor: string;
  borderColor: string;
  message: string;
}

const ALERT_LEVELS: AlertLevel[] = [
  { threshold: 50, severity: "warning", color: "text-yellow-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/20", message: "50% of daily limit used" },
  { threshold: 75, severity: "danger", color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/20", message: "75% of daily limit used - Reduce position sizes" },
  { threshold: 90, severity: "critical", color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/20", message: "90% CRITICAL - Stop trading immediately!" },
];

export const BreachAlerts = ({
  dailyUsedPercent,
  totalUsedPercent,
  dailyRemaining,
  totalRemaining,
  accountName,
}: BreachAlertsProps) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Check notification permission
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const requestNotifications = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
      if (permission === "granted") {
        toast.success("Breach alerts enabled!", { description: "You'll get notified when approaching limits" });
        new Notification("Prop Firm Guardian", {
          body: "Breach alerts are now active! You'll be warned when approaching drawdown limits.",
          icon: "/favicon.png"
        });
      }
    }
  };

  // Find current daily alert level
  const currentDailyAlert = ALERT_LEVELS.filter(level => dailyUsedPercent >= level.threshold)
    .sort((a, b) => b.threshold - a.threshold)[0];
  
  const currentTotalAlert = ALERT_LEVELS.filter(level => totalUsedPercent >= level.threshold)
    .sort((a, b) => b.threshold - a.threshold)[0];

  // Show browser notification when hitting new alert levels
  useEffect(() => {
    if (!notificationsEnabled) return;
    
    const checkAndNotify = (percent: number, type: string, remaining: number) => {
      ALERT_LEVELS.forEach(level => {
        const key = `${type}_${level.threshold}`;
        const notified = localStorage.getItem(`breach_notified_${key}`);
        
        if (percent >= level.threshold && !notified) {
          new Notification(`⚠️ ${accountName} - ${level.severity.toUpperCase()}`, {
            body: `${type} drawdown at ${percent.toFixed(1)}%. $${remaining.toFixed(0)} remaining.`,
            icon: "/favicon.png",
            tag: key,
            requireInteraction: level.severity === "critical"
          });
          localStorage.setItem(`breach_notified_${key}`, "true");
        }
      });
    };

    checkAndNotify(dailyUsedPercent, "Daily", dailyRemaining);
    checkAndNotify(totalUsedPercent, "Total", totalRemaining);
  }, [dailyUsedPercent, totalUsedPercent, notificationsEnabled, accountName, dailyRemaining, totalRemaining]);

  // Reset notifications when percent goes back below threshold
  useEffect(() => {
    ALERT_LEVELS.forEach(level => {
      if (dailyUsedPercent < level.threshold) {
        localStorage.removeItem(`breach_notified_Daily_${level.threshold}`);
      }
      if (totalUsedPercent < level.threshold) {
        localStorage.removeItem(`breach_notified_Total_${level.threshold}`);
      }
    });
  }, [dailyUsedPercent, totalUsedPercent]);

  const dismissAlert = (threshold: number) => {
    setDismissedAlerts([...dismissedAlerts, threshold]);
    toast.info("Alert dismissed for this session");
  };

  const activeAlerts = ALERT_LEVELS.filter(
    level => 
      (dailyUsedPercent >= level.threshold || totalUsedPercent >= level.threshold) &&
      !dismissedAlerts.includes(level.threshold)
  );

  return (
    <div className="space-y-4">
      {/* Notification Settings Card */}
      <Card className="border-none bg-slate-900 rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 bg-slate-800/50 border-b border-white/5">
          <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" />
              Breach Alert System
            </div>
            <Badge className={`${notificationsEnabled ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'} border-none`}>
              {notificationsEnabled ? "Active" : "Disabled"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {!notificationsEnabled && (
            <Button onClick={requestNotifications} className="w-full" variant="outline">
              <Bell className="h-4 w-4 mr-2" />
              Enable Browser Notifications
            </Button>
          )}

          {/* Alert Thresholds Visual */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Daily Drawdown Status</p>
            <div className="relative h-8 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`absolute left-0 top-0 h-full transition-all duration-500 ${
                  dailyUsedPercent >= 90 ? 'bg-gradient-to-r from-red-600 to-red-500' :
                  dailyUsedPercent >= 75 ? 'bg-gradient-to-r from-orange-600 to-orange-500' :
                  dailyUsedPercent >= 50 ? 'bg-gradient-to-r from-yellow-600 to-yellow-500' :
                  'bg-gradient-to-r from-green-600 to-green-500'
                }`}
                style={{ width: `${Math.min(dailyUsedPercent, 100)}%` }}
              />
              {/* Threshold markers */}
              <div className="absolute left-[50%] top-0 h-full w-px bg-yellow-500/50" />
              <div className="absolute left-[75%] top-0 h-full w-px bg-orange-500/50" />
              <div className="absolute left-[90%] top-0 h-full w-px bg-red-500/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white drop-shadow-lg">
                  {dailyUsedPercent.toFixed(1)}% Used
                </span>
              </div>
            </div>
            <div className="flex justify-between text-[9px] font-medium text-white/30">
              <span>Safe</span>
              <span className="text-yellow-500">50%</span>
              <span className="text-orange-500">75%</span>
              <span className="text-red-500">90%</span>
              <span>Breach</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Total Drawdown Status</p>
            <div className="relative h-8 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`absolute left-0 top-0 h-full transition-all duration-500 ${
                  totalUsedPercent >= 90 ? 'bg-gradient-to-r from-red-600 to-red-500' :
                  totalUsedPercent >= 75 ? 'bg-gradient-to-r from-orange-600 to-orange-500' :
                  totalUsedPercent >= 50 ? 'bg-gradient-to-r from-yellow-600 to-yellow-500' :
                  'bg-gradient-to-r from-green-600 to-green-500'
                }`}
                style={{ width: `${Math.min(totalUsedPercent, 100)}%` }}
              />
              <div className="absolute left-[50%] top-0 h-full w-px bg-yellow-500/50" />
              <div className="absolute left-[75%] top-0 h-full w-px bg-orange-500/50" />
              <div className="absolute left-[90%] top-0 h-full w-px bg-red-500/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white drop-shadow-lg">
                  {totalUsedPercent.toFixed(1)}% Used
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <AnimatePresence>
        {activeAlerts.map((alert) => (
          <motion.div
            key={alert.threshold}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Alert className={`${alert.bgColor} ${alert.borderColor} border-2 rounded-xl`}>
              <AlertTriangle className={`h-5 w-5 ${alert.color}`} />
              <AlertTitle className={`${alert.color} font-bold flex items-center justify-between`}>
                <span>{alert.severity.toUpperCase()} ALERT</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => dismissAlert(alert.threshold)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </AlertTitle>
              <AlertDescription className={`${alert.color} opacity-80`}>
                {alert.message}
                <div className="mt-2 text-sm font-bold">
                  Daily: ${dailyRemaining.toFixed(0)} remaining • Total: ${totalRemaining.toFixed(0)} remaining
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-3 gap-3">
        {ALERT_LEVELS.map((level) => (
          <Card 
            key={level.threshold}
            className={`p-3 border-none rounded-xl ${
              dailyUsedPercent >= level.threshold || totalUsedPercent >= level.threshold
                ? `${level.bgColor} ${level.borderColor} border-2`
                : 'bg-slate-800/50'
            }`}
          >
            <div className="text-center">
              <p className={`text-2xl font-black ${
                dailyUsedPercent >= level.threshold || totalUsedPercent >= level.threshold
                  ? level.color
                  : 'text-white/30'
              }`}>
                {level.threshold}%
              </p>
              <p className={`text-[9px] font-bold uppercase ${
                dailyUsedPercent >= level.threshold || totalUsedPercent >= level.threshold
                  ? level.color
                  : 'text-white/20'
              }`}>
                {level.severity}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
