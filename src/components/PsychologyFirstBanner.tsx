import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, X, Heart, AlertTriangle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const PsychologyFirstBanner = () => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    checkFirstTimeUser();
  }, []);

  const checkFirstTimeUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has any trades
      const { data: userTrades } = await supabase
        .from('trades')
        .select('id')
        .eq('user_id', user.id)
        .limit(5);

      setTrades(userTrades || []);

      // Show banner if user has less than 5 trades
      if (!userTrades || userTrades.length < 5) {
        const dismissed = localStorage.getItem('psychology_banner_dismissed');
        if (!dismissed) {
          setShow(true);
        }
      }
    } catch (error) {
      console.error('Error checking first time user:', error);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('psychology_banner_dismissed', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
      <CardContent className="p-6 md:p-8">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-shrink-0">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Brain className="h-8 w-8 md:h-10 md:w-10 text-primary" />
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-xl md:text-2xl font-bold mb-2">
                Welcome to Your AI Trading Psychologist
              </h3>
              <p className="text-sm md:text-base text-muted-foreground">
                You're not using a regular trading journal. This is an <strong className="text-foreground">AI-powered psychology platform</strong> designed to help you overcome your biggest enemy: emotional trading.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div className="flex items-start gap-2 p-3 bg-background/50 rounded-lg border border-primary/20">
                <Heart className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-foreground">Track Your Mind</div>
                  <div className="text-xs text-muted-foreground">Sleep, stress, emotions affect 95% of results</div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-background/50 rounded-lg border border-primary/20">
                <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-foreground">AI Warnings</div>
                  <div className="text-xs text-muted-foreground">Get alerts before emotional mistakes</div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-background/50 rounded-lg border border-primary/20">
                <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-foreground">See Patterns</div>
                  <div className="text-xs text-muted-foreground">Connect emotions to performance</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button onClick={handleDismiss} variant="outline" size="sm">
                I Understand
              </Button>
              <Button onClick={() => navigate('/psychology-guide')} variant="ghost" size="sm" className="text-xs">
                Learn More About Psychology-First Trading
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};