import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertTriangle, TrendingDown, Target, DollarSign, Activity, CheckCircle2, XCircle, Info, Zap } from "lucide-react";

// Popular prop firm presets with their rules
const PROP_FIRM_PRESETS = {
  custom: { name: "Custom", dailyDD: 0, totalDD: 0, description: "Enter your own rules" },
  ftmo: { name: "FTMO", dailyDD: 5, totalDD: 10, description: "Most popular prop firm" },
  fundedNext: { name: "Funded Next", dailyDD: 5, totalDD: 10, description: "Fast payouts" },
  myForexFunds: { name: "My Forex Funds", dailyDD: 5, totalDD: 12, description: "Flexible rules" },
  theForexFunder: { name: "The Funded Trader", dailyDD: 5, totalDD: 10, description: "Multiple account sizes" },
  e8Funding: { name: "E8 Funding", dailyDD: 5, totalDD: 8, description: "Strict but fair" },
  trueForexFunds: { name: "True Forex Funds", dailyDD: 5, totalDD: 10, description: "Good for beginners" },
  topTierTrader: { name: "Top Tier Trader", dailyDD: 3, totalDD: 6, description: "Very strict rules" },
};

const ACCOUNT_SIZE_PRESETS = [
  { value: 5000, label: "$5K" },
  { value: 10000, label: "$10K" },
  { value: 25000, label: "$25K" },
  { value: 50000, label: "$50K" },
  { value: 100000, label: "$100K" },
  { value: 200000, label: "$200K" },
];

const PropFirmProtector = () => {
  const [selectedFirm, setSelectedFirm] = useState<string>("ftmo");
  const [accountSize, setAccountSize] = useState<number>(100000);
  const [currentBalance, setCurrentBalance] = useState<number>(100000);
  const [maxDailyDrawdown, setMaxDailyDrawdown] = useState<number>(5);
  const [maxTotalDrawdown, setMaxTotalDrawdown] = useState<number>(10);
  const [stopLossPips, setStopLossPips] = useState<number>(20);
  const [todaysLoss, setTodaysLoss] = useState<number>(0);

  // When firm changes, update the DD values
  const handleFirmChange = (firmKey: string) => {
    setSelectedFirm(firmKey);
    const firm = PROP_FIRM_PRESETS[firmKey as keyof typeof PROP_FIRM_PRESETS];
    if (firm && firmKey !== "custom") {
      setMaxDailyDrawdown(firm.dailyDD);
      setMaxTotalDrawdown(firm.totalDD);
    }
  };

  const calculations = useMemo(() => {
    // Daily drawdown is calculated from starting balance of the day (account size for simplicity)
    const dailyLossLimit = (maxDailyDrawdown / 100) * accountSize;
    const dailyLossRemaining = Math.max(0, dailyLossLimit - todaysLoss);
    
    // Total drawdown from initial account size
    const totalLossLimit = (maxTotalDrawdown / 100) * accountSize;
    const totalLossUsed = accountSize - currentBalance;
    const totalLossRemaining = Math.max(0, totalLossLimit - totalLossUsed);
    
    // The effective limit is whichever is smaller
    const effectiveLossRemaining = Math.min(dailyLossRemaining, totalLossRemaining);
    const isLimitedByDaily = dailyLossRemaining <= totalLossRemaining;
    
    // Breach thresholds
    const dailyBreachThreshold = accountSize - dailyLossLimit;
    const totalBreachThreshold = accountSize - totalLossLimit;
    
    // Progress percentages (how much of the limit is used)
    const dailyProgress = (todaysLoss / dailyLossLimit) * 100;
    const totalProgress = (totalLossUsed / totalLossLimit) * 100;
    
    // Risk status
    const isInDanger = dailyProgress >= 70 || totalProgress >= 70;
    const isCritical = dailyProgress >= 90 || totalProgress >= 90;
    const isBreached = dailyProgress >= 100 || totalProgress >= 100;
    
    // Recovery mode
    const isInRecovery = currentBalance < accountSize;
    const recoveryNeeded = accountSize - currentBalance;
    const recoveryPercent = ((accountSize - currentBalance) / accountSize) * 100;
    
    // Lot size calculation (assuming standard lot = $10/pip for major pairs)
    const pipValue = 10; // Standard lot pip value in USD
    const maxLotSize = effectiveLossRemaining / (stopLossPips * pipValue);
    
    // Conservative risk suggestions based on status
    let suggestedRiskPercent = 1;
    let suggestedLotSize = 0;
    
    if (isBreached) {
      suggestedRiskPercent = 0;
      suggestedLotSize = 0;
    } else if (isCritical) {
      suggestedRiskPercent = 0.25;
    } else if (isInDanger) {
      suggestedRiskPercent = 0.5;
    } else if (isInRecovery) {
      suggestedRiskPercent = 0.5;
    } else {
      suggestedRiskPercent = 1;
    }
    
    suggestedLotSize = (currentBalance * (suggestedRiskPercent / 100)) / (stopLossPips * pipValue);
    
    // Number of trades possible at suggested risk
    const tradesRemaining = effectiveLossRemaining / (suggestedLotSize * stopLossPips * pipValue);
    
    return {
      dailyLossLimit,
      dailyLossRemaining,
      totalLossLimit,
      totalLossUsed,
      totalLossRemaining,
      effectiveLossRemaining,
      isLimitedByDaily,
      dailyBreachThreshold,
      totalBreachThreshold,
      dailyProgress,
      totalProgress,
      isInDanger,
      isCritical,
      isBreached,
      isInRecovery,
      recoveryNeeded,
      recoveryPercent,
      maxLotSize,
      suggestedRiskPercent,
      suggestedLotSize,
      tradesRemaining: isFinite(tradesRemaining) ? tradesRemaining : 0,
    };
  }, [accountSize, currentBalance, maxDailyDrawdown, maxTotalDrawdown, stopLossPips, todaysLoss]);

  const getStatusColor = () => {
    if (calculations.isBreached) return "bg-red-500";
    if (calculations.isCritical) return "bg-red-400";
    if (calculations.isInDanger) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${getStatusColor()}`}>
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Prop Firm Protector</h1>
            <p className="text-muted-foreground">Never blow your account again</p>
          </div>
        </div>

        {/* Breach Alert */}
        {calculations.isBreached && (
          <Alert variant="destructive" className="animate-pulse">
            <XCircle className="h-5 w-5" />
            <AlertTitle className="text-lg">⚠️ STOP TRADING NOW!</AlertTitle>
            <AlertDescription className="text-base">
              You have breached your drawdown limit. Trading more will result in account termination.
              Contact your prop firm for next steps.
            </AlertDescription>
          </Alert>
        )}

        {/* Critical Warning */}
        {calculations.isCritical && !calculations.isBreached && (
          <Alert className="border-red-500 bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <AlertTitle className="text-red-500">CRITICAL: You're 1 bad trade away from breach!</AlertTitle>
            <AlertDescription>
              You've used over 90% of your drawdown limit. Consider stopping for today.
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Setup */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Setup
            </CardTitle>
            <CardDescription>Select your prop firm - we know the rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prop Firm</Label>
                <Select value={selectedFirm} onValueChange={handleFirmChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your prop firm" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROP_FIRM_PRESETS).map(([key, firm]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span>{firm.name}</span>
                          {key !== "custom" && (
                            <span className="text-xs text-muted-foreground">
                              {firm.dailyDD}% daily / {firm.totalDD}% total
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Account Size</Label>
                <div className="flex gap-2 flex-wrap">
                  {ACCOUNT_SIZE_PRESETS.map((preset) => (
                    <Badge
                      key={preset.value}
                      variant={accountSize === preset.value ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => {
                        setAccountSize(preset.value);
                        if (currentBalance === accountSize || currentBalance > preset.value) {
                          setCurrentBalance(preset.value);
                        }
                      }}
                    >
                      {preset.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {selectedFirm === "custom" && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Max Daily Drawdown %</Label>
                  <Input
                    type="number"
                    value={maxDailyDrawdown}
                    onChange={(e) => setMaxDailyDrawdown(parseFloat(e.target.value) || 0)}
                    step="0.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Total Drawdown %</Label>
                  <Input
                    type="number"
                    value={maxTotalDrawdown}
                    onChange={(e) => setMaxTotalDrawdown(parseFloat(e.target.value) || 0)}
                    step="0.5"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Trading */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Today's Trading
            </CardTitle>
            <CardDescription>Update these as you trade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Current Balance ($)</Label>
                <Input
                  type="number"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(parseFloat(e.target.value) || 0)}
                  className="text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label>Today's Loss So Far ($)</Label>
                <Input
                  type="number"
                  value={todaysLoss}
                  onChange={(e) => setTodaysLoss(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">Enter positive number (e.g., 500 if you lost $500)</p>
              </div>
              <div className="space-y-2">
                <Label>Your Stop Loss (pips)</Label>
                <Input
                  type="number"
                  value={stopLossPips}
                  onChange={(e) => setStopLossPips(parseFloat(e.target.value) || 1)}
                  className="text-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Daily Limit */}
          <Card className={calculations.dailyProgress >= 70 ? "border-yellow-500" : ""}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Daily Limit</CardTitle>
                <Badge variant={calculations.dailyProgress >= 90 ? "destructive" : "secondary"}>
                  {calculations.dailyProgress.toFixed(0)}% used
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Progress 
                  value={Math.min(calculations.dailyProgress, 100)} 
                  className="h-4"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">You can lose</p>
                  <p className="text-2xl font-bold text-green-500">
                    ${calculations.dailyLossRemaining.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">more today</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Daily limit</p>
                  <p className="text-xl font-semibold">
                    ${calculations.dailyLossLimit.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">({maxDailyDrawdown}%)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Limit */}
          <Card className={calculations.totalProgress >= 70 ? "border-yellow-500" : ""}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Total Limit</CardTitle>
                <Badge variant={calculations.totalProgress >= 90 ? "destructive" : "secondary"}>
                  {calculations.totalProgress.toFixed(0)}% used
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Progress 
                  value={Math.min(calculations.totalProgress, 100)} 
                  className="h-4"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Buffer remaining</p>
                  <p className="text-2xl font-bold text-green-500">
                    ${calculations.totalLossRemaining.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">until breach</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total limit</p>
                  <p className="text-xl font-semibold">
                    ${calculations.totalLossLimit.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">({maxTotalDrawdown}%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* THE ANSWER - What lot size to use */}
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="h-6 w-6 text-primary" />
              Your Safe Trading Zone
            </CardTitle>
            <CardDescription>
              Based on your {stopLossPips} pip stop loss
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Max Lot Size */}
              <div className="text-center p-4 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Maximum Lot Size</p>
                <p className="text-4xl font-bold text-red-500">
                  {calculations.maxLotSize.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Absolute max (uses all remaining buffer)
                </p>
              </div>

              {/* Suggested Lot Size */}
              <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary">
                <p className="text-sm text-muted-foreground mb-1">Recommended Lot Size</p>
                <p className="text-4xl font-bold text-primary">
                  {calculations.suggestedLotSize.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {calculations.suggestedRiskPercent}% risk per trade
                </p>
              </div>

              {/* Trades Remaining */}
              <div className="text-center p-4 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Trades Remaining</p>
                <p className="text-4xl font-bold text-green-500">
                  {Math.floor(calculations.tradesRemaining)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  at recommended size
                </p>
              </div>
            </div>

            {/* Plain English Explanation */}
            <Alert className="bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>In plain English:</strong> With a {stopLossPips} pip stop loss, 
                trade at <strong>{calculations.suggestedLotSize.toFixed(2)} lots</strong> or less. 
                This means you can take approximately <strong>{Math.floor(calculations.tradesRemaining)} losing trades</strong> before 
                hitting your {calculations.isLimitedByDaily ? "daily" : "total"} limit.
                {calculations.maxLotSize > 0 && (
                  <span className="text-red-500 font-medium">
                    {" "}Never go above {calculations.maxLotSize.toFixed(2)} lots!
                  </span>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Recovery Mode */}
        {calculations.isInRecovery && !calculations.isBreached && (
          <Card className="border-yellow-500 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <TrendingDown className="h-5 w-5" />
                Recovery Mode Active
              </CardTitle>
              <CardDescription>
                You're ${calculations.recoveryNeeded.toFixed(0)} ({calculations.recoveryPercent.toFixed(1)}%) below your starting balance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Recovery Strategy
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Reduce risk to {calculations.suggestedRiskPercent}% per trade</li>
                    <li>• Focus on A+ setups only</li>
                    <li>• Max 2-3 trades per day</li>
                    <li>• Take partial profits early</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Path Back to 100%
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    At {calculations.suggestedRiskPercent}% risk, you need approximately{" "}
                    <strong>{Math.ceil(calculations.recoveryNeeded / (currentBalance * (calculations.suggestedRiskPercent / 100)))}</strong>{" "}
                    winning trades at 1:1 RR to recover.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rules Reminder */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Your Account Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground">Account Size</p>
                <p className="text-lg font-bold">${accountSize.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground">Daily Max Loss</p>
                <p className="text-lg font-bold">${calculations.dailyLossLimit.toFixed(0)}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground">Total Max Loss</p>
                <p className="text-lg font-bold">${calculations.totalLossLimit.toFixed(0)}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground">Breach At</p>
                <p className="text-lg font-bold text-red-500">${calculations.totalBreachThreshold.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PropFirmProtector;