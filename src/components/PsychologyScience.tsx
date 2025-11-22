import { Card } from "@/components/ui/card";
import { Brain, Eye, Lightbulb, Zap } from "lucide-react";

export const PsychologyScience = () => {
  return (
    <div className="space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          The Science Behind It
        </h2>
        <p className="text-lg text-muted-foreground">
          Why tracking your psychology isn't just a good idea—it's backed by neuroscience
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Brain Diagram */}
        <Card className="p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Your Trading Brain</h3>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="h-2 w-2 bg-destructive rounded-full" />
                  Amygdala (Emotional Brain)
                </h4>
                <p className="text-sm text-muted-foreground pl-4">
                  Processes fear and stress. Overactive when you're tired or anxious, leading to impulsive, 
                  emotion-driven trades that bypass your strategy.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full" />
                  Prefrontal Cortex (Rational Brain)
                </h4>
                <p className="text-sm text-muted-foreground pl-4">
                  Handles logical decision-making and impulse control. Functions optimally when you're 
                  well-rested, calm, and confident—exactly what we track.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm font-medium">
                  <span className="text-primary">Key Insight:</span> When stressed or tired, your amygdala 
                  hijacks your prefrontal cortex. You literally can't think clearly, no matter how good your strategy is.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Research Facts */}
        <div className="space-y-4">
          <Card className="p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Cognitive Load Theory</h4>
                <p className="text-sm text-muted-foreground">
                  Research shows that decision fatigue and stress significantly impair judgment. 
                  By tracking when you're mentally depleted, you can avoid trading in compromised states.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Pattern Recognition</h4>
                <p className="text-sm text-muted-foreground">
                  The human brain excels at pattern recognition when given consistent data. By logging your 
                  mental state daily, you train your brain to recognize warning signs before losses occur.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Habit Formation</h4>
                <p className="text-sm text-muted-foreground">
                  Studies on habit formation show that consistent self-awareness practices lead to lasting 
                  behavioral change. Daily check-ins create a trading routine that prioritizes mental fitness.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Quote Section */}
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <div className="space-y-4">
            <p className="text-xl md:text-2xl font-semibold text-center">
              "The most important quality for an investor is temperament, not intellect."
            </p>
            <p className="text-center text-muted-foreground">
              — Warren Buffett
            </p>
            <p className="text-sm text-muted-foreground text-center pt-4 border-t border-border">
              Even the world's greatest investor emphasizes psychology over technical knowledge. 
              Your mental state is your competitive advantage.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
