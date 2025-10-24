import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, Wallet, DollarSign, Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

type InstrumentType = "forex" | "jpy" | "gold" | "silver" | "oil" | "btc" | "eth";

interface InstrumentConfig {
  pipMultiplier: number;
  contractSize: number;
  pipValue: number;
  decimals: number;
}

const instrumentConfigs: Record<InstrumentType, InstrumentConfig> = {
  forex: { pipMultiplier: 10000, contractSize: 100000, pipValue: 10, decimals: 5 },
  jpy: { pipMultiplier: 100, contractSize: 100000, pipValue: 9.09, decimals: 3 },
  gold: { pipMultiplier: 100, contractSize: 100, pipValue: 1, decimals: 2 },
  silver: { pipMultiplier: 1000, contractSize: 5000, pipValue: 5, decimals: 3 },
  oil: { pipMultiplier: 100, contractSize: 1000, pipValue: 10, decimals: 2 },
  btc: { pipMultiplier: 1, contractSize: 1, pipValue: 1, decimals: 2 },
  eth: { pipMultiplier: 100, contractSize: 1, pipValue: 0.01, decimals: 2 },
};

const Calculators = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [lastTrade, setLastTrade] = useState<any>(null);
  const [instrumentType, setInstrumentType] = useState<InstrumentType>("forex");

  // Lot Size Calculator State
  const [lotSize, setLotSize] = useState({
    accountBalance: "",
    riskPercentage: "2",
    stopLossPips: "",
    pipValue: "10",
    result: null as number | null,
  });

  // Margin Calculator State
  const [margin, setMargin] = useState({
    lotSize: "",
    leverage: "100",
    contractSize: "100000",
    exchangeRate: "1",
    result: null as number | null,
  });

  // P&L Calculator State
  const [pnl, setPnl] = useState({
    entryPrice: "",
    exitPrice: "",
    lotSize: "",
    direction: "buy",
    pipValue: "10",
    result: null as number | null,
    pips: null as number | null,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchUserData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    // Fetch profile for account balance
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch last trade for pre-filling
    const { data: tradesData } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (tradesData && tradesData.length > 0) {
      setLastTrade(tradesData[0]);
      // Detect instrument type from pair
      const pair = tradesData[0].pair?.toUpperCase() || "";
      let detectedType: InstrumentType = "forex";
      
      if (pair.includes("JPY")) detectedType = "jpy";
      else if (pair.includes("XAU") || pair.includes("GOLD")) detectedType = "gold";
      else if (pair.includes("XAG") || pair.includes("SILVER")) detectedType = "silver";
      else if (pair.includes("OIL") || pair.includes("WTI") || pair.includes("BRENT")) detectedType = "oil";
      else if (pair.includes("BTC")) detectedType = "btc";
      else if (pair.includes("ETH")) detectedType = "eth";
      
      setInstrumentType(detectedType);
      
      // Pre-fill P&L calculator with last trade data
      setPnl(prev => ({
        ...prev,
        entryPrice: tradesData[0].entry_price?.toString() || "",
        exitPrice: tradesData[0].exit_price?.toString() || "",
        direction: tradesData[0].direction || "buy",
        pipValue: instrumentConfigs[detectedType].pipValue.toString(),
      }));
    }
  };

  const handleInstrumentChange = (type: InstrumentType) => {
    setInstrumentType(type);
    const config = instrumentConfigs[type];
    
    // Update all calculators with new instrument config
    setLotSize(prev => ({ ...prev, pipValue: config.pipValue.toString() }));
    setMargin(prev => ({ ...prev, contractSize: config.contractSize.toString() }));
    setPnl(prev => ({ ...prev, pipValue: config.pipValue.toString() }));
  };

  const calculateLotSize = () => {
    const balance = parseFloat(lotSize.accountBalance);
    const risk = parseFloat(lotSize.riskPercentage);
    const slPips = parseFloat(lotSize.stopLossPips);
    const pipVal = parseFloat(lotSize.pipValue);

    if (!balance || !risk || !slPips || !pipVal) {
      toast.error("Please fill all fields");
      return;
    }

    const riskAmount = (balance * risk) / 100;
    const calculatedLotSize = riskAmount / (slPips * pipVal);

    setLotSize(prev => ({ ...prev, result: parseFloat(calculatedLotSize.toFixed(2)) }));
    toast.success("Lot size calculated!");
  };

  const calculateMargin = () => {
    const lots = parseFloat(margin.lotSize);
    const lev = parseFloat(margin.leverage);
    const contract = parseFloat(margin.contractSize);
    const rate = parseFloat(margin.exchangeRate);

    if (!lots || !lev || !contract || !rate) {
      toast.error("Please fill all fields");
      return;
    }

    const requiredMargin = (lots * contract * rate) / lev;

    setMargin(prev => ({ ...prev, result: parseFloat(requiredMargin.toFixed(2)) }));
    toast.success("Margin calculated!");
  };

  const calculatePnL = () => {
    const entry = parseFloat(pnl.entryPrice);
    const exit = parseFloat(pnl.exitPrice);
    const lots = parseFloat(pnl.lotSize);
    const pipVal = parseFloat(pnl.pipValue);

    if (!entry || !exit || !lots || !pipVal) {
      toast.error("Please fill all fields");
      return;
    }

    const config = instrumentConfigs[instrumentType];
    
    let pips = 0;
    if (pnl.direction === "buy") {
      pips = (exit - entry) * config.pipMultiplier;
    } else {
      pips = (entry - exit) * config.pipMultiplier;
    }

    const profitLoss = pips * pipVal * lots;

    setPnl(prev => ({ 
      ...prev, 
      result: parseFloat(profitLoss.toFixed(2)),
      pips: parseFloat(pips.toFixed(1))
    }));
    toast.success("P&L calculated!");
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Calculator className="h-8 w-8" />
            Trading Calculators
          </h1>
          <p className="text-muted-foreground">Essential tools for risk management and trade planning</p>
        </div>

        {/* Instrument Type Selector */}
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Select Instrument Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={instrumentType} onValueChange={(value: InstrumentType) => handleInstrumentChange(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select instrument type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="forex">Forex Pairs (EUR/USD, GBP/USD)</SelectItem>
                <SelectItem value="jpy">JPY Pairs (USD/JPY, EUR/JPY)</SelectItem>
                <SelectItem value="gold">Gold (XAU/USD)</SelectItem>
                <SelectItem value="silver">Silver (XAG/USD)</SelectItem>
                <SelectItem value="oil">Oil (WTI, Brent)</SelectItem>
                <SelectItem value="btc">Bitcoin (BTC/USD)</SelectItem>
                <SelectItem value="eth">Ethereum (ETH/USD)</SelectItem>
              </SelectContent>
            </Select>
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>{instrumentType.toUpperCase()} Settings:</strong> Pip Multiplier: {instrumentConfigs[instrumentType].pipMultiplier} | 
                Contract Size: {instrumentConfigs[instrumentType].contractSize.toLocaleString()} | 
                Default Pip Value: ${instrumentConfigs[instrumentType].pipValue}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lot Size Calculator */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Lot Size Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="accountBalance">Account Balance ($)</Label>
                <Input
                  id="accountBalance"
                  type="number"
                  step="0.01"
                  value={lotSize.accountBalance}
                  onChange={(e) => setLotSize(prev => ({ ...prev, accountBalance: e.target.value }))}
                  placeholder="Enter account balance"
                />
              </div>

              <div>
                <Label htmlFor="riskPercentage">Risk Percentage (%)</Label>
                <Input
                  id="riskPercentage"
                  type="number"
                  step="0.1"
                  value={lotSize.riskPercentage}
                  onChange={(e) => setLotSize(prev => ({ ...prev, riskPercentage: e.target.value }))}
                  placeholder="2"
                />
              </div>

              <div>
                <Label htmlFor="stopLossPips">Stop Loss (Pips)</Label>
                <Input
                  id="stopLossPips"
                  type="number"
                  value={lotSize.stopLossPips}
                  onChange={(e) => setLotSize(prev => ({ ...prev, stopLossPips: e.target.value }))}
                  placeholder="Enter stop loss in pips"
                />
              </div>

              <div>
                <Label htmlFor="pipValue">Pip Value ($)</Label>
                <Input
                  id="pipValue"
                  type="number"
                  step="0.01"
                  value={lotSize.pipValue}
                  onChange={(e) => setLotSize(prev => ({ ...prev, pipValue: e.target.value }))}
                  placeholder="10"
                />
              </div>

              <Button onClick={calculateLotSize} className="w-full">
                Calculate Lot Size
              </Button>

              {lotSize.result !== null && (
                <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Recommended Lot Size</p>
                  <p className="text-2xl font-bold text-primary">{lotSize.result} lots</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Margin Calculator */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Margin Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="marginLotSize">Lot Size</Label>
                <Input
                  id="marginLotSize"
                  type="number"
                  step="0.01"
                  value={margin.lotSize}
                  onChange={(e) => setMargin(prev => ({ ...prev, lotSize: e.target.value }))}
                  placeholder="Enter lot size"
                />
              </div>

              <div>
                <Label htmlFor="leverage">Leverage</Label>
                <Select value={margin.leverage} onValueChange={(value) => setMargin(prev => ({ ...prev, leverage: value }))}>
                  <SelectTrigger id="leverage">
                    <SelectValue placeholder="Select leverage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">1:50</SelectItem>
                    <SelectItem value="100">1:100</SelectItem>
                    <SelectItem value="200">1:200</SelectItem>
                    <SelectItem value="500">1:500</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="contractSize">Contract Size</Label>
                <Input
                  id="contractSize"
                  type="number"
                  value={margin.contractSize}
                  onChange={(e) => setMargin(prev => ({ ...prev, contractSize: e.target.value }))}
                  placeholder="100000"
                />
              </div>

              <div>
                <Label htmlFor="exchangeRate">Exchange Rate</Label>
                <Input
                  id="exchangeRate"
                  type="number"
                  step="0.0001"
                  value={margin.exchangeRate}
                  onChange={(e) => setMargin(prev => ({ ...prev, exchangeRate: e.target.value }))}
                  placeholder="1.0000"
                />
              </div>

              <Button onClick={calculateMargin} className="w-full">
                Calculate Margin
              </Button>

              {margin.result !== null && (
                <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Required Margin</p>
                  <p className="text-2xl font-bold text-primary">${margin.result.toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* P&L Calculator */}
          <Card className="border-primary/20 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Profit & Loss Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="entryPrice">Entry Price</Label>
                  <Input
                    id="entryPrice"
                    type="number"
                    step={1 / instrumentConfigs[instrumentType].pipMultiplier}
                    value={pnl.entryPrice}
                    onChange={(e) => setPnl(prev => ({ ...prev, entryPrice: e.target.value }))}
                    placeholder={instrumentType === "btc" ? "45000" : instrumentType === "gold" ? "1950.00" : "1.0500"}
                  />
                </div>

                <div>
                  <Label htmlFor="exitPrice">Exit Price</Label>
                  <Input
                    id="exitPrice"
                    type="number"
                    step={1 / instrumentConfigs[instrumentType].pipMultiplier}
                    value={pnl.exitPrice}
                    onChange={(e) => setPnl(prev => ({ ...prev, exitPrice: e.target.value }))}
                    placeholder={instrumentType === "btc" ? "46000" : instrumentType === "gold" ? "1960.00" : "1.0550"}
                  />
                </div>

                <div>
                  <Label htmlFor="pnlLotSize">Lot Size</Label>
                  <Input
                    id="pnlLotSize"
                    type="number"
                    step="0.01"
                    value={pnl.lotSize}
                    onChange={(e) => setPnl(prev => ({ ...prev, lotSize: e.target.value }))}
                    placeholder="1.0"
                  />
                </div>

                <div>
                  <Label htmlFor="direction">Direction</Label>
                  <Select value={pnl.direction} onValueChange={(value) => setPnl(prev => ({ ...prev, direction: value }))}>
                    <SelectTrigger id="direction">
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="sell">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="pnlPipValue">Pip Value ($)</Label>
                  <Input
                    id="pnlPipValue"
                    type="number"
                    step="0.01"
                    value={pnl.pipValue}
                    onChange={(e) => setPnl(prev => ({ ...prev, pipValue: e.target.value }))}
                    placeholder="10"
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={calculatePnL} className="w-full">
                    Calculate P&L
                  </Button>
                </div>
              </div>

              {pnl.result !== null && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Pips</p>
                    <p className={`text-2xl font-bold ${(pnl.pips || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {pnl.pips?.toFixed(1)} pips
                    </p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Profit/Loss</p>
                    <p className={`text-2xl font-bold ${pnl.result >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${pnl.result.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Calculators;
