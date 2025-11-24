import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Brain, AlertTriangle, Heart, Mic, Camera, MessageSquare, LineChart, Target, BarChart3, TrendingUp, Users, Bell, Zap, Shield, BookOpen, Trophy, Calendar, Calculator, Award, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";

const Guides = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <AlertTriangle className="h-6 w-6" />,
      title: "AI Trade Interceptor",
      category: "core",
      description: "Your psychological safety net that warns you before emotionally-driven trades",
      howItWorks: "The AI analyzes your trading patterns, mental state history, and current psychology to detect high-risk emotional trades. Before you execute, it gives you a warning with specific reasons why this trade might be emotion-driven.",
      whenToUse: "Use before every trade. The AI learns your patterns over time and becomes more accurate.",
      creditCost: "5 credits per analysis"
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Mental State Tracking",
      category: "core",
      description: "Daily check-ins that track sleep, stress, mood, confidence, and focus",
      howItWorks: "Each day, record your mental state before trading. The AI correlates this data with your trade outcomes to show you exactly how psychology impacts performance.",
      whenToUse: "Every morning before trading. Takes 60 seconds.",
      creditCost: "Free - 2 credits awarded per check-in"
    },
    {
      icon: <Mic className="h-6 w-6" />,
      title: "Voice Trade Logger",
      category: "logging",
      description: "Speak your trades naturally - AI extracts all details automatically",
      howItWorks: "Just talk naturally: 'Bought EUR/USD at 1.0850, stop loss 1.0820, target 1.0900, feeling confident.' AI extracts pair, entry, SL, TP, emotions, and notes.",
      whenToUse: "Fastest way to log trades. Perfect for busy traders.",
      creditCost: "3 credits per voice log"
    },
    {
      icon: <Camera className="h-6 w-6" />,
      title: "Screenshot OCR",
      category: "logging",
      description: "Upload trading screenshots - AI reads everything",
      howItWorks: "Take a screenshot of your broker platform. AI extracts pair, entry, exit, profit/loss, and any visible notes.",
      whenToUse: "Best for batch logging multiple trades quickly.",
      creditCost: "2 credits per screenshot"
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "AI Trading Coach",
      category: "analysis",
      description: "24/7 AI psychologist + strategy advisor",
      howItWorks: "Chat with AI about your trades, patterns, emotions, or strategy. It has full context of your trading history and psychology data.",
      whenToUse: "When you need guidance, feel emotional, or want to analyze patterns.",
      creditCost: "1 credit per message"
    },
    {
      icon: <LineChart className="h-6 w-6" />,
      title: "Pattern Recognition",
      category: "analysis",
      description: "AI discovers hidden behavioral patterns you can't see",
      howItWorks: "AI analyzes thousands of data points across trades, mental states, and outcomes to find patterns like 'You lose 80% of trades when stressed' or 'You win 3x more after 7+ hours sleep.'",
      whenToUse: "View anytime in Pattern Recognition page. Updates daily.",
      creditCost: "Free feature"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Mental State Correlation",
      category: "analysis",
      description: "See exactly how psychology affects your win rate",
      howItWorks: "Charts showing your performance based on sleep hours, stress levels, mood, etc. Quantifies the impact of mental state on trading outcomes.",
      whenToUse: "Review weekly to optimize your trading schedule and mental state.",
      creditCost: "Free feature"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Setup Performance Analyzer",
      category: "analysis",
      description: "Track and analyze the performance of your specific trade setups",
      howItWorks: "Tag trades with your setup names (e.g., 'Head & Shoulders', 'Trendline Break'). AI analyzes which setups work best for you, their win rates, average RR, and when they perform best.",
      whenToUse: "After logging 10+ trades per setup to get statistically meaningful insights.",
      creditCost: "Free feature"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Accountability Partners",
      category: "social",
      description: "Connect with other traders for mutual accountability",
      howItWorks: "Match with traders, share goals, track progress together, provide support, and chat about trades. Creates positive peer pressure and reduces isolation.",
      whenToUse: "Great for staying disciplined and motivated long-term.",
      creditCost: "Premium feature"
    },
    {
      icon: <Trophy className="h-6 w-6" />,
      title: "Achievements & Streaks",
      category: "social",
      description: "Gamified progress tracking to maintain consistency",
      howItWorks: "Earn badges for milestones like '7-day check-in streak', '50 trades logged', 'First profitable month'. Track your longest streaks and compete on the leaderboard.",
      whenToUse: "Automatic tracking. Check your achievements page to see progress.",
      creditCost: "Free feature"
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Trade Calendar",
      category: "analysis",
      description: "Visual calendar view of your trading activity and performance",
      howItWorks: "See all trades displayed on a calendar with color-coding for wins/losses. Quickly identify hot streaks, drawdown periods, and trading patterns by date.",
      whenToUse: "Review weekly to spot timing patterns and optimal trading days.",
      creditCost: "Free feature"
    },
    {
      icon: <Calculator className="h-6 w-6" />,
      title: "Trading Calculators",
      category: "tools",
      description: "Essential calculators for position sizing and risk management",
      howItWorks: "Includes position size calculator, risk/reward calculator, pip calculator, and more. Helps you size positions correctly and manage risk.",
      whenToUse: "Use before every trade to calculate proper position size.",
      creditCost: "Free feature"
    },
    {
      icon: <Bell className="h-6 w-6" />,
      title: "Weekly Summary Reports",
      category: "analysis",
      description: "AI-generated weekly performance summaries delivered automatically",
      howItWorks: "Every week, receive a comprehensive report with your performance metrics, emotional patterns, key insights, and personalized recommendations.",
      whenToUse: "Delivered automatically every Sunday evening via email.",
      creditCost: "Free feature"
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "AI Journal Insights",
      category: "analysis",
      description: "Deep analysis of your trading journal entries",
      howItWorks: "AI analyzes your journal notes, emotions, and lessons learned to identify recurring themes, emotional triggers, and growth opportunities.",
      whenToUse: "Review monthly to track psychological development.",
      creditCost: "3 credits per insight generation"
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: "Public Leaderboard",
      category: "social",
      description: "Compete with other traders on global leaderboards",
      howItWorks: "Opt-in to display your anonymized stats (win rate, profit factor) on public leaderboards. Compare your performance and learn from top traders.",
      whenToUse: "Enable in Settings if you want to participate in community rankings.",
      creditCost: "Free feature"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Goals & Targets",
      category: "tools",
      description: "Set and track trading goals with accountability partners",
      howItWorks: "Create weekly/monthly goals (profit targets, max drawdown, consistency metrics). Share with accountability partners and get notifications on progress.",
      whenToUse: "Set at the start of each week/month. Review progress daily.",
      creditCost: "Free feature"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "MT5 Auto-Sync",
      category: "tools",
      description: "Automatically import trades from MetaTrader 5",
      howItWorks: "Connect your MT5 account once. All trades are automatically imported with 100% accuracy - no manual logging needed.",
      whenToUse: "Set up in Settings → Integrations. Syncs every 15 minutes.",
      creditCost: "Free feature"
    }
  ];

  const faqs = [
    {
      question: "How does the credit system work?",
      answer: "Credits power AI features. Free tier: 50 credits/month. AI analysis costs 1-5 credits depending on complexity. You earn 2 credits for daily check-ins. Upgrade to Pro for 500 credits/month or Lifetime for unlimited."
    },
    {
      question: "What's the AI Trade Interceptor and how accurate is it?",
      answer: "It's a psychological safety net that warns you before emotionally-driven trades. Accuracy improves over time as it learns your patterns. After 20+ trades, it becomes highly accurate at identifying your emotional triggers and high-risk trades."
    },
    {
      question: "Can I connect my MT5 broker account?",
      answer: "Yes! MT5 auto-sync automatically imports trades from your broker. Set it up in Settings → Integrations. This makes logging effortless and ensures 100% accuracy."
    },
    {
      question: "How long until I see results?",
      answer: "You'll get immediate insights from AI analysis. Mental state correlation becomes meaningful after 7 days of check-ins. Pattern recognition improves significantly after 20+ trades. Most users report breakthrough insights within 2 weeks."
    },
    {
      question: "Is my trading data private and secure?",
      answer: "Absolutely. Your data is encrypted, never shared, and you can export or delete it anytime. We use bank-level security (256-bit encryption). Your trading strategies and results remain completely private."
    },
    {
      question: "What makes this different from other trading journals?",
      answer: "Most journals are just spreadsheets that track numbers. We're the only AI-powered trading psychologist that tracks what really matters: your emotions, mental state, and behavioral patterns. We don't just show you what happened - we tell you WHY and warn you before mistakes."
    },
    {
      question: "Can I use this on mobile?",
      answer: "Yes! Install as a PWA (Progressive Web App) for native mobile experience. Voice logging and quick check-ins work perfectly on mobile."
    },
    {
      question: "What if I'm a beginner trader?",
      answer: "Perfect! The AI coach guides you through proper journaling, psychology management, and strategy development. You'll develop the mental discipline that 95% of traders never master."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b border-border/50 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Complete Guide</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              How to Master Trading Psychology with AI
            </h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about using Amphy to overcome emotional trading and maximize performance
            </p>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="container mx-auto px-4 py-12">
        <Card className="bg-gradient-to-br from-primary/10 to-card border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Start Guide
            </CardTitle>
            <CardDescription>Get up and running in 5 minutes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-card rounded-lg border">
                <div className="font-bold mb-2">1. Daily Check-In</div>
                <p className="text-sm text-muted-foreground">Track your mental state every morning (60 seconds)</p>
              </div>
              <div className="p-4 bg-card rounded-lg border">
                <div className="font-bold mb-2">2. Log Your Trades</div>
                <p className="text-sm text-muted-foreground">Use voice, screenshots, or manual entry</p>
              </div>
              <div className="p-4 bg-card rounded-lg border">
                <div className="font-bold mb-2">3. Review AI Insights</div>
                <p className="text-sm text-muted-foreground">See patterns and get warnings before mistakes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Features Guide */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Feature Guides</h2>
          
          <Tabs defaultValue="core" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="core">Core Features</TabsTrigger>
              <TabsTrigger value="logging">Logging Tools</TabsTrigger>
              <TabsTrigger value="analysis">Analysis & Insights</TabsTrigger>
              <TabsTrigger value="social">Social & Community</TabsTrigger>
              <TabsTrigger value="tools">Tools & Utilities</TabsTrigger>
            </TabsList>
            
            <TabsContent value="core" className="mt-6">
              <div className="grid gap-4">
                {features.filter(f => f.category === "core").map((feature, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {feature.icon}
                        </div>
                        {feature.title}
                      </CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">How It Works</h4>
                        <p className="text-sm text-muted-foreground">{feature.howItWorks}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">When to Use</h4>
                        <p className="text-sm text-muted-foreground">{feature.whenToUse}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold">Credit Cost:</span>
                        <span className="text-muted-foreground">{feature.creditCost}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="logging" className="mt-6">
              <div className="grid gap-4">
                {features.filter(f => f.category === "logging").map((feature, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {feature.icon}
                        </div>
                        {feature.title}
                      </CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">How It Works</h4>
                        <p className="text-sm text-muted-foreground">{feature.howItWorks}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">When to Use</h4>
                        <p className="text-sm text-muted-foreground">{feature.whenToUse}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold">Credit Cost:</span>
                        <span className="text-muted-foreground">{feature.creditCost}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="analysis" className="mt-6">
              <div className="grid gap-4">
                {features.filter(f => f.category === "analysis").map((feature, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {feature.icon}
                        </div>
                        {feature.title}
                      </CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">How It Works</h4>
                        <p className="text-sm text-muted-foreground">{feature.howItWorks}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">When to Use</h4>
                        <p className="text-sm text-muted-foreground">{feature.whenToUse}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold">Credit Cost:</span>
                        <span className="text-muted-foreground">{feature.creditCost}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="social" className="mt-6">
              <div className="grid gap-4">
                {features.filter(f => f.category === "social").map((feature, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {feature.icon}
                        </div>
                        {feature.title}
                      </CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">How It Works</h4>
                        <p className="text-sm text-muted-foreground">{feature.howItWorks}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">When to Use</h4>
                        <p className="text-sm text-muted-foreground">{feature.whenToUse}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold">Credit Cost:</span>
                        <span className="text-muted-foreground">{feature.creditCost}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="tools" className="mt-6">
              <div className="grid gap-4">
                {features.filter(f => f.category === "tools").map((feature, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {feature.icon}
                        </div>
                        {feature.title}
                      </CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">How It Works</h4>
                        <p className="text-sm text-muted-foreground">{feature.howItWorks}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">When to Use</h4>
                        <p className="text-sm text-muted-foreground">{feature.whenToUse}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold">Credit Cost:</span>
                        <span className="text-muted-foreground">{feature.creditCost}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Frequently Asked Questions</h2>
          
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Psychology Resources */}
      <section className="container mx-auto px-4 py-12 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Trading Psychology Resources</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Understanding Emotional Trading</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Learn why 95% of trading failure is mental, not technical. Understand the psychology behind revenge trading, FOMO, and overtrading.
                </p>
                <Button variant="outline" className="w-full" onClick={() => navigate("/psychology-guide")}>
                  Read Psychology Guide
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Building Mental Discipline</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Practical exercises and frameworks for developing the psychological edge that separates winning traders from losing ones.
                </p>
                <Button variant="outline" className="w-full" onClick={() => navigate("/psychology-guide")}>
                  View Exercises
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-br from-primary/20 to-card border-primary/30">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Ready to Master Your Trading Psychology?</h3>
            <p className="text-muted-foreground mb-6">
              Start your free trial and get AI-powered insights today
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="bg-primary hover:bg-primary/90">
              Start Free Trial
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Guides;
