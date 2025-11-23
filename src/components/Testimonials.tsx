import { Card, CardContent } from "@/components/ui/card";
import { Brain, Target, Mic, Shield, Users, TrendingUp, X, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const challenges = [
  {
    problem: "Revenge Trading",
    icon: Shield,
    before: "Loss spiral after bad trades",
    after: "AI blocks impulsive entries",
    feature: "AI Trade Interceptor",
    color: "text-destructive"
  },
  {
    problem: "Hidden Patterns",
    icon: Brain,
    before: "Repeating mistakes unknowingly",
    after: "Data reveals when you trade best",
    feature: "Mental State Correlation",
    color: "text-chart-2"
  },
  {
    problem: "Inconsistent Logging",
    icon: Mic,
    before: "Journaling feels tedious",
    after: "Voice capture in seconds",
    feature: "Voice Trade Logger",
    color: "text-chart-3"
  },
  {
    problem: "Trading While Stressed",
    icon: Target,
    before: "Performance drops when tired",
    after: "Warned before high-risk sessions",
    feature: "Daily Check-In",
    color: "text-chart-4"
  },
  {
    problem: "Solo Trading Blind Spots",
    icon: Users,
    before: "Miss obvious patterns",
    after: "Partners spot your issues",
    feature: "Accountability Partners",
    color: "text-chart-5"
  },
  {
    problem: "Ignoring Psychology",
    icon: TrendingUp,
    before: "Good strategy, poor execution",
    after: "Fix 3 patterns = 80% improvement",
    feature: "Complete System",
    color: "text-primary"
  }
];

export const Testimonials = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Common Trading Psychology Problems
            </h2>
            <p className="text-muted-foreground text-lg">
              Visual before/after transformations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card key={index} className="border-border/50 hover:border-primary/20 transition-all hover:shadow-lg group">
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-6">
                      <div className={`p-4 rounded-2xl bg-muted/50 mb-3 group-hover:scale-110 transition-transform ${item.color}`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <h3 className="font-bold text-lg mb-1">{item.problem}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {item.feature}
                      </Badge>
                    </div>

                    {/* Visual Before/After */}
                    <div className="space-y-4">
                      {/* Before */}
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <div className="p-1 rounded bg-destructive/20 mt-0.5 flex-shrink-0">
                          <X className="h-4 w-4 text-destructive" />
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          {item.before}
                        </p>
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-center">
                        <ArrowRight className="h-5 w-5 text-primary animate-pulse" />
                      </div>

                      {/* After */}
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="p-1 rounded bg-primary/20 mt-0.5 flex-shrink-0">
                          <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground leading-relaxed">
                          {item.after}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-muted-foreground text-sm">
              Psychology-first approach backed by trading research
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};