import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { 
  TrendingUp, 
  Brain, 
  BarChart3, 
  Target, 
  Shield, 
  Zap,
  Check
} from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Track Every Trade",
      description: "Log trades with detailed entries, stops, targets, and outcomes",
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI-Powered Insights",
      description: "Get personalized feedback and pattern recognition from AI",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Performance Analytics",
      description: "Visualize win rates, profit/loss, and trading patterns",
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Psychology Tracking",
      description: "Monitor emotions and discover psychological patterns",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure & Private",
      description: "Your trading data is encrypted and completely private",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Real-Time Updates",
      description: "Instantly sync across all your devices",
    },
  ];

  const benefits = [
    "Discover your strongest trading pairs",
    "Get AI feedback after every trade",
    "Stay disciplined and consistent",
    "Track your trading habits effectively",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-chart-1/5 via-background to-chart-2/5" />
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-chart-1/10 border border-chart-1/20 mb-6">
                <Zap className="h-4 w-4 text-chart-1" />
                <span className="text-sm font-medium text-foreground">AI-Powered Trading Journal</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 text-foreground tracking-tight">
                Trade Smarter with
                <span className="block mt-2 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-1 bg-clip-text text-transparent">
                  AI Insights
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Professional trading journal with AI-powered analytics, psychology tracking, and real-time performance insights. Built for serious traders.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-chart-1 hover:bg-chart-1/90 text-white text-lg px-8 py-6 h-auto font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Start Trading Journal
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="text-lg px-8 py-6 h-auto font-semibold border-2 hover:bg-accent"
                >
                  View Live Demo
                </Button>
              </div>
              
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-12 p-6 rounded-xl bg-card/50 border border-border backdrop-blur-sm">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-foreground">10K+</div>
                  <div className="text-xs text-muted-foreground mt-1">Active Traders</div>
                </div>
                <div className="text-center border-x border-border">
                  <div className="text-2xl md:text-3xl font-bold text-foreground">1M+</div>
                  <div className="text-xs text-muted-foreground mt-1">Trades Analyzed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-foreground">98%</div>
                  <div className="text-xs text-muted-foreground mt-1">Satisfaction</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
                🚀 Beta Launch — Limited Time Offer
              </span>
              <h2 className="text-3xl font-bold">
                Why Traders Choose Amphy AI
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border/50"
                >
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-foreground">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            A complete trading journal built for serious traders who want to improve
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-border/50 bg-card/50 backdrop-blur transition-smooth hover:bg-card hover:border-primary/20"
              >
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary-foreground">
            Ready to Transform Your Trading?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join traders who are improving their discipline and consistency with AI-powered insights
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("/auth")}
            className="text-lg px-8"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-semibold">Amphy AI Trade Journal</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Amphy AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
