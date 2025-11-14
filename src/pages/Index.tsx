import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { TrendingUp, Brain, BarChart3, Target, Shield, Zap, Check, ArrowRight, LineChart, Activity, TrendingDown } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";
const Index = () => {
  const navigate = useNavigate();
  const features = [{
    icon: <TrendingUp className="h-6 w-6" />,
    title: "Track Every Trade",
    description: "Log trades with detailed entries, stops, targets, and outcomes with precision"
  }, {
    icon: <Brain className="h-6 w-6" />,
    title: "AI-Powered Insights",
    description: "Get personalized feedback and pattern recognition from advanced AI"
  }, {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Performance Analytics",
    description: "Visualize win rates, profit/loss, and trading patterns in real-time"
  }, {
    icon: <Target className="h-6 w-6" />,
    title: "Psychology Tracking",
    description: "Monitor emotions and discover psychological patterns affecting performance"
  }, {
    icon: <Shield className="h-6 w-6" />,
    title: "Secure & Private",
    description: "Your trading data is encrypted with bank-level security"
  }, {
    icon: <Zap className="h-6 w-6" />,
    title: "Real-Time Updates",
    description: "Instantly sync across all your devices with zero latency"
  }];
  const stats = [{
    value: "10K+",
    label: "Active Traders"
  }, {
    value: "1M+",
    label: "Trades Analyzed"
  }, {
    value: "98%",
    label: "Satisfaction Rate"
  }];
  const benefits = ["Discover your strongest trading pairs", "Get AI feedback after every trade", "Stay disciplined and consistent", "Track your trading habits effectively"];
  return <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 via-background to-chart-3/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-chart-1/20 via-transparent to-transparent" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        <div className="container mx-auto px-4 md:py-32 relative py-[35px]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 mx-0 my-0 px-0 py-0">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-chart-1/10 border border-chart-1/30 mb-8 animate-fade-in backdrop-blur-sm">
                <Activity className="h-4 w-4 text-chart-1 animate-pulse" />
                <span className="text-sm font-semibold text-foreground">AI-Powered Trading Intelligence</span>
              </div>
              
              {/* Main headline */}
              <h1 className="text-6xl font-bold mb-8 text-foreground tracking-tight leading-[1.1] md:text-6xl">
                Master Your
                <span className="block mt-3 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3 bg-clip-text text-transparent mx-0 my-0 px-px py-[20px] text-5xl">
                  Trading Edge
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed font-light">
                Professional trading journal with advanced AI analytics, real-time insights, and psychology tracking. Trusted by 10,000+ traders worldwide.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Button size="lg" onClick={() => navigate("/auth")} className="bg-chart-1 hover:bg-chart-1/90 text-white text-lg px-10 py-7 h-auto font-semibold shadow-[0_0_40px_-10px_hsl(var(--chart-1))] hover:shadow-[0_0_60px_-10px_hsl(var(--chart-1))] transition-all group">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-10 py-7 h-auto font-semibold border-2 border-border hover:border-chart-1/50 hover:bg-chart-1/5 transition-all">
                  Watch Demo
                </Button>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mt-16 p-8 rounded-2xl bg-card/30 border border-border/50 backdrop-blur-md shadow-2xl">
                {stats.map((stat, index) => <div key={index} className="text-center group">
                    <div className="text-4xl md:text-5xl font-bold text-foreground mb-2 group-hover:text-chart-1 transition-colors">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      {stat.label}
                    </div>
                  </div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-background/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-chart-2/10 border border-chart-2/30 text-chart-2 text-sm font-bold mb-6 backdrop-blur-sm">
                <Zap className="h-4 w-4" />
                Limited Beta Access
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Why Top Traders Choose Us
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join thousands of successful traders who've transformed their performance
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {benefits.map((benefit, index) => <div key={index} className="flex items-start gap-4 p-6 rounded-xl bg-card/40 border border-border/50 hover:border-chart-1/50 hover:bg-card/60 transition-all hover:shadow-lg backdrop-blur-sm group">
                  <div className="h-6 w-6 rounded-full bg-chart-1/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-chart-1/30 transition-colors">
                    <Check className="h-4 w-4 text-chart-1" />
                  </div>
                  <p className="text-foreground font-medium leading-relaxed">{benefit}</p>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Professional Trading Tools
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Everything you need to analyze, improve, and master your trading strategy
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {features.map((feature, index) => <Card key={index} className="border-border/50 bg-card/30 backdrop-blur-sm hover:bg-card/50 hover:border-chart-1/30 transition-all hover:shadow-xl hover:-translate-y-1 group">
                <CardContent className="pt-8 pb-8">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-chart-1/20 to-chart-2/20 flex items-center justify-center text-chart-1 mb-6 group-hover:from-chart-1/30 group-hover:to-chart-2/30 transition-all group-hover:shadow-lg">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden border-y border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 via-background to-chart-3/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-chart-1/20 via-transparent to-transparent" />
        
        <div className="container mx-auto px-4 text-center relative">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
              Start Trading Smarter Today
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Join 10,000+ traders who are mastering their edge with AI-powered analytics and real-time insights
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")} className="bg-chart-1 hover:bg-chart-1/90 text-white text-lg px-10 py-7 h-auto font-semibold shadow-[0_0_40px_-10px_hsl(var(--chart-1))] hover:shadow-[0_0_60px_-10px_hsl(var(--chart-1))] transition-all group">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-10 py-7 h-auto font-semibold border-2 border-border hover:border-chart-1/50 hover:bg-chart-1/5">
                Talk to Sales
              </Button>
            </div>
            
            {/* Trust indicators */}
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-chart-1" />
                <span>Bank-level Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-chart-1" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-chart-1" />
                <span>Setup in 2 Minutes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-lg">Amphy AI</span>
            </div>
            
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2025 Amphy AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;