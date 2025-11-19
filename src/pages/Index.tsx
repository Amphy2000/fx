import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Mic, Brain, BarChart3, Target, Shield, Zap, Check, ArrowRight, LineChart, Activity, MessageSquare } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Mic className="h-6 w-6" />,
      title: "Voice Command Control",
      description: "Navigate your app, log trades, and get insights using only your voice - hands-free trading journal"
    },
    {
      icon: <Mic className="h-6 w-6" />,
      title: "Voice Trade Logger",
      description: "Speak your trades naturally and watch AI instantly log all details - entry, exit, stops, and notes"
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI-Powered Analysis",
      description: "Get instant personalized feedback, pattern recognition, and trading psychology insights from advanced AI"
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "AI Trading Coach",
      description: "Chat with your personal AI coach for real-time advice, strategy refinement, and performance tips"
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Smart Analytics",
      description: "Visualize win rates, profit/loss, and AI-detected patterns in stunning real-time dashboards"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Psychology Tracking",
      description: "Monitor emotions with AI-powered insights to discover psychological patterns affecting your trades"
    }
  ];

  const stats = [
    { value: "10K+", label: "Active Traders" },
    { value: "1M+", label: "Trades Analyzed" },
    { value: "98%", label: "Satisfaction Rate" }
  ];

  const benefits = [
    "Log trades in seconds using natural voice commands",
    "Get instant AI feedback and insights after every trade",
    "Control your entire trading journal hands-free with voice",
    "Discover hidden patterns with AI-powered analytics"
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
                <Mic className="h-4 w-4 text-chart-1 animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold text-foreground">Voice-Powered AI Trading Journal</span>
              </div>
              
              {/* Main headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 sm:mb-8 text-foreground tracking-tight leading-[1.1] px-2">
                Trade Smarter with
                <span className="block mt-2 sm:mt-3 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3 bg-clip-text text-transparent text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
                  Voice & AI Power
                </span>
              </h1>
              
              <p className="text-sm sm:text-base md:text-xl lg:text-2xl text-muted-foreground mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed font-light px-4">
                The world's first AI-powered trading journal with voice commands. Log trades by speaking, get instant AI insights, and control everything hands-free. Trusted by 10,000+ traders.
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
                <Brain className="h-4 w-4" />
                Revolutionary AI + Voice Features
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 px-2">
                Why Top Traders Choose Amphy AI
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
                Join thousands who've transformed their trading with voice commands and AI insights
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
              Powerful AI-Driven Features
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto px-4">
              Experience the future of trading journals with voice control, AI analysis, and intelligent insights
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
              Ready to Transform Your Trading?
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-12 px-4">
              Join thousands of traders who have elevated their game with AI-powered insights
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
