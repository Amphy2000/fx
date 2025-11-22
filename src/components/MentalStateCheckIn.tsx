import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Brain, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const MentalStateCheckIn = () => {
  const navigate = useNavigate();
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<any>(null);

  useEffect(() => {
    checkTodayStatus();
  }, []);

  const checkTodayStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      // Check if check-in exists
      const { data: checkIn } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_in_date', today)
        .single();

      setHasCheckedInToday(!!checkIn);
      setTodayStats(checkIn);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (hasCheckedInToday) {
    return (
      <Card className="border-primary/20 bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm md:text-base">Mental State Tracked ✓</h3>
                <p className="text-xs text-muted-foreground">
                  Mood: {todayStats?.mood} • Confidence: {todayStats?.confidence}/10 • Stress: {todayStats?.stress}/10
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/check-in')}
            >
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent animate-pulse-slow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Start With Your Mind, Not Your Trades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-primary/20">
          <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              Your psychology drives 95% of your results
            </p>
            <p className="text-xs text-muted-foreground">
              Track your sleep, stress, and mental state before trading. AI will connect these to your performance patterns.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 bg-background/50 rounded-lg border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Better Decisions</div>
            <div className="text-lg font-bold text-primary">85%</div>
          </div>
          <div className="p-3 bg-background/50 rounded-lg border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Pattern Clarity</div>
            <div className="text-lg font-bold text-primary">3x</div>
          </div>
          <div className="p-3 bg-background/50 rounded-lg border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Consistency</div>
            <div className="text-lg font-bold text-primary">+40%</div>
          </div>
        </div>

        <Button 
          onClick={() => navigate('/check-in')}
          className="w-full"
          size="lg"
        >
          <Heart className="mr-2 h-4 w-4" />
          Do Mental Check-In (2 min)
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Pro traders check their mind before checking the charts
        </p>
      </CardContent>
    </Card>
  );
};