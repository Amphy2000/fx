import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Brain, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { Badge } from "@/components/ui/badge";

const CURRENCY_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD",
  "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY", "XAU/USD", "BTC/USD"
];

const EMOTIONS = [
  "confident", "calm", "excited", "anxious", "fearful", "greedy",
  "uncertain", "patient", "impulsive", "focused", "stressed"
];

export default function TradeCopilot() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    pair: "",
    direction: "long",
    entry_price: "",
    stop_loss: "",
    take_profit: "",
    emotion_before: "confident"
  });

  const handleAnalyze = async () => {
    if (!formData.pair || !formData.entry_price || !formData.stop_loss || !formData.take_profit) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('trade-copilot', {
        body: formData
      });

      // Handle non-2xx and rate/credits explicitly
      if (error) {
        const status = (error as any)?.status;
        if (status === 402 || error.message?.includes('Insufficient credits')) {
          toast.error("Insufficient AI credits", {
            description: "Upgrade your plan to continue using Trade Copilot",
            action: { label: "Upgrade", onClick: () => navigate("/pricing") }
          });
          return;
        }
        if (status === 429) {
          toast.error("AI is rate limited", {
            description: "Please wait a moment and try again."
          });
          return;
        }
        if (status === 401) {
          toast.error("Sign in required", {
            description: "Please sign in to use Trade Copilot",
            action: { label: "Sign in", onClick: () => navigate("/auth") }
          });
          return;
        }

        // Try to surface any fallback from server in the error message text
        const fallbackMatch = error.message?.match(/fallback[:=]\s?([^}]+)$/);
        if (fallbackMatch?.[1]) {
          toast.error("Trade Copilot Unavailable", { description: fallbackMatch[1] });
        } else {
          toast.error("Trade Copilot Unavailable", { description: "AI Copilot is temporarily unavailable. Please try again in a few minutes." });
        }
        return;
      }

      // If server returned ok:false fallback, surface gracefully
      if (data && (data.ok === false || data.error)) {
        toast.error("Trade Copilot Unavailable", {
          description: data.fallback || data.error || "Please try again in a few minutes."
        });
        return;
      }

      setAnalysis(data.analysis);
      setStatistics(data.statistics);
      setShowFeedback(true);
      setFeedbackSubmitted(false);
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error('Copilot error:', error);
      
      // Show fallback message if provided
      if (error.message?.includes('fallback')) {
        const fallbackMatch = error.message.match(/fallback: (.+)/);
        const fallbackMsg = fallbackMatch ? fallbackMatch[1] : 'Service temporarily unavailable';
        toast.error("Trade Copilot Unavailable", {
          description: fallbackMsg
        });
      } else if (error.message?.includes('Edge Function returned a non-2xx status code')) {
        toast.error("Trade Copilot Unavailable", {
          description: "AI Copilot is temporarily unavailable. Please try again in a few minutes."
        });
      } else {
        toast.error("Failed to analyze trade", {
          description: error.message || "Please try again in a moment"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (helpful: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('copilot_feedback').insert([{
        user_id: user.id,
        trade_setup: formData as any,
        analysis_result: analysis || '',
        feedback: helpful
      }]);
      
      setFeedbackSubmitted(true);
      toast.success(helpful ? "Thanks for the positive feedback!" : "Thanks for your feedback. We'll improve!");
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Brain className="h-10 w-10 text-primary" />
              Trade Copilot
            </h1>
            <p className="text-muted-foreground mt-2">
              AI-powered pre-trade analysis based on your personal trading patterns
            </p>
          </div>
          <Badge variant="default" className="text-lg px-4 py-2">
            <TrendingUp className="h-4 w-4 mr-2" />
            Premium Feature
          </Badge>
        </div>

        <CreditsDisplay />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Trade Setup</CardTitle>
              <CardDescription>
                Enter your planned trade details for AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pair">Currency Pair *</Label>
                <Select
                  value={formData.pair}
                  onValueChange={(value) => setFormData({ ...formData, pair: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pair" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_PAIRS.map((pair) => (
                      <SelectItem key={pair} value={pair}>
                        {pair}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direction">Direction *</Label>
                <Select
                  value={formData.direction}
                  onValueChange={(value) => setFormData({ ...formData, direction: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">Long (Buy)</SelectItem>
                    <SelectItem value="short">Short (Sell)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entry">Entry Price *</Label>
                  <Input
                    id="entry"
                    type="number"
                    step="0.00001"
                    placeholder="1.0850"
                    value={formData.entry_price}
                    onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sl">Stop Loss *</Label>
                  <Input
                    id="sl"
                    type="number"
                    step="0.00001"
                    placeholder="1.0800"
                    value={formData.stop_loss}
                    onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tp">Take Profit *</Label>
                  <Input
                    id="tp"
                    type="number"
                    step="0.00001"
                    placeholder="1.0950"
                    value={formData.take_profit}
                    onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emotion">How are you feeling?</Label>
                <Select
                  value={formData.emotion_before}
                  onValueChange={(value) => setFormData({ ...formData, emotion_before: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMOTIONS.map((emotion) => (
                      <SelectItem key={emotion} value={emotion}>
                        {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Your Trade...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Analyze Trade (3 Credits)
                  </>
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center mt-2">
                💡 AI learns and adapts as you log more trades. More data = smarter insights.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {statistics && (
              <Card className="animate-fade-in">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Analysis Overview</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {statistics.mode}
                    </Badge>
                  </div>
                  <CardDescription>
                    Based on {statistics.tradeCount} logged trade{statistics.tradeCount !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {statistics.pairWinRate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Pair Win Rate</p>
                      <p className="text-2xl font-bold">{statistics.pairWinRate}%</p>
                    </div>
                  )}
                  {statistics.directionWinRate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Direction Win Rate</p>
                      <p className="text-2xl font-bold">{statistics.directionWinRate}%</p>
                    </div>
                  )}
                  {statistics.emotionWinRate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Emotion Win Rate</p>
                      <p className="text-2xl font-bold">{statistics.emotionWinRate}%</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Risk:Reward</p>
                    <p className="text-2xl font-bold">1:{statistics.riskRewardRatio}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {analysis ? (
              <Card className="border-primary animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    AI Analysis
                  </CardTitle>
                  <CardDescription>
                    {statistics?.mode === 'General AI Mode' 
                      ? 'Universal trading intelligence for new traders'
                      : statistics?.mode === 'Hybrid AI Mode'
                      ? 'Blending personal patterns with trading fundamentals'
                      : 'Deep personalized insights from your trading history'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {analysis}
                  </div>
                  
                  {showFeedback && !feedbackSubmitted && (
                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm text-muted-foreground mb-3">Was this recommendation helpful?</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFeedback(true)}
                          className="flex-1"
                        >
                          👍 Yes, helpful
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFeedback(false)}
                          className="flex-1"
                        >
                          👎 Not helpful
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {feedbackSubmitted && (
                    <div className="border-t pt-4 mt-4 text-center">
                      <p className="text-sm text-muted-foreground">✓ Thanks for your feedback!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                    How It Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex gap-3">
                    <div className="rounded-full bg-primary/10 p-2 h-fit">
                      <span className="text-primary font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Pattern Recognition</p>
                      <p>Analyzes your last 50 trades to identify winning and losing patterns</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="rounded-full bg-primary/10 p-2 h-fit">
                      <span className="text-primary font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Risk Assessment</p>
                      <p>Evaluates risk/reward ratio and compares with your historical performance</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="rounded-full bg-primary/10 p-2 h-fit">
                      <span className="text-primary font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Psychological Check</p>
                      <p>Considers your emotional state based on past trades in similar conditions</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="rounded-full bg-primary/10 p-2 h-fit">
                      <span className="text-primary font-bold">4</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Action Recommendation</p>
                      <p>Provides clear guidance on whether to take the trade or adjust parameters</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
