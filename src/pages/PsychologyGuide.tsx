import { PsychologyHero } from "@/components/PsychologyHero";
import { ProblemSolutionCards } from "@/components/ProblemSolutionCards";
import { TradingPsychologyStats } from "@/components/TradingPsychologyStats";
import { HowItWorksTimeline } from "@/components/HowItWorksTimeline";
import { PsychologyScience } from "@/components/PsychologyScience";
import { SuccessPatterns } from "@/components/SuccessPatterns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Brain, TrendingUp, Shield } from "lucide-react";

const PsychologyGuide = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <PsychologyHero />

      {/* Problem-Solution */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <ProblemSolutionCards />
      </section>

      {/* Statistics */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto bg-muted/30">
        <TradingPsychologyStats />
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <HowItWorksTimeline />
      </section>

      {/* Science Behind It */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto bg-muted/30">
        <PsychologyScience />
      </section>

      {/* Success Patterns */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <SuccessPatterns />
      </section>

      {/* Feature Showcase */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Your Complete Psychology Toolkit
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every feature is designed to help you master the mental game of trading
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group" onClick={() => navigate('/check-in')}>
            <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Daily Check-In</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track your mental state before trading. Understand how sleep, stress, and emotions impact your decisions.
            </p>
            <Button variant="ghost" size="sm" className="mt-auto">
              Start Check-In →
            </Button>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group" onClick={() => navigate('/ai-features')}>
            <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Trade Interceptor</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get real-time warnings when you're about to make emotional decisions based on your mental state.
            </p>
            <Button variant="ghost" size="sm" className="mt-auto">
              Try AI Coach →
            </Button>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group" onClick={() => navigate('/analytics/advanced')}>
            <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Pattern Recognition</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Discover the hidden connections between your emotions and trading performance.
            </p>
            <Button variant="ghost" size="sm" className="mt-auto">
              View Analytics →
            </Button>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Master Your Trading Psychology?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of traders who are transforming their performance by mastering their mindset first.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/check-in')} className="text-lg px-8">
              Start Your First Check-In
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/dashboard')} className="text-lg px-8">
              Go to Dashboard
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            You're just 3 steps away from understanding your trading psychology
          </p>
        </div>
      </section>
    </div>
  );
};

export default PsychologyGuide;
