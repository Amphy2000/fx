import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Brain, Heart, Moon, Zap } from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
  description: string;
  delay?: number;
}

const StatCard = ({ icon, value, suffix, label, description, delay = 0 }: StatCardProps) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (started && count < value) {
      const increment = Math.ceil(value / 50);
      const timer = setTimeout(() => setCount(Math.min(count + increment, value)), 30);
      return () => clearTimeout(timer);
    }
  }, [count, value, started]);

  return (
    <Card className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-card to-card/50">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-4xl font-bold text-primary mb-1">
            {count}{suffix}
          </div>
          <div className="font-semibold mb-2">{label}</div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Card>
  );
};

export const TradingPsychologyStats = () => {
  return (
    <div className="space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          The Numbers Don't Lie
        </h2>
        <p className="text-lg text-muted-foreground">
          Research-backed statistics showing why psychology is the key to trading success
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <StatCard
          icon={<Brain className="h-6 w-6 text-primary" />}
          value={95}
          suffix="%"
          label="Psychology Impact"
          description="of trading success is attributed to mindset and emotional control, not strategy"
          delay={0}
        />

        <StatCard
          icon={<Heart className="h-6 w-6 text-primary" />}
          value={80}
          suffix="%"
          label="Emotional Mistakes"
          description="of losing traders cite emotional decisions as their primary cause of losses"
          delay={200}
        />

        <StatCard
          icon={<Moon className="h-6 w-6 text-primary" />}
          value={64}
          suffix="%"
          label="Sleep Impact"
          description="decrease in decision-making quality after just one night of poor sleep"
          delay={400}
        />

        <StatCard
          icon={<Zap className="h-6 w-6 text-primary" />}
          value={73}
          suffix="%"
          label="Stress Effect"
          description="of traders make impulsive decisions when under high stress or pressure"
          delay={600}
        />
      </div>

      {/* Additional Context */}
      <div className="bg-muted/50 border border-primary/20 rounded-xl p-8 max-w-4xl mx-auto">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">
            The Market Doesn't Care About Your Strategy
          </p>
          <p className="text-muted-foreground">
            You can have the best technical analysis, the perfect entry signals, and impeccable risk management. 
            But if you're stressed, tired, or emotional, <strong className="text-foreground">none of it matters</strong>. 
            Your brain will override your strategy every single time.
          </p>
          <p className="text-sm text-muted-foreground italic pt-4">
            That's why the most successful traders track their mental state as religiously as their P&L.
          </p>
        </div>
      </div>
    </div>
  );
};
