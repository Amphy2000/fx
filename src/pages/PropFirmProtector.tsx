import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown, 
  Calculator, 
  Target,
  Activity,
  CheckCircle2,
  XCircle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

const PropFirmProtector = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  // Input state
  const [accountSize, setAccountSize] = useState<string>("100000");
  const [currentBalance, setCurrentBalance] = useState<string>("100000");
  const [maxDailyDrawdown, setMaxDailyDrawdown] = useState<string>("5");
  const [maxTotalDrawdown, setMaxTotalDrawdown] = useState<string>("10");
  const [stopLossPips, setStopLossPips] = useState<string>("20");
  const [pipValue, setPipValue] = useState<string>("10"); // $10 per pip per lot for forex

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Calculations
  const calculations = useMemo(() => {
    const size = parseFloat(accountSize) || 0;
    const balance = parseFloat(currentBalance) || 0;
    const dailyDD = parseFloat(maxDailyDrawdown) || 0;
    const totalDD = parseFloat(maxTotalDrawdown) || 0;
    const slPips = parseFloat(stopLossPips) || 0;
    const pipVal = parseFloat(pipValue) || 10;

    // Safe Zone Calculations
    const dailyDrawdownLimit = size * (dailyDD / 100);
    const totalDrawdownLimit = size * (totalDD / 100);
    const minimumBalance = size - totalDrawdownLimit;
    
    const dailyLossRemaining = dailyDrawdownLimit; // Resets daily
    const totalLossRemaining = balance - minimumBalance;
    
    // Use the smaller of daily or total remaining
    const effectiveLossRemaining = Math.min(dailyLossRemaining, totalLossRemaining);

    // Lot Size Guard - Max lot size to never hit daily limit in one trade
    const maxLotSize = slPips > 0 && pipVal > 0 
      ? dailyLossRemaining / (slPips * pipVal) 
      : 0;

    // Progress towards drawdown (0-100, higher = more danger)
    const lossFromStart = size - balance;
    const drawdownProgress = totalDrawdownLimit > 0 
      ? Math.min(100, Math.max(0, (lossFromStart / totalDrawdownLimit) * 100))
      : 0;

    // Recovery Mode
    const isInRecovery = balance < size;
    const recoveryNeeded = size - balance;
    const recoveryPercentage = size > 0 ? ((size - balance) / size) * 100 : 0;

    // Recovery risk suggestion
    let suggestedRisk = 1; // Default 1%
    if (recoveryPercentage > 5) suggestedRisk = 0.25;
    else if (recoveryPercentage > 2) suggestedRisk = 0.5;
    else if (recoveryPercentage > 0) suggestedRisk = 0.75;

    // Suggested lot size based on recovery risk
    const recoveryLotSize = slPips > 0 && pipVal > 0 
      ? (balance * (suggestedRisk / 100)) / (slPips * pipVal)
      : 0;

    return {
      dailyDrawdownLimit,
      totalDrawdownLimit,
      minimumBalance,
      dailyLossRemaining,
      totalLossRemaining,
      effectiveLossRemaining,
      maxLotSize,
      drawdownProgress,
      isInRecovery,
      recoveryNeeded,
      recoveryPercentage,
      suggestedRisk,
      recoveryLotSize,
    };
  }, [accountSize, currentBalance, maxDailyDrawdown, maxTotalDrawdown, stopLossPips, pipValue]);

  // Determine progress bar color based on drawdown percentage
  const getProgressColor = (progress: number) => {
    if (progress < 30) return "bg-green-500";
    if (progress < 60) return "bg-yellow-500";
    if (progress < 80) return "bg-orange-500";
    return "bg-red-500";
  };

  const getStatusBadge = (progress: number) => {
    if (progress < 30) return { label: "Safe Zone", variant: "default" as const, icon: CheckCircle2 };
    if (progress < 60) return { label: "Caution", variant: "secondary" as const, icon: AlertTriangle };
    if (progress < 80) return { label: "Danger Zone", variant: "destructive" as const, icon: AlertTriangle };
    return { label: "Critical", variant: "destructive" as const, icon: XCircle };
  };

  const status = getStatusBadge(calculations.drawdownProgress);
  const StatusIcon = status.icon;

  if (!user) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Prop Firm Protector</h1>
          </div>
          <p className="text-muted-foreground">
            Your discipline guardian — never breach drawdown limits again
          </p>
        </div>

        {/* Main Status Card */}
        <Card className="mb-6 border-2" style={{ borderColor: calculations.drawdownProgress > 60 ? 'hsl(var(--destructive))' : 'hsl(var(--primary) / 0.3)' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Account Status
              </CardTitle>
              <Badge variant={status.variant} className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Drawdown Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Drawdown Used</span>
                <span className={cn(
                  "font-semibold",
                  calculations.drawdownProgress > 60 ? "text-destructive" : "text-foreground"
                )}>
                  {calculations.drawdownProgress.toFixed(1)}%
                </span>
              </div>
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
                <div 
                  className={cn(
                    "h-full transition-all duration-500 ease-out",
                    getProgressColor(calculations.drawdownProgress)
                  )}
                  style={{ width: `${calculations.drawdownProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                <span>Safe</span>
                <span>Limit</span>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground">Daily Loss Remaining</p>
                <p className="text-xl font-bold text-primary">
                  ${calculations.dailyLossRemaining.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground">Total Loss Remaining</p>
                <p className="text-xl font-bold text-primary">
                  ${calculations.totalLossRemaining.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-muted-foreground">Minimum Balance</p>
                <p className="text-xl font-bold text-destructive">
                  ${calculations.minimumBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-muted-foreground">Safe to Risk</p>
                <p className="text-xl font-bold text-green-500">
                  ${calculations.effectiveLossRemaining.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Account Configuration
              </CardTitle>
              <CardDescription>
                Enter your prop firm account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountSize">Initial Account Size ($)</Label>
                  <Input
                    id="accountSize"
                    type="number"
                    value={accountSize}
                    onChange={(e) => setAccountSize(e.target.value)}
                    placeholder="100000"
                  />
                </div>
                <div>
                  <Label htmlFor="currentBalance">Current Balance ($)</Label>
                  <Input
                    id="currentBalance"
                    type="number"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    placeholder="100000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dailyDD">Max Daily Drawdown (%)</Label>
                  <Input
                    id="dailyDD"
                    type="number"
                    step="0.1"
                    value={maxDailyDrawdown}
                    onChange={(e) => setMaxDailyDrawdown(e.target.value)}
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label htmlFor="totalDD">Max Total Drawdown (%)</Label>
                  <Input
                    id="totalDD"
                    type="number"
                    step="0.1"
                    value={maxTotalDrawdown}
                    onChange={(e) => setMaxTotalDrawdown(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="slPips">Stop Loss (Pips)</Label>
                  <Input
                    id="slPips"
                    type="number"
                    value={stopLossPips}
                    onChange={(e) => setStopLossPips(e.target.value)}
                    placeholder="20"
                  />
                </div>
                <div>
                  <Label htmlFor="pipValue">Pip Value ($/lot)</Label>
                  <Input
                    id="pipValue"
                    type="number"
                    value={pipValue}
                    onChange={(e) => setPipValue(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Standard forex pip value: $10/lot. Adjust for your instrument (Gold: ~$1/pip, JPY: ~$9.09/pip).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Lot Size Guard */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Lot Size Guard
              </CardTitle>
              <CardDescription>
                Maximum position size to protect your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 mb-4">
                <p className="text-sm text-muted-foreground mb-1">Max Safe Lot Size</p>
                <p className="text-4xl font-bold text-primary">
                  {calculations.maxLotSize.toFixed(2)} lots
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  With {stopLossPips} pips SL, you'll never lose more than your daily limit
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">If you lose this trade:</span>
                  <span className="font-semibold text-destructive">
                    -${(calculations.maxLotSize * parseFloat(stopLossPips || "0") * parseFloat(pipValue || "10")).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Daily limit:</span>
                  <span className="font-semibold">
                    ${calculations.dailyDrawdownLimit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-green-500/10">
                  <span className="text-sm text-muted-foreground">Buffer remaining:</span>
                  <span className="font-semibold text-green-500">
                    ${(calculations.dailyDrawdownLimit - (calculations.maxLotSize * parseFloat(stopLossPips || "0") * parseFloat(pipValue || "10"))).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recovery Mode */}
          {calculations.isInRecovery && (
            <Card className="lg:col-span-2 border-yellow-500/50 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                  <TrendingDown className="h-5 w-5" />
                  Recovery Mode Active
                </CardTitle>
                <CardDescription>
                  Your balance is below starting capital. Here's your recovery strategy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-4 rounded-lg bg-background border">
                    <p className="text-sm text-muted-foreground">Amount to Recover</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
                      ${calculations.recoveryNeeded.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {calculations.recoveryPercentage.toFixed(2)}% below start
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-background border">
                    <p className="text-sm text-muted-foreground">Suggested Risk</p>
                    <p className="text-2xl font-bold text-primary">
                      {calculations.suggestedRisk}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Per trade until recovered
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-background border">
                    <p className="text-sm text-muted-foreground">Recovery Lot Size</p>
                    <p className="text-2xl font-bold text-primary">
                      {calculations.recoveryLotSize.toFixed(2)} lots
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Max position with recovery risk
                    </p>
                  </div>
                </div>

                <Alert className="border-yellow-500/30 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                  <AlertTitle className="text-yellow-600 dark:text-yellow-500">Recovery Strategy</AlertTitle>
                  <AlertDescription className="text-muted-foreground">
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Trade at {calculations.suggestedRisk}% risk until you're back to ${parseFloat(accountSize).toLocaleString()}</li>
                      <li>Focus on high-probability A+ setups only</li>
                      <li>Avoid revenge trading — patience is key</li>
                      <li>Use max {calculations.recoveryLotSize.toFixed(2)} lots with {stopLossPips} pip SL</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Rules Summary */}
          <Card className={calculations.isInRecovery ? "" : "lg:col-span-2"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Your Protection Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Daily Limit</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Max loss per day: <strong className="text-foreground">${calculations.dailyDrawdownLimit.toLocaleString()}</strong>
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Total Limit</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Never go below: <strong className="text-foreground">${calculations.minimumBalance.toLocaleString()}</strong>
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Position Limit</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Max lot size: <strong className="text-foreground">{calculations.maxLotSize.toFixed(2)} lots</strong>
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Buffer Zone</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Safe to risk today: <strong className="text-foreground">${calculations.effectiveLossRemaining.toLocaleString()}</strong>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PropFirmProtector;
