import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, LineChart, Shield, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TimelineStepProps {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  feature: string;
  action: () => void;
  isLast?: boolean;
}

const TimelineStep = ({ number, icon, title, description, feature, action, isLast }: TimelineStepProps) => {
  return (
    <div className="relative">
      <div className="flex gap-6 items-start">
        {/* Left side - Number and line */}
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-2xl font-bold text-primary z-10">
            {number}
          </div>
          {!isLast && (
            <div className="w-0.5 h-full bg-gradient-to-b from-primary to-primary/20 mt-2" />
          )}
        </div>

        {/* Right side - Content */}
        <Card className="flex-1 p-6 hover:shadow-lg transition-all duration-300 mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">{title}</h3>
              <p className="text-muted-foreground mb-4">{description}</p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-sm">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                {feature}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={action} className="mt-2">
            Try This Feature →
          </Button>
        </Card>
      </div>
    </div>
  );
};

export const HowItWorksTimeline = () => {
  const navigate = useNavigate();

  const steps = [
    {
      number: 1,
      icon: <Brain className="h-6 w-6 text-primary" />,
      title: "Track Your Mental State Daily",
      description: "Before you even look at the charts, log your sleep quality, stress level, confidence, and overall mood. This takes 60 seconds and provides crucial context for every trading decision you make.",
      feature: "Daily Check-In",
      action: () => navigate('/check-in'),
    },
    {
      number: 2,
      icon: <Shield className="h-6 w-6 text-primary" />,
      title: "Get AI-Powered Warnings",
      description: "Our AI analyzes your mental state patterns and trading history. When you're about to place a trade in a high-risk mental state, you'll get a real-time warning before you click that button.",
      feature: "AI Trade Interceptor",
      action: () => navigate('/ai-features'),
    },
    {
      number: 3,
      icon: <LineChart className="h-6 w-6 text-primary" />,
      title: "Discover Your Patterns",
      description: "See exactly how your emotions correlate with your performance. Discover which mental states lead to your best trades, and which ones consistently result in losses.",
      feature: "Pattern Recognition",
      action: () => navigate('/analytics/advanced'),
    },
    {
      number: 4,
      icon: <TrendingUp className="h-6 w-6 text-primary" />,
      title: "Master Your Trading Psychology",
      description: "Armed with insights about your mental patterns, you'll know exactly when you're in the right state to trade and when you should step away. This is how professionals stay consistent.",
      feature: "Continuous Improvement",
      action: () => navigate('/dashboard'),
      isLast: true,
    },
  ];

  return (
    <div className="space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          How It Works
        </h2>
        <p className="text-lg text-muted-foreground">
          Four simple steps to transform your trading through psychology-first journaling
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        {steps.map((step) => (
          <TimelineStep key={step.number} {...step} />
        ))}
      </div>

      <div className="text-center max-w-2xl mx-auto bg-primary/5 border border-primary/20 rounded-xl p-6">
        <p className="text-lg font-semibold mb-2">
          Start seeing patterns in as little as 2 weeks
        </p>
        <p className="text-muted-foreground">
          The more consistently you track your mental state, the clearer your patterns become
        </p>
      </div>
    </div>
  );
};
