import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Heart, Plug, CheckCircle2, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";
import TradeForm from "@/components/TradeForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [tradeLogged, setTradeLogged] = useState(false);
  const [checkInComplete, setCheckInComplete] = useState(false);
  const [mt5Connected, setMt5Connected] = useState(false);

  // Check-in form state
  const [checkInData, setCheckInData] = useState({
    mood: "neutral",
    confidence: 5,
    stress: 5,
    sleep_hours: 7,
    focus_level: 5,
  });

  // MT5 form state
  const [mt5Data, setMt5Data] = useState({
    brokerName: "",
    serverName: "",
    accountNumber: "",
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
      setCurrentStep(profile.onboarding_step);
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
        onboarding_step: 5
      })
      .eq('id', userId);
    
    toast.success("Welcome aboard! 🎉", {
      description: "You're all set to start your trading journey!"
    });
    navigate("/dashboard");
  };

  const skipOnboarding = async () => {
    if (!userId) {
      toast.error("Please wait while we load your account");
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_step: 5 
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      toast.success("Onboarding skipped");
      setTimeout(() => navigate("/dashboard"), 100);
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      toast.error('Failed to skip onboarding. Please try again.');
    }
  };

  const handleTradeAdded = () => {
    setTradeLogged(true);
    toast.success("Great job! Your first trade is logged! 📊");
  };

  const handleCheckInSubmit = async () => {
    if (!userId) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('daily_checkins')
        .upsert({
          user_id: userId,
          check_in_date: today,
          ...checkInData
        }, {
          onConflict: 'user_id,check_in_date'
        });

      if (error) throw error;
      
      setCheckInComplete(true);
      toast.success("Check-in complete! Keep it up! 💪");
    } catch (error: any) {
      toast.error(error.message || "Failed to save check-in");
    }
  };

  const handleMt5Submit = async () => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('mt5_connections')
        .insert({
          user_id: userId,
          broker_name: mt5Data.brokerName,
          server_name: mt5Data.serverName,
          account_number: mt5Data.accountNumber,
          sync_status: 'pending'
        });

      if (error) throw error;
      
      setMt5Connected(true);
      toast.success("MT5 account connected successfully! 🔗");
    } catch (error: any) {
      toast.error(error.message || "Failed to connect MT5");
    }
  };

  const nextStep = () => {
    const next = currentStep + 1;
    setCurrentStep(next);
    updateOnboardingStep(next);
  };

  const skipStep = () => {
    const next = currentStep + 1;
    setCurrentStep(next);
    updateOnboardingStep(next);
    toast.info("Step skipped");
  };

  const progress = ((currentStep + 1) / 5) * 100;

  const steps = [
    // Step 0: Welcome
    <OnboardingStep
      key="welcome"
      icon={TrendingUp}
      title="Welcome to Amphy AI"
      description="Your intelligent trading companion for better decision-making and consistent growth"
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Track Every Trade</h3>
                <p className="text-sm text-muted-foreground">Journal your trades with AI-powered insights and pattern recognition</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Monitor Your Mental State</h3>
                <p className="text-sm text-muted-foreground">Daily check-ins help you understand how emotions affect your trading</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Plug className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Connect MT5</h3>
                <p className="text-sm text-muted-foreground">Automatically sync your MetaTrader 5 trades for seamless journaling</p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button onClick={skipStep} variant="outline" size="lg" className="flex-1">
              Skip
            </Button>
            <Button onClick={nextStep} size="lg" className="flex-1">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </OnboardingStep>,

    // Step 1: Log First Trade
    <OnboardingStep
      key="trade"
      icon={TrendingUp}
      title="Log Your First Trade"
      description="Start building your trading journal by recording your first trade"
    >
      <Card className="border-border/50">
        <CardContent className="p-6">
          {!tradeLogged ? (
            <>
              <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-foreground">
                  <strong>Tip:</strong> Include as much detail as possible. The more you log, the better insights you'll receive!
                </p>
              </div>
              <TradeForm onTradeAdded={handleTradeAdded} />
              <div className="mt-4 flex justify-end">
                <Button onClick={skipStep} variant="outline" size="sm">
                  Skip this step
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Trade Logged Successfully!</h3>
                <p className="text-muted-foreground">You're building great trading habits already</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={skipStep} variant="outline" size="lg" className="flex-1">
                  Skip
                </Button>
                <Button onClick={nextStep} size="lg" className="flex-1">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </OnboardingStep>,

    // Step 2: Daily Check-In
    <OnboardingStep
      key="checkin"
      icon={Heart}
      title="Your First Check-In"
      description="Track your mental state to understand how it impacts your trading performance"
    >
      <Card className="border-border/50">
        <CardContent className="p-6">
          {!checkInComplete ? (
            <div className="space-y-6">
              <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-foreground">
                  <strong>Why check-in?</strong> Understanding your emotions helps you make better trading decisions
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>How are you feeling today?</Label>
                  <Select value={checkInData.mood} onValueChange={(value) => setCheckInData({ ...checkInData, mood: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="great">😊 Great</SelectItem>
                      <SelectItem value="good">🙂 Good</SelectItem>
                      <SelectItem value="neutral">😐 Neutral</SelectItem>
                      <SelectItem value="tired">😴 Tired</SelectItem>
                      <SelectItem value="stressed">😰 Stressed</SelectItem>
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
                Complete Check-In
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Check-In Complete!</h3>
                <p className="text-muted-foreground">Great! Daily check-ins will help you spot patterns over time</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={skipStep} variant="outline" size="lg" className="flex-1">
                  Skip
                </Button>
                <Button onClick={nextStep} size="lg" className="flex-1">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </OnboardingStep>,

    // Step 3: MT5 Integration
    <OnboardingStep
      key="mt5"
      icon={Plug}
      title="Connect MT5 (Optional)"
      description="Automatically sync your MetaTrader 5 trades for seamless tracking"
    >
      <Card className="border-border/50">
        <CardContent className="p-6">
          {!mt5Connected ? (
            <div className="space-y-6">
              <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-foreground">
                  <strong>Optional:</strong> You can skip this step and set it up later in Settings
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="brokerName">Broker Name</Label>
                  <Input
                    id="brokerName"
                    placeholder="e.g., XM Global, FXTM"
                    value={mt5Data.brokerName}
                    onChange={(e) => setMt5Data({ ...mt5Data, brokerName: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="serverName">Server Name</Label>
                  <Input
                    id="serverName"
                    placeholder="e.g., XMGlobal-MT5"
                    value={mt5Data.serverName}
                    onChange={(e) => setMt5Data({ ...mt5Data, serverName: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Your MT5 account number"
                    value={mt5Data.accountNumber}
                    onChange={(e) => setMt5Data({ ...mt5Data, accountNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={nextStep} variant="outline" size="lg" className="flex-1">
                  Skip for Now
                </Button>
                <Button 
                  onClick={handleMt5Submit} 
                  size="lg" 
                  className="flex-1"
                  disabled={!mt5Data.brokerName || !mt5Data.serverName || !mt5Data.accountNumber}
                >
                  Connect MT5
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">MT5 Connected!</h3>
                <p className="text-muted-foreground">You can now upload trade reports to sync your history</p>
              </div>
              <Button onClick={nextStep} size="lg">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </OnboardingStep>,

    // Step 4: Completion
    <OnboardingStep
      key="complete"
      icon={CheckCircle2}
      title="You're All Set! 🎉"
      description="Start your journey to becoming a better, more consistent trader"
    >
      <Card className="border-border/50 bg-gradient-to-br from-primary/10 via-card to-card">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Onboarding Complete!</h3>
              <p className="text-muted-foreground">Here's what you can do next:</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-card border border-border/50 rounded-lg">
              <h4 className="font-semibold text-foreground mb-1">📊 View Your Dashboard</h4>
              <p className="text-sm text-muted-foreground">See your stats, recent trades, and performance metrics</p>
            </div>
            
            <div className="p-4 bg-card border border-border/50 rounded-lg">
              <h4 className="font-semibold text-foreground mb-1">🤖 Try AI Coach</h4>
              <p className="text-sm text-muted-foreground">Get personalized insights and recommendations</p>
            </div>
            
            <div className="p-4 bg-card border border-border/50 rounded-lg">
              <h4 className="font-semibold text-foreground mb-1">🏆 Join Leaderboard</h4>
              <p className="text-sm text-muted-foreground">Compete with other traders and track your ranking</p>
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
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      {/* Skip button */}
      <div className="absolute top-4 right-4 z-50">
        <Button onClick={skipOnboarding} variant="ghost" size="sm">
          Skip All
          <X className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Step {currentStep + 1} of 5</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current step */}
        <div className="max-w-4xl mx-auto">
          {steps[currentStep]}
        </div>
      </div>
    </div>
  );
}
