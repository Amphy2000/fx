import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Brain, 
  Heart, 
  AlertTriangle, 
  TrendingDown,
  Shield,
  Moon,
  Coffee,
  Frown,
  Meh,
  Smile,
  Zap,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EmotionalRiskIntegrationProps {
  userId: string;
  currentRiskPercent: number;
  onRiskAdjustment: (suggestedRisk: number, reason: string) => void;
}

interface CheckInData {
  mood: string;
  confidence: number;
  stress: number;
  sleep_hours: number;
  focus_level: number;
}

interface EmotionalRiskScore {
  score: number; // 0-100, higher = more risk tolerance
  suggestedRiskMultiplier: number; // 0.25 to 1.0
  factors: { name: string; impact: "positive" | "negative" | "neutral"; weight: number }[];
  recommendation: string;
  alertLevel: "green" | "yellow" | "red";
}

export const EmotionalRiskIntegration = ({
  userId,
  currentRiskPercent,
  onRiskAdjustment
}: EmotionalRiskIntegrationProps) => {
  const [todayCheckIn, setTodayCheckIn] = useState<CheckInData | null>(null);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskScore, setRiskScore] = useState<EmotionalRiskScore | null>(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get today's check-in
      const today = new Date().toISOString().split("T")[0];
      const { data: checkIn } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", userId)
        .eq("check_in_date", today)
        .single();

      // Get recent trades
      const { data: trades } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      setTodayCheckIn(checkIn);
      setRecentTrades(trades || []);
      
      if (checkIn || trades?.length) {
        calculateRiskScore(checkIn, trades || []);
      }
    } catch (error) {
      console.error("Error fetching emotional data:", error);
    }
    setLoading(false);
  };

  const calculateRiskScore = (checkIn: CheckInData | null, trades: any[]) => {
    const factors: { name: string; impact: "positive" | "negative" | "neutral"; weight: number }[] = [];
    let totalWeight = 0;
    let positiveWeight = 0;

    // Check-in based factors
    if (checkIn) {
      // Mood
      if (["excited", "confident", "focused"].includes(checkIn.mood)) {
        factors.push({ name: "Positive mood", impact: "positive", weight: 15 });
        positiveWeight += 15;
      } else if (["anxious", "frustrated", "tired"].includes(checkIn.mood)) {
        factors.push({ name: `${checkIn.mood} mood detected`, impact: "negative", weight: 20 });
      } else {
        factors.push({ name: "Neutral mood", impact: "neutral", weight: 10 });
        positiveWeight += 5;
      }
      totalWeight += 20;

      // Confidence
      if (checkIn.confidence >= 7) {
        factors.push({ name: "High confidence", impact: "positive", weight: 15 });
        positiveWeight += 15;
      } else if (checkIn.confidence <= 3) {
        factors.push({ name: "Low confidence", impact: "negative", weight: 15 });
      }
      totalWeight += 15;

      // Stress
      if (checkIn.stress <= 3) {
        factors.push({ name: "Low stress", impact: "positive", weight: 15 });
        positiveWeight += 15;
      } else if (checkIn.stress >= 7) {
        factors.push({ name: "High stress level", impact: "negative", weight: 20 });
      }
      totalWeight += 20;

      // Sleep
      if (checkIn.sleep_hours >= 7) {
        factors.push({ name: "Well rested", impact: "positive", weight: 15 });
        positiveWeight += 15;
      } else if (checkIn.sleep_hours < 5) {
        factors.push({ name: "Sleep deprived", impact: "negative", weight: 20 });
      }
      totalWeight += 20;

      // Focus
      if (checkIn.focus_level >= 7) {
        factors.push({ name: "High focus", impact: "positive", weight: 15 });
        positiveWeight += 15;
      } else if (checkIn.focus_level <= 3) {
        factors.push({ name: "Poor focus", impact: "negative", weight: 15 });
      }
      totalWeight += 15;
    }

    // Trade-based factors
    if (trades.length >= 3) {
      const recentLosses = trades.slice(0, 5).filter(t => t.result === "loss").length;
      if (recentLosses >= 3) {
        factors.push({ name: `${recentLosses} recent losses`, impact: "negative", weight: 25 });
        totalWeight += 25;
      } else if (recentLosses === 0 && trades.slice(0, 3).every(t => t.result === "win")) {
        factors.push({ name: "Winning streak", impact: "positive", weight: 10 });
        positiveWeight += 10;
        totalWeight += 10;
      }
    }

    // Calculate score
    const score = totalWeight > 0 ? (positiveWeight / totalWeight) * 100 : 50;
    
    // Calculate risk multiplier
    let suggestedRiskMultiplier = 1;
    let alertLevel: "green" | "yellow" | "red" = "green";
    let recommendation = "";

    if (score >= 70) {
      suggestedRiskMultiplier = 1;
      alertLevel = "green";
      recommendation = "You're in a great mental state. Trade your normal size with confidence.";
    } else if (score >= 50) {
      suggestedRiskMultiplier = 0.75;
      alertLevel = "yellow";
      recommendation = "Consider reducing position size by 25%. Some factors suggest caution.";
    } else if (score >= 30) {
      suggestedRiskMultiplier = 0.5;
      alertLevel = "yellow";
      recommendation = "Reduce position size by 50%. Multiple stress factors detected.";
    } else {
      suggestedRiskMultiplier = 0.25;
      alertLevel = "red";
      recommendation = "High-risk mental state. Trade at 25% size or consider sitting out.";
    }

    setRiskScore({
      score,
      suggestedRiskMultiplier,
      factors,
      recommendation,
      alertLevel
    });
  };

  const getMoodIcon = (mood: string) => {
    if (["excited", "confident", "focused"].includes(mood)) return <Smile className="h-4 w-4 text-green-400" />;
    if (["anxious", "frustrated", "tired"].includes(mood)) return <Frown className="h-4 w-4 text-red-400" />;
    return <Meh className="h-4 w-4 text-amber-400" />;
  };

  const getAlertStyles = (level: "green" | "yellow" | "red") => {
    switch (level) {
      case "green": return "bg-green-500/10 border-green-500/30 text-green-400";
      case "yellow": return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      case "red": return "bg-red-500/10 border-red-500/30 text-red-400";
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-purple-950/20 border-none rounded-3xl animate-pulse">
        <CardContent className="p-6 h-48 flex items-center justify-center">
          <Activity className="h-8 w-8 text-white/20 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-purple-950/20 border-none rounded-3xl overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 rounded-xl">
              <Brain className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-white text-lg font-bold">
                Mental State Analysis
              </CardTitle>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-0.5">
                Emotional Risk Integration
              </p>
            </div>
          </div>
          {riskScore && (
            <Badge className={`${getAlertStyles(riskScore.alertLevel)} text-[10px] px-3 py-1`}>
              {riskScore.alertLevel === "green" && "OPTIMAL"}
              {riskScore.alertLevel === "yellow" && "CAUTION"}
              {riskScore.alertLevel === "red" && "HIGH RISK"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        {!todayCheckIn ? (
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <AlertTitle className="text-amber-400">No check-in today</AlertTitle>
            <AlertDescription className="text-amber-400/80">
              Complete your daily check-in for personalized risk recommendations
            </AlertDescription>
          </Alert>
        ) : riskScore && (
          <>
            {/* Main Score Display */}
            <div className={`p-6 rounded-2xl border ${getAlertStyles(riskScore.alertLevel)}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-60">Mental Readiness Score</p>
                  <p className="text-4xl font-black">{riskScore.score.toFixed(0)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold opacity-60">Suggested Risk</p>
                  <p className="text-2xl font-bold">
                    {(currentRiskPercent * riskScore.suggestedRiskMultiplier).toFixed(2)}%
                  </p>
                  <p className="text-[9px] opacity-60">
                    ({(riskScore.suggestedRiskMultiplier * 100).toFixed(0)}% of normal)
                  </p>
                </div>
              </div>
              <Progress value={riskScore.score} className="h-2 mb-3" />
              <p className="text-sm font-medium">{riskScore.recommendation}</p>
            </div>

            {/* Today's Check-in Summary */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-[10px] text-white/40 uppercase font-bold mb-3">Today's Check-in</p>
              <div className="grid grid-cols-5 gap-2 text-center">
                <div>
                  <div className="flex justify-center mb-1">
                    {getMoodIcon(todayCheckIn.mood)}
                  </div>
                  <p className="text-[9px] text-white/40">Mood</p>
                  <p className="text-xs font-bold text-white capitalize">{todayCheckIn.mood}</p>
                </div>
                <div>
                  <Heart className="h-4 w-4 mx-auto text-red-400 mb-1" />
                  <p className="text-[9px] text-white/40">Stress</p>
                  <p className="text-xs font-bold text-white">{todayCheckIn.stress}/10</p>
                </div>
                <div>
                  <Zap className="h-4 w-4 mx-auto text-amber-400 mb-1" />
                  <p className="text-[9px] text-white/40">Confidence</p>
                  <p className="text-xs font-bold text-white">{todayCheckIn.confidence}/10</p>
                </div>
                <div>
                  <Moon className="h-4 w-4 mx-auto text-blue-400 mb-1" />
                  <p className="text-[9px] text-white/40">Sleep</p>
                  <p className="text-xs font-bold text-white">{todayCheckIn.sleep_hours}h</p>
                </div>
                <div>
                  <Coffee className="h-4 w-4 mx-auto text-orange-400 mb-1" />
                  <p className="text-[9px] text-white/40">Focus</p>
                  <p className="text-xs font-bold text-white">{todayCheckIn.focus_level}/10</p>
                </div>
              </div>
            </div>

            {/* Risk Factors */}
            <div className="space-y-2">
              <p className="text-[10px] text-white/40 uppercase font-bold">Risk Factors</p>
              <div className="grid gap-2">
                {riskScore.factors.map((factor, i) => (
                  <div 
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-lg border
                      ${factor.impact === "positive" ? "bg-green-500/10 border-green-500/20" : ""}
                      ${factor.impact === "negative" ? "bg-red-500/10 border-red-500/20" : ""}
                      ${factor.impact === "neutral" ? "bg-white/5 border-white/10" : ""}
                    `}
                  >
                    <span className="text-sm font-medium text-white/80">{factor.name}</span>
                    <Badge className={`text-[9px] ${
                      factor.impact === "positive" ? "bg-green-500/20 text-green-400" :
                      factor.impact === "negative" ? "bg-red-500/20 text-red-400" :
                      "bg-white/10 text-white/60"
                    }`}>
                      {factor.impact === "positive" ? "+" : factor.impact === "negative" ? "-" : "○"} {factor.weight}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Apply Button */}
            {riskScore.suggestedRiskMultiplier < 1 && (
              <Button 
                className="w-full h-12 font-bold bg-purple-600 hover:bg-purple-700"
                onClick={() => onRiskAdjustment(
                  currentRiskPercent * riskScore.suggestedRiskMultiplier,
                  riskScore.recommendation
                )}
              >
                <Shield className="h-4 w-4 mr-2" />
                Apply Suggested Risk ({(currentRiskPercent * riskScore.suggestedRiskMultiplier).toFixed(2)}%)
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
