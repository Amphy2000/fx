import { Card, CardContent } from "@/components/ui/card";
import { X, Check, AlertTriangle, Brain, Target, TrendingDown } from "lucide-react";

export const ProblemSolutionCards = () => {
  return (
    <div className="space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          The Problem With Traditional Trading
        </h2>
        <p className="text-lg text-muted-foreground">
          Most traders focus on strategies and ignore the real enemy: their own emotions
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Problem Side */}
        <Card className="border-destructive/50 bg-destructive/5 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                <X className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-2xl font-bold">Traditional Approach</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-background/50 rounded-lg border border-destructive/20">
                <TrendingDown className="h-5 w-5 text-destructive mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Tracking Only Numbers</p>
                  <p className="text-sm text-muted-foreground">Entry price, exit price, P&L - but no context about WHY you made those decisions</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-background/50 rounded-lg border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Ignoring Emotions</p>
                  <p className="text-sm text-muted-foreground">No awareness of how stress, sleep, and mood affect your trading decisions</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-background/50 rounded-lg border border-destructive/20">
                <Target className="h-5 w-5 text-destructive mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Reactive Learning</p>
                  <p className="text-sm text-muted-foreground">You only realize your mistakes after they cost you money</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm font-medium">
                <span className="text-destructive font-bold">Result:</span> Repeated emotional mistakes, 
                inconsistent performance, and frustration despite having a "good strategy"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Solution Side */}
        <Card className="border-primary/50 bg-primary/5 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Psychology-First Approach</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-background/50 rounded-lg border border-primary/20">
                <Brain className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Track Your Mental State</p>
                  <p className="text-sm text-muted-foreground">Log sleep, stress, confidence, and emotions BEFORE trading to understand their impact</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-background/50 rounded-lg border border-primary/20">
                <AlertTriangle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">AI-Powered Warnings</p>
                  <p className="text-sm text-muted-foreground">Get real-time alerts when your mental state suggests you're at risk of emotional trading</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-background/50 rounded-lg border border-primary/20">
                <Target className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Pattern Recognition</p>
                  <p className="text-sm text-muted-foreground">See exactly how your emotions correlate with your wins and losses</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-sm font-medium">
                <span className="text-primary font-bold">Result:</span> Consistent performance, 
                fewer emotional mistakes, and a deep understanding of your trading psychology
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
