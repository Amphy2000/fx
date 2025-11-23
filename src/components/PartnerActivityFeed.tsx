import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, UserPlus, Target, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export default function PartnerActivityFeed() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    
    // Set up realtime subscription for new activities
    const channel = supabase
      .channel('partner-activities')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accountability_partnerships'
        },
        () => loadActivities()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'goal_check_ins'
        },
        () => loadActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get recent partnership activities
      const { data: partnerships } = await supabase
        .from('accountability_partnerships')
        .select(`
          *,
          partner_profile:profiles!accountability_partnerships_partner_id_fkey(full_name),
          user_profile:profiles!accountability_partnerships_user_id_fkey(full_name)
        `)
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent check-ins from partnerships
      const partnershipIds = partnerships?.map(p => p.id) || [];
      const { data: checkIns } = await supabase
        .from('goal_check_ins')
        .select(`
          *,
          goal:partner_goals(
            *,
            user:profiles!partner_goals_user_id_fkey(full_name)
          )
        `)
        .in('goal_id', 
          await supabase
            .from('partner_goals')
            .select('id')
            .in('partnership_id', partnershipIds)
            .then(res => res.data?.map(g => g.id) || [])
        )
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Combine and sort activities
      const combined = [
        ...(partnerships?.map(p => ({ ...p, type: 'partnership' })) || []),
        ...(checkIns?.map(c => ({ ...c, type: 'checkin' })) || [])
      ].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 10);

      setActivities(combined);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activity: any) => {
    if (activity.type === 'partnership') {
      if (activity.status === 'active') return UserPlus;
      return Bell;
    }
    return CheckCircle2;
  };

  const getActivityMessage = (activity: any) => {
    if (activity.type === 'partnership') {
      const partnerName = activity.partner_profile?.full_name || 'A trader';
      if (activity.status === 'active') {
        return `${partnerName} is now your accountability partner`;
      }
      return `New partnership request from ${partnerName}`;
    }
    
    const userName = (activity as any).goal?.user?.full_name || 'Partner';
    return `${userName} completed a check-in`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">Loading activity...</p>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No recent activity yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Updates from your accountability partners
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, idx) => {
            const Icon = getActivityIcon(activity);
            return (
              <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className="p-2 rounded-full bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{getActivityMessage(activity)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
                {activity.type === 'checkin' && activity.status && (
                  <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                    {activity.status}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
