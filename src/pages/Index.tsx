import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Mic, Brain, BarChart3, Target, Shield, Zap, Check, ArrowRight, LineChart, Activity, MessageSquare, AlertTriangle, TrendingUp, Heart } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  const features = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI Trading Psychologist",
      description: "Your personal AI coach analyzes every trade through the lens of psychology - identifying emotional patterns and behavioral triggers"
    },
    {
      icon: <AlertTriangle className="h-6 w-6" />,
      title: "Trade Interception",
      description: "AI warns you before emotionally-driven trades based on your historical patterns - stop revenge trading before it starts"
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Emotional Intelligence",
      description: "Track sleep, stress, mood, and focus - discover how your mental state impacts your trading performance"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Behavioral Alerts",
      description: "Get real-time warnings when you're about to repeat past mistakes - AI learns your psychological patterns"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Pattern Recognition",
      description: "AI identifies hidden behavioral patterns you can't see - connect emotions, sessions, and setups to outcomes"
    },
    {
      icon: <Mic className="h-6 w-6" />,
      title: "Effortless Logging",
      description: "Voice commands, screenshot OCR, and MT5 auto-sync make journaling so easy you'll actually do it consistently"
    }
  ];

  const stats = [
    { value: "85%", label: "Reduced Emotional Trading" },
    { value: "10K+", label: "Traders Transformed" },
    { value: "3.2x", label: "Avg Win Rate Improvement" }
  ];

  const benefits = [
    "AI analyzes your psychology and warns you before emotional mistakes",
    "Track sleep, stress, and mood - see how they affect your trading",
    "Stop revenge trading with behavioral pattern recognition",
    "Effortless logging (voice, screenshots, auto-sync) so you stay consistent"
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 via-background to-chart-3/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-chart-1/20 via-transparent to-transparent" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-16 md:py-32 relative">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-chart-1/10 border border-chart-1/30 mb-6 sm:mb-8 animate-fade-in backdrop-blur-sm">
                <Brain className="h-4 w-4 text-chart-1 animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold text-foreground">AI Trading Psychologist</span>
              </div>
              
              {/* Main headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 sm:mb-8 text-foreground tracking-tight leading-[1.1] px-2">
                Your Biggest Enemy Isn't The Market
                <span className="block mt-2 sm:mt-3 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3 bg-clip-text text-transparent text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
                  It's Your Psychology
                </span>
              </h1>
              
              <p className="text-sm sm:text-base md:text-xl lg:text-2xl text-muted-foreground mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed font-light px-4">
                The first AI-powered trading journal that acts as your personal trading psychologist. Master your emotions, identify behavioral patterns, and get AI warnings before you make emotionally-driven mistakes. Because 95% of trading failure is mental, not technical.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 px-4">
                <Button 
                  size="lg" 
                  onClick={() => navigate("/auth")} 
                  className="w-full sm:w-auto bg-chart-1 hover:bg-chart-1/90 text-white text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-7 h-auto font-semibold shadow-[0_0_40px_-10px_hsl(var(--chart-1))] hover:shadow-[0_0_60px_-10px_hsl(var(--chart-1))] transition-all group"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate("/auth")} 
                  className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-7 h-auto font-semibold border-2 border-border hover:border-chart-1/50 hover:bg-chart-1/5 transition-all"
                >
                  Watch Demo
                </Button>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 sm:gap-6 md:gap-8 max-w-3xl mx-auto p-4 sm:p-6 md:p-8 rounded-2xl bg-card/30 border border-border/50 backdrop-blur-md shadow-2xl">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center group">
                    <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-1 sm:mb-2 group-hover:text-chart-1 transition-colors">
                      {stat.value}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground font-medium">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-background/50 overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-chart-2/10 border border-chart-2/30 text-chart-2 text-xs sm:text-sm font-bold mb-6 backdrop-blur-sm">
                <AlertTriangle className="h-4 w-4" />
                Psychology-First Trading Journal
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 px-2">
                Master Your Mind, Master The Markets
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
                Most trading journals track numbers. We track what really matters - your psychology, emotions, and behavioral patterns.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
              {benefits.map((benefit, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 sm:gap-4 p-4 sm:p-6 rounded-xl bg-card/40 border border-border/50 hover:border-chart-1/50 hover:bg-card/60 transition-all hover:shadow-lg backdrop-blur-sm group"
                >
                  <div className="h-6 w-6 rounded-full bg-chart-1/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-chart-1/30 transition-colors">
                    <Check className="h-4 w-4 text-chart-1" />
                  </div>
                  <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 md:py-24 border-t border-border/50 overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 px-2">
              Your AI Trading Psychologist, 24/7
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto px-4">
              Advanced AI that understands trading psychology and helps you overcome your biggest enemy: emotional decision-making
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="bg-card/40 border-border/50 hover:border-chart-1/50 hover:bg-card/60 transition-all hover:shadow-lg group backdrop-blur-sm"
              >
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-chart-1/10 flex items-center justify-center mb-4 group-hover:bg-chart-1/20 transition-colors group-hover:scale-110 duration-300">
                    <div className="text-chart-1">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2 text-foreground group-hover:text-chart-1 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-b from-chart-1/5 to-background border-t border-border/50 overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 px-2">
              Stop Trading On Emotion. Start Trading With Intelligence.
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-12 px-4">
              Join 10,000+ traders who've mastered their psychology and transformed their trading results
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")} 
              className="w-full sm:w-auto bg-chart-1 hover:bg-chart-1/90 text-white text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-7 h-auto font-semibold shadow-[0_0_40px_-10px_hsl(var(--chart-1))] hover:shadow-[0_0_60px_-10px_hsl(var(--chart-1))] transition-all group mx-4"
            >
              Start Free Trial Now
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
