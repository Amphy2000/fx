import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Mic, Brain, Target, ArrowRight, TrendingUp, Heart, Sparkles, MessageCircle, BarChart3, ShieldCheck, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Testimonials } from "@/components/Testimonials";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { Footer } from "@/components/Footer";
import { ProblemSolutionCards } from "@/components/ProblemSolutionCards";
import { HowItWorksTimeline } from "@/components/HowItWorksTimeline";
import { motion, useScroll, useTransform } from "framer-motion";
import dashboardMockup from "@/assets/dashboard-mockup.png";

const Index = () => {
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const features = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI Trading Psychologist",
      description: "Advanced algorithms analyze every trade through the lens of psychology, identifying emotional patterns and cognitive biases."
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Real-time Interception",
      description: "AI detects high-risk mental states and intercepts potentially emotional trades before you can confirm the order."
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Holistic Health Tracking",
      description: "Track sleep, stress, and mood - discover exactly how your physical and mental state dictates your P&L."
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Behavioral Guardrails",
      description: "Set custom behavioral alerts that warn you when you're deviating from your plan or repeating past mistakes."
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Deep Pattern Recognition",
      description: "Connect emotions to setups to outcomes. See hidden correlations that numbers alone will never reveal."
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: "Voice-First Journaling",
      description: "Log your trades via voice while the market is moving. AI extracts the emotional context automatically."
    }
  ];

  const stats = [
    { value: "95%", label: "Of failure is mental" },
    { value: "5000+", label: "Emotional trades blocked" },
    { value: "AI-1st", label: "Journaling experience" }
  ];

  return (
    <div className="min-h-screen bg-background selection:bg-chart-1/30 selection:text-foreground">
      <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 hidden sm:block">
        <div className="max-w-7xl mx-auto rounded-2xl bg-card/60 backdrop-blur-xl border border-border/50 px-6 py-3 shadow-sm">
          <Navbar />
        </div>
      </div>
      <div className="sm:hidden sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <Navbar />
      </div>
      
      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-40 pb-20 sm:pb-32 overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-chart-1/10 rounded-[100%] blur-[120px] -z-10 animate-pulse" />
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-chart-2/5 rounded-full blur-[100px] -z-10" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        
        <div className="container mx-auto px-4">
          <motion.div 
            style={{ opacity: heroOpacity, scale: heroScale }}
            className="text-center max-w-5xl mx-auto mb-16 sm:mb-24"
          >
            {/* Animated Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-chart-1/10 border border-chart-1/20 mb-8 backdrop-blur-sm"
            >
              <Sparkles className="h-4 w-4 text-chart-1" />
              <span className="text-xs font-bold uppercase tracking-wider text-chart-1">Revolutionizing Risk Management</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-6xl md:text-7xl font-extrabold mb-8 text-foreground tracking-tighter leading-[1.1]"
            >
              Master Your Mind. <br />
              <span className="bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3 bg-clip-text text-transparent">
                Control the Market.
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg sm:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed font-medium"
            >
              The first AI-powered trading journal that intercepts emotional mistakes before they happen. Because 95% of trading failure is mental, not technical.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")} 
                className="w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90 text-lg px-10 py-8 h-auto font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all group"
              >
                Start Trading with AI
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate("/auth")} 
                className="w-full sm:w-auto text-lg px-10 py-8 h-auto font-bold rounded-2xl border-2 hover:bg-muted/50 transition-all"
              >
                Learn More
              </Button>
            </motion.div>
          </motion.div>

          {/* Product Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", damping: 15 }}
            className="relative max-w-6xl mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
            <div className="relative rounded-3xl overflow-hidden border-4 border-card/50 bg-card shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] transform perspective-1000">
              <img 
                src={dashboardMockup} 
                alt="Amphy AI Dashboard" 
                className="w-full h-auto object-cover"
              />
            </div>
            
            {/* Floaties */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-10 -right-4 sm:-right-12 z-20 bg-card/90 backdrop-blur-lg border border-border/50 p-4 rounded-2xl shadow-2xl hidden md:block max-w-[240px]"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-lg bg-chart-1/20 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-chart-1" />
                </div>
                <span className="font-bold text-sm">Psychology Risk</span>
              </div>
              <p className="text-xs text-muted-foreground italic">"AI detected high stress level. Recommend skipping the next NY Session open."</p>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 -left-4 sm:-left-12 z-20 bg-card/90 backdrop-blur-lg border border-border/50 p-4 rounded-2xl shadow-2xl hidden md:block"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-bold text-sm">Syncing MT5...</span>
              </div>
              <p className="text-[10px] text-muted-foreground">3 trades imported automatically</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Trust & Stats Section */}
      <section className="py-20 relative overflow-hidden bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl sm:text-6xl font-black mb-2 bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent italic">
                  {stat.value}
                </div>
                <div className="text-sm sm:text-base text-muted-foreground font-bold tracking-widest uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Problem/Solution Section */}
      <section className="py-24 sm:py-32 bg-background border-y border-border/50">
        <div className="container mx-auto px-4">
          <ProblemSolutionCards />
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 sm:py-32 bg-card/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-chart-1/5 rounded-full blur-[120px] -z-10" />
        <div className="container mx-auto px-4">
          <HowItWorksTimeline />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 sm:py-32 border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-black mb-6 italic tracking-tight">
              Powerful Features for Serious Traders
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              Everything you need to turn your trading into a professional, systematic business.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <motion.div 
                whileHover={{ y: -5 }}
                key={index} 
                className="group p-8 rounded-3xl bg-card/40 border border-border/50 hover:border-chart-1/50 transition-all hover:bg-card/60 backdrop-blur-sm"
              >
                <div className="h-14 w-14 rounded-2xl bg-chart-1/10 flex items-center justify-center mb-6 border border-chart-1/30 group-hover:scale-110 group-hover:bg-chart-1/20 transition-all duration-300">
                  <div className="text-chart-1">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-chart-1 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed font-medium">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* Final CTA Section */}
      <section className="py-24 sm:py-40 bg-gradient-to-t from-chart-1/10 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-4xl sm:text-6xl font-black mb-8 italic leading-tight">
                Stop Trading On Emotion. <br />
                <span className="text-chart-1">Start Trading with Intelligence.</span>
              </h2>
              <p className="text-xl sm:text-2xl text-muted-foreground mb-12 font-medium max-w-2xl mx-auto">
                Join thousands of traders who have mastered their psychology with Amphy AI.
              </p>
            </motion.div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")} 
                className="w-full sm:w-auto bg-chart-1 hover:bg-chart-1/90 text-white text-xl px-12 py-10 h-auto font-black rounded-3xl shadow-[0_20px_50px_rgba(234,179,8,0.3)] hover:shadow-[0_30px_60px_rgba(234,179,8,0.4)] hover:scale-105 transition-all group"
              >
                Join the Elite Now
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-muted-foreground font-bold">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <span>Verified Results</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <span>Prop Firm Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <span>AI Powered</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
