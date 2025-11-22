import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, Target, Award, Users, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface CreditEarning {
  id: string;
  earning_type: string;
  credits_earned: number;
  description: string | null;
  earned_at: string;
}

const earningIcons: Record<string, any> = {
  daily_checkin: Target,
  trade_logged: TrendingUp,
  streak_milestone: Award,
  achievement_unlocked: Sparkles,
  referral: Users,
  feedback_submitted: MessageSquare,
};

export const CreditEarningsHistory = () => {
  const [earnings, setEarnings] = useState<CreditEarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('credit_earnings')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setEarnings(data || []);
    } catch (error) {
      console.error('Error fetching credit earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Credit Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (earnings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Credit Earnings
          </CardTitle>
          <CardDescription>Track how you earn AI credits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Start earning credits by:</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>✓ Completing daily check-ins (+1 credit)</li>
              <li>✓ Logging trades (+1 credit)</li>
              <li>✓ Maintaining streaks (bonus credits)</li>
              <li>✓ Unlocking achievements (+5 credits)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Credit Earnings
        </CardTitle>
        <CardDescription>Your recent credit rewards</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {earnings.map((earning) => {
            const Icon = earningIcons[earning.earning_type] || Sparkles;
            return (
              <div
                key={earning.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {earning.description || earning.earning_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(earning.earned_at), 'MMM dd, yyyy · HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-semibold text-primary">
                  <span className="text-lg">+{earning.credits_earned}</span>
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
