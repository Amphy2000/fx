import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const challenges = [
  {
    challenge: "Revenge Trading",
    icon: AlertCircle,
    before: {
      scenario: "After 2-3 losses, you immediately enter larger positions trying to 'win back' your money",
      result: "Emotional decisions compound losses, often wiping out weeks of gains in hours",
      outcome: "Loss spiral, account damage"
    },
    after: {
      scenario: "AI Trade Interceptor detects your loss pattern and blocks impulsive entries",
      result: "You're prompted to log your emotional state before proceeding, breaking the revenge cycle",
      outcome: "Protected capital, clear head"
    },
    feature: "AI Trade Interceptor"
  },
  {
    challenge: "Hidden Psychological Patterns",
    icon: TrendingDown,
    before: {
      scenario: "You don't realize you trade poorly on Mondays, after bad weekends, or when stressed",
      result: "Repeating the same mistakes without understanding why performance fluctuates",
      outcome: "Inconsistent results, frustration"
    },
    after: {
      scenario: "Mental State Correlation Dashboard reveals: 73% win rate with 7+ hours sleep vs 42% with less",
      result: "Data-driven insights show exactly when you trade best and worst",
      outcome: "Rule-based trading, higher win rate"
    },
    feature: "Mental State Correlation"
  },
  {
    challenge: "Inconsistent Journaling",
    icon: AlertCircle,
    before: {
      scenario: "You know journaling helps but it's tedious. You skip days, forget details, give up after weeks",
      result: "No data to analyze, no way to learn from mistakes or successes",
      outcome: "Same mistakes repeated"
    },
    after: {
      scenario: "Voice logging lets you capture trades in seconds while the emotions are fresh",
      result: "Consistent logging becomes effortless. AI extracts patterns you'd never notice manually",
      outcome: "Complete trade history, actionable insights"
    },
    feature: "Voice Trade Logger"
  },
  {
    challenge: "Trading While Impaired",
    icon: TrendingDown,
    before: {
      scenario: "You trade stressed, tired, or emotional without realizing how much it impacts performance",
      result: "Your worst trading sessions happen when you're in the wrong mental state",
      outcome: "Preventable losses mount"
    },
    after: {
      scenario: "Daily Check-In tracks sleep, stress, confidence. Pre-trade validation warns you of high-risk conditions",
      result: "Clear data: trading at 7+ stress drops your win rate by 35%. You now have rules",
      outcome: "Trade only when optimal, skip bad days"
    },
    feature: "Daily Check-In + Pre-Trade Validation"
  },
  {
    challenge: "Solo Trading = Blind Spots",
    icon: AlertCircle,
    before: {
      scenario: "Trading alone means no one calls out your patterns, holds you accountable, or celebrates wins",
      result: "You rationalize bad habits, miss obvious patterns others would spot instantly",
      outcome: "Slow improvement, isolation"
    },
    after: {
      scenario: "Accountability Partners share journals, spot each other's patterns, and provide objective feedback",
      result: "Your partner notices you overtrade every Monday. You notice they revenge trade after losses",
      outcome: "Faster growth, shared wisdom"
    },
    feature: "Accountability Partners"
  },
  {
    challenge: "Ignoring the Real Problem",
    icon: TrendingDown,
    before: {
      scenario: "You focus on strategies, indicators, setups - everything except your own psychology",
      result: "Perfect strategy, terrible execution. You know what to do but can't do it consistently",
      outcome: "Technical skill wasted on poor mindset"
    },
    after: {
      scenario: "Psychology-first approach tracks your mental state, emotional triggers, and behavioral patterns",
      result: "You realize 80% of losses come from 3 emotional patterns - all fixable",
      outcome: "Aligned execution with knowledge"
    },
    feature: "Complete Psychology System"
  }
];

export const Testimonials = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Common Trading Psychology Challenges
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              See how our features address the real issues that cost traders money
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {challenges.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card key={index} className="border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-destructive/10">
                          <Icon className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{item.challenge}</h3>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {item.feature}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Before Scenario */}
                    <div className="space-y-2 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                        <span className="font-semibold text-sm text-destructive">Without Our App</span>
                      </div>
                      <p className="text-sm text-foreground/80 mb-2">
                        <span className="font-medium">Scenario:</span> {item.before.scenario}
                      </p>
                      <p className="text-sm text-foreground/80 mb-2">
                        <span className="font-medium">Result:</span> {item.before.result}
                      </p>
                      <p className="text-xs font-semibold text-destructive">
                        → {item.before.outcome}
                      </p>
                    </div>

                    {/* After Scenario */}
                    <div className="space-y-2 p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm text-primary">With Our App</span>
                      </div>
                      <p className="text-sm text-foreground/80 mb-2">
                        <span className="font-medium">How it helps:</span> {item.after.scenario}
                      </p>
                      <p className="text-sm text-foreground/80 mb-2">
                        <span className="font-medium">Result:</span> {item.after.result}
                      </p>
                      <p className="text-xs font-semibold text-primary flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {item.after.outcome}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-12 text-center p-6 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-3">
              These are common patterns from trading psychology research
            </p>
            <p className="text-foreground font-medium">
              Ready to address your own challenges? Start tracking your psychology today.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};