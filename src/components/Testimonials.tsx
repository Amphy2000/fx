import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, TrendingDown, TrendingUp, CheckCircle2, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const challenges = [
  {
    challenge: "Revenge Trading",
    icon: AlertCircle,
    quickProblem: "After 2-3 losses, you chase bigger positions to 'win back' money",
    quickSolution: "AI blocks impulsive entries when it detects loss patterns",
    impactStat: "Protected capital, clear head",
    before: {
      scenario: "After 2-3 losses, you immediately enter larger positions trying to 'win back' your money",
      result: "Emotional decisions compound losses, often wiping out weeks of gains in hours",
    },
    after: {
      scenario: "AI Trade Interceptor detects your loss pattern and blocks impulsive entries",
      result: "You're prompted to log your emotional state before proceeding, breaking the revenge cycle",
    },
    feature: "AI Trade Interceptor"
  },
  {
    challenge: "Hidden Psychological Patterns",
    icon: TrendingDown,
    quickProblem: "You don't realize you trade poorly on Mondays or when stressed",
    quickSolution: "Data reveals: 73% win rate with 7+ hours sleep vs 42% with less",
    impactStat: "Rule-based trading, +31% win rate improvement",
    before: {
      scenario: "You don't realize you trade poorly on Mondays, after bad weekends, or when stressed",
      result: "Repeating the same mistakes without understanding why performance fluctuates",
    },
    after: {
      scenario: "Mental State Correlation Dashboard reveals exactly when you trade best and worst",
      result: "Data-driven insights show patterns like: 73% win rate with 7+ hours sleep vs 42% with less",
    },
    feature: "Mental State Correlation"
  },
  {
    challenge: "Inconsistent Journaling",
    icon: AlertCircle,
    quickProblem: "Journaling is tedious. You skip days, forget details, give up",
    quickSolution: "Voice logging captures trades in seconds while emotions are fresh",
    impactStat: "Complete trade history, actionable insights",
    before: {
      scenario: "You know journaling helps but it's tedious. You skip days, forget details, give up after weeks",
      result: "No data to analyze, no way to learn from mistakes or successes",
    },
    after: {
      scenario: "Voice logging lets you capture trades in seconds while the emotions are fresh",
      result: "Consistent logging becomes effortless. AI extracts patterns you'd never notice manually",
    },
    feature: "Voice Trade Logger"
  },
  {
    challenge: "Trading While Impaired",
    icon: TrendingDown,
    quickProblem: "You trade stressed, tired, or emotional without realizing the impact",
    quickSolution: "Clear data: trading at 7+ stress drops win rate by 35%",
    impactStat: "Trade only when optimal, skip bad days",
    before: {
      scenario: "You trade stressed, tired, or emotional without realizing how much it impacts performance",
      result: "Your worst trading sessions happen when you're in the wrong mental state",
    },
    after: {
      scenario: "Daily Check-In tracks sleep, stress, confidence. Pre-trade validation warns you of high-risk conditions",
      result: "Clear data: trading at 7+ stress drops your win rate by 35%. You now have rules to follow",
    },
    feature: "Daily Check-In + Validation"
  },
  {
    challenge: "Solo Trading = Blind Spots",
    icon: AlertCircle,
    quickProblem: "Trading alone means no one spots your patterns or holds you accountable",
    quickSolution: "Partners notice you overtrade Mondays. You spot their revenge trading",
    impactStat: "Faster growth, shared wisdom",
    before: {
      scenario: "Trading alone means no one calls out your patterns, holds you accountable, or celebrates wins",
      result: "You rationalize bad habits, miss obvious patterns others would spot instantly",
    },
    after: {
      scenario: "Accountability Partners share journals, spot each other's patterns, provide objective feedback",
      result: "Your partner notices you overtrade every Monday. You notice they revenge trade after losses",
    },
    feature: "Accountability Partners"
  },
  {
    challenge: "Ignoring the Real Problem",
    icon: TrendingDown,
    quickProblem: "Perfect strategy, terrible execution. You focus on everything except psychology",
    quickSolution: "80% of losses come from just 3 emotional patterns - all fixable",
    impactStat: "Aligned execution with knowledge",
    before: {
      scenario: "You focus on strategies, indicators, setups - everything except your own psychology",
      result: "Perfect strategy, terrible execution. You know what to do but can't do it consistently",
    },
    after: {
      scenario: "Psychology-first approach tracks your mental state, emotional triggers, and behavioral patterns",
      result: "You realize 80% of losses come from 3 emotional patterns - all fixable with the right tools",
    },
    feature: "Complete Psychology System"
  }
];

const ChallengeCard = ({ item, index }: { item: typeof challenges[0], index: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = item.icon;

  return (
    <Card className="border-border/50 hover:border-primary/30 transition-all hover:shadow-lg">
      <CardContent className="p-0">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Always Visible Header */}
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-destructive/10 flex-shrink-0">
                <Icon className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">{item.challenge}</h3>
                <Badge variant="outline" className="text-xs mb-3">
                  {item.feature}
                </Badge>
                
                {/* Quick Problem */}
                <div className="flex items-start gap-2 mb-3">
                  <div className="p-1 rounded bg-destructive/20 mt-0.5 flex-shrink-0">
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    <span className="font-semibold">Problem:</span> {item.quickProblem}
                  </p>
                </div>

                {/* Quick Solution */}
                <div className="flex items-start gap-2 mb-3">
                  <div className="p-1 rounded bg-primary/20 mt-0.5 flex-shrink-0">
                    <TrendingUp className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    <span className="font-semibold">Solution:</span> {item.quickSolution}
                  </p>
                </div>

                {/* Impact Badge */}
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">{item.impactStat}</span>
                </div>
              </div>
            </div>

            <CollapsibleTrigger className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-border/50">
              <span>{isOpen ? "Hide" : "See"} detailed scenario</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
          </div>

          {/* Expandable Detailed Scenarios */}
          <CollapsibleContent>
            <div className="px-6 pb-6 space-y-4">
              {/* Detailed Before */}
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="font-semibold text-sm text-destructive">Without Our App</span>
                </div>
                <p className="text-sm text-foreground/80">
                  <span className="font-medium">Scenario:</span> {item.before.scenario}
                </p>
                <p className="text-sm text-foreground/80">
                  <span className="font-medium">Result:</span> {item.before.result}
                </p>
              </div>

              {/* Detailed After */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm text-primary">With Our App</span>
                </div>
                <p className="text-sm text-foreground/80">
                  <span className="font-medium">How it helps:</span> {item.after.scenario}
                </p>
                <p className="text-sm text-foreground/80">
                  <span className="font-medium">Result:</span> {item.after.result}
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

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
              Real problems costing traders money. See how our features solve them.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {challenges.map((item, index) => (
              <ChallengeCard key={index} item={item} index={index} />
            ))}
          </div>

          <div className="mt-12 text-center p-6 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-2">
              Based on trading psychology research
            </p>
            <p className="text-foreground font-medium">
              Ready to fix your psychology? Start tracking today.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};