import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PartnerAchievementTracker from "./PartnerAchievementTracker";
import PartnerComparisonChart from "./PartnerComparisonChart";
import PartnerTradingStats from "./PartnerTradingStats";
import AutomatedReminders from "./AutomatedReminders";

interface AccountabilityAnalyticsProps {
  partnershipId: string;
}

export default function AccountabilityAnalytics({ partnershipId }: AccountabilityAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to view analytics");
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);
      await loadAnalytics();
    };
    initialize();
  }, [partnershipId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-partner-analytics', {
        body: { partnership_id: partnershipId, days: 30 },
      });

      if (error) throw error;
      setAnalytics(data);
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Calculate progress first
      await supabase.functions.invoke('calculate-partner-progress', {
        body: { partnership_id: partnershipId },
      });

      // Reload analytics
      await loadAnalytics();
      toast.success("Analytics refreshed");
    } catch (error: any) {
      console.error('Error refreshing:', error);
      toast.error("Failed to refresh analytics");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  const userAchievements = analytics.achievements?.filter((a: any) => a.user_id === currentUserId) || [];
  const userStreaks = analytics.streaks?.filter((s: any) => s.user_id === currentUserId) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics & Progress</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="achievements" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="trading">Trading Stats</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="mt-6">
          <PartnerAchievementTracker
            achievements={userAchievements}
            streaks={userStreaks}
            userStats={analytics.summary?.user || { totalCompleted: 0, totalGoals: 0, completionRate: "0" }}
          />
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <PartnerComparisonChart
            snapshots={analytics.snapshots || []}
            partnership={analytics.partnership}
            currentUserId={currentUserId}
          />
        </TabsContent>

        <TabsContent value="trading" className="mt-6">
          <PartnerTradingStats partnershipId={partnershipId} />
        </TabsContent>

        <TabsContent value="automation" className="mt-6">
          <AutomatedReminders partnershipId={partnershipId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}