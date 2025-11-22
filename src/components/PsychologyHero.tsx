import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const PsychologyHero = () => {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const targetCount = 95;

  useEffect(() => {
    if (count < targetCount) {
      const timer = setTimeout(() => setCount(count + 1), 20);
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background py-20 md:py-32 px-4 md:px-8">
      {/* Animated background elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full text-sm font-medium">
              <Brain className="h-4 w-4" />
              Psychology-First Trading
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Master Your Mind,
              <br />
              <span className="text-primary">Master The Markets</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground">
              Traditional trading journals track numbers. We track what actually matters: 
              <strong className="text-foreground"> your mental state</strong>. Because the best strategy 
              means nothing when emotions take control.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" onClick={() => navigate('/check-in')} className="text-lg px-8">
                Start Your First Check-In
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/dashboard')} className="text-lg px-8">
                View Dashboard
              </Button>
            </div>

            {/* Trust Signals */}
            <div className="flex flex-wrap gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                AI-Powered Analysis
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                Real-Time Warnings
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                Pattern Recognition
              </div>
            </div>
          </div>

          {/* Right Content - Stat Card */}
          <div className="relative">
            <div className="bg-card border-2 border-primary/30 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
              <div className="text-center space-y-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                
                <div>
                  <div className="text-7xl md:text-8xl font-bold text-primary mb-2">
                    {count}%
                  </div>
                  <p className="text-xl font-semibold mb-2">
                    Of Trading Success
                  </p>
                  <p className="text-muted-foreground">
                    Is Determined by Psychology, Not Strategy
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground italic">
                    "The market is a device for transferring money from the impatient to the patient."
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    — Warren Buffett
                  </p>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 h-24 w-24 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute -bottom-4 -left-4 h-32 w-32 bg-primary/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
