import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, Heart, CheckCircle2, ArrowRight, X, Zap, Mic, Camera, MessageSquare, Target, LineChart } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { awardCredits, CREDIT_REWARDS } from "@/utils/creditManager";

const OnboardingStep = ({ 
  children, 
  title, 
  description, 
  icon: Icon 
}: { 
  children: React.ReactNode; 
  title: string; 
  description: string; 
  icon: any;
}) => (
  <div className="space-y-6">
    <div className="text-center space-y-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
      </div>
    </div>
    <div className="max-w-2xl mx-auto">
      {children}
    </div>
  </div>
);

export default function OnboardingOptimized() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkInComplete, setCheckInComplete] = useState(false);

  // Check-in form state
  const [checkInData, setCheckInData] = useState({
    mood: "neutral",
    confidence: 5,
    stress: 5,
    sleep_hours: 7,
    focus_level: 5,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUserId(user.id);

    // Check if already completed onboarding
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_step')
      .eq('id', user.id)
      .single();

    if (profile?.onboarding_completed) {
      navigate("/dashboard");
    } else if (profile?.onboarding_step) {
      setCurrentStep(Math.min(profile.onboarding_step, 3)); // Max 4 steps (0-3)
    }
  };

  const updateOnboardingStep = async (step: number) => {
    if (!userId) return;
    await supabase
      .from('profiles')
      .update({ onboarding_step: step })
      .eq('id', userId);
  };

  const completeOnboarding = async () => {
    if (!userId) return;
    await supabase
      .from('profiles')
      .update({ 
        onboarding_completed: true,
        onboarding_step: 4
      })
      .eq('id', userId);
    
    toast.success("Welcome aboard! 🎉", {
      description: "You're all set to start your trading journey!"
    });
    navigate("/dashboard");
  };

  const skipToCheckIn = async () => {
    setCurrentStep(2);
    await updateOnboardingStep(2);
  };

  const skipOnboarding = async () => {
    if (!userId) {
      toast.error("Please wait while we load your account");
      return;
    }
    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_step: 4 
        })
        .eq('id', userId);
      
      toast.success("Onboarding skipped");
      navigate("/dashboard");
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      toast.error('Failed to skip. Please try again.');
    }
  };

  const handleCheckInSubmit = async () => {
    if (!userId) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('daily_checkins')
        .upsert({
          user_id: userId,
          check_in_date: today,
          ...checkInData
        }, {
          onConflict: 'user_id,check_in_date'
        });

      // Award credits for first check-in
      await awardCredits(userId, 'daily_checkin', CREDIT_REWARDS.daily_checkin, 'First daily check-in completed');

      setCheckInComplete(true);
      toast.success("First check-in complete! 🎯");
    } catch (error: any) {
      toast.error(error.message || "Failed to save check-in");
    }
  };

  const nextStep = () => {
    const next = currentStep + 1;
    setCurrentStep(next);
    updateOnboardingStep(next);
  };

  const progress = ((currentStep + 1) / 4) * 100;

  const steps = [
    // Step 0: Welcome
    <OnboardingStep
      key="welcome"
      icon={Brain}
      title="Your Biggest Enemy Isn't The Market"
      description="It's your psychology. We help you master it with AI."
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="p-8 space-y-6">
          <div className="p-6 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-xl">
            <h3 className="text-xl font-bold mb-3">What Makes Amphy Different?</h3>
            <p className="text-muted-foreground mb-4">
              <strong className="text-foreground">95% of trading failure is mental, not technical.</strong> Most journals track numbers. We track what really matters: your psychology, emotions, and behavioral patterns.
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="px-3 py-1 bg-primary/20 rounded-full text-sm font-semibold">
                AI Trade Interceptor
              </div>
              <div className="px-3 py-1 bg-primary/20 rounded-full text-sm font-semibold">
                Behavioral Pattern Recognition
              </div>
              <div className="px-3 py-1 bg-primary/20 rounded-full text-sm font-semibold">
                Mental State Tracking
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
              <Heart className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-sm mb-1">🚨 AI Trade Interceptor</h4>
                <p className="text-xs text-muted-foreground">Warns you BEFORE emotionally-driven trades based on your patterns</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
              <Target className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-sm mb-1">🧠 Mental State Tracking</h4>
                <p className="text-xs text-muted-foreground">Discover how sleep, stress & mood affect your win rate</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Mic className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-sm mb-1">Voice & Screenshot Logging</h4>
                <p className="text-xs text-muted-foreground">So easy you'll stay consistent</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <MessageSquare className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-sm mb-1">24/7 AI Coach</h4>
                <p className="text-xs text-muted-foreground">Psychology + strategy guidance</p>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <Button onClick={nextStep} size="lg" className="w-full bg-primary hover:bg-primary/90">
              Show Me How It Works
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={skipToCheckIn} variant="outline" size="lg" className="w-full">
              <Zap className="mr-2 h-4 w-4" />
              Quick Start (Skip to Check-In)
            </Button>
          </div>
        </CardContent>
      </Card>
    </OnboardingStep>,

    // Step 1: Key Features Overview
    <OnboardingStep
      key="features"
      icon={Zap}
      title="Your AI-Powered Trading System"
      description="Everything you need to master trading psychology"
    >
      <Card className="border-border/50">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">AI Trading Psychologist</h4>
                <p className="text-sm text-muted-foreground">
                  Analyzes emotions, identifies triggers, warns before mistakes
                </p>
                <p className="text-xs text-primary mt-2">💎 5 credits per analysis</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Effortless Logging</h4>
                <p className="text-sm text-muted-foreground">
                  Voice or screenshot - AI extracts everything automatically
                </p>
                <p className="text-xs text-primary mt-2">💎 1-3 credits per extraction</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <LineChart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Pattern Recognition</h4>
                <p className="text-sm text-muted-foreground">
                  AI discovers hidden patterns in your behavior and performance
                </p>
                <p className="text-xs text-muted-foreground mt-2">Free feature</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg border">
            <p className="text-sm text-center">
              <strong>Free Tier:</strong> 50 AI credits/month • 10 trades/month
              <br />
              <span className="text-xs text-muted-foreground">Upgrade anytime for unlimited access</span>
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={skipOnboarding} variant="outline" size="lg" className="flex-1">
              Skip Tour
            </Button>
            <Button onClick={nextStep} size="lg" className="flex-1">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </OnboardingStep>,

    // Step 2: Daily Check-In (CORE)
    <OnboardingStep
      key="checkin"
      icon={Heart}
      title="Start With Your Mind, Not Your Trades"
      description="Psychology drives 95% of your results. Let's track it."
    >
      <Card className="border-border/50">
        <CardContent className="p-6">
          {!checkInComplete ? (
            <div className="space-y-6">
              <div className="p-4 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-lg">
                <h4 className="font-semibold mb-2">Why This Matters</h4>
                <p className="text-sm text-muted-foreground">
                  Traders who track mental state <strong className="text-foreground">before trading</strong> outperform by 3.2x. AI will show you exactly how sleep, stress, and mood impact your win rate.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>How are you feeling right now?</Label>
                  <Select value={checkInData.mood} onValueChange={(value) => setCheckInData({ ...checkInData, mood: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">😄 Excellent</SelectItem>
                      <SelectItem value="good">🙂 Good</SelectItem>
                      <SelectItem value="neutral">😐 Neutral</SelectItem>
                      <SelectItem value="low">😔 Low</SelectItem>
                      <SelectItem value="anxious">😰 Anxious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Confidence Level: {checkInData.confidence}/10</Label>
                  <Slider
                    value={[checkInData.confidence]}
                    onValueChange={([value]) => setCheckInData({ ...checkInData, confidence: value })}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Stress Level: {checkInData.stress}/10</Label>
                  <Slider
                    value={[checkInData.stress]}
                    onValueChange={([value]) => setCheckInData({ ...checkInData, stress: value })}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Hours of Sleep: {checkInData.sleep_hours}</Label>
                  <Slider
                    value={[checkInData.sleep_hours]}
                    onValueChange={([value]) => setCheckInData({ ...checkInData, sleep_hours: value })}
                    max={12}
                    step={0.5}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Focus Level: {checkInData.focus_level}/10</Label>
                  <Slider
                    value={[checkInData.focus_level]}
                    onValueChange={([value]) => setCheckInData({ ...checkInData, focus_level: value })}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>

              <Button onClick={handleCheckInSubmit} size="lg" className="w-full">
                <Heart className="mr-2 h-4 w-4" />
                Complete Check-In
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Takes 60 seconds • AI analyzes how this affects your trading
              </p>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Perfect! 🎯</h3>
                <p className="text-muted-foreground">
                  You're thinking like a pro. AI will now track how your psychology affects your performance.
                </p>
              </div>
              <Button onClick={nextStep} size="lg" className="w-full">
                Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </OnboardingStep>,

    // Step 3: Completion
    <OnboardingStep
      key="complete"
      icon={CheckCircle2}
      title="You're Ready! 🚀"
      description="Start logging trades and mastering your psychology"
    >
      <Card className="border-border/50 bg-gradient-to-br from-primary/10 via-card to-card">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <p className="text-muted-foreground">Here's what to do next:</p>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-card border-2 border-primary/30 rounded-lg">
              <h4 className="font-semibold mb-1">1️⃣ Log Your First Trade</h4>
              <p className="text-sm text-muted-foreground">Use Voice Logger or Screenshot Upload in Dashboard</p>
            </div>
            
            <div className="p-4 bg-card border rounded-lg">
              <h4 className="font-semibold mb-1">2️⃣ Check Mental State Correlation</h4>
              <p className="text-sm text-muted-foreground">See how psychology impacts your performance (after 7 days)</p>
            </div>
            
            <div className="p-4 bg-card border rounded-lg">
              <h4 className="font-semibold mb-1">3️⃣ Chat with AI Coach</h4>
              <p className="text-sm text-muted-foreground">Get personalized strategy and psychology coaching</p>
            </div>
          </div>

          <Button onClick={completeOnboarding} size="lg" className="w-full">
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </OnboardingStep>,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="absolute top-4 right-4 z-50">
        <Button onClick={skipOnboarding} variant="ghost" size="sm">
          Skip All
          <X className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Step {currentStep + 1} of 3</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="max-w-4xl mx-auto">
          {steps[currentStep]}
        </div>
      </div>
    </div>
  );
}