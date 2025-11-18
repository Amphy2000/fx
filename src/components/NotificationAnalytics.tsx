import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModernDonutChart } from "./ModernDonutChart";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Send, MousePointerClick, Eye, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const NotificationAnalytics = () => {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notification-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_notifications")
        .select(`
          *,
          notification_clicks(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  // Calculate overall metrics
  const totalSent = notifications?.reduce((sum, n) => sum + (n.sent_count || 0), 0) || 0;
  const totalFailed = notifications?.reduce((sum, n) => sum + (n.failed_count || 0), 0) || 0;
  const totalOpened = notifications?.reduce((sum, n) => sum + (n.opened_count || 0), 0) || 0;
  const totalClicked = notifications?.reduce((sum, n) => sum + (n.clicked_count || 0), 0) || 0;

  const deliveryRate = totalSent > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1) : 0;
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0;
  const clickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : 0;

  // Engagement over time (last 7 notifications)
  const engagementTrends = notifications
    ?.slice(0, 7)
    .reverse()
    .map((n, i) => ({
      name: `N${i + 1}`,
      sent: n.sent_count || 0,
      opened: n.opened_count || 0,
      clicked: n.clicked_count || 0,
    })) || [];

  // Segment performance
  const segmentData = notifications?.reduce((acc: any, n) => {
    const segment = n.user_segment || "all";
    if (!acc[segment]) {
      acc[segment] = { sent: 0, opened: 0, clicked: 0 };
    }
    acc[segment].sent += n.sent_count || 0;
    acc[segment].opened += n.opened_count || 0;
    acc[segment].clicked += n.clicked_count || 0;
    return acc;
  }, {});

  const segmentChartData = Object.entries(segmentData || {}).map(([segment, data]: [string, any]) => ({
    name: segment,
    value: data.opened,
    engagement: data.sent > 0 ? ((data.opened / data.sent) * 100).toFixed(1) : 0,
  }));

  // Delivery status
  const deliveryData = [
    { name: "Delivered", value: totalSent, color: "hsl(var(--primary))" },
    { name: "Failed", value: totalFailed, color: "hsl(var(--destructive))" },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totalSent} sent, {totalFailed} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate}%</div>
            <p className="text-xs text-muted-foreground">{totalOpened} opened</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clickRate}%</div>
            <p className="text-xs text-muted-foreground">{totalClicked} clicks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Engagement Trends</CardTitle>
            <CardDescription>Last 7 notifications performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={engagementTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--foreground))"
                  fontSize={11}
                />
                <YAxis 
                  stroke="hsl(var(--foreground))"
                  fontSize={11}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="sent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="opened" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicked" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Status</CardTitle>
            <CardDescription>Overall delivery performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ModernDonutChart
              data={deliveryData}
              centerValue={deliveryRate + "%"}
              centerLabel="Success Rate"
            />
          </CardContent>
        </Card>
      </div>

      {/* Segment Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Segment Performance</CardTitle>
          <CardDescription>Engagement rates by user segment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {segmentChartData.map((segment) => (
              <div key={segment.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{segment.name}</span>
                  <span className="text-sm text-muted-foreground">{segment.engagement}% engagement</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${segment.engagement}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>Detailed performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {notifications?.slice(0, 10).map((notification) => (
              <div
                key={notification.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.created_at!).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Sent</p>
                    <p className="text-sm font-medium">{notification.sent_count || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Opened</p>
                    <p className="text-sm font-medium">{notification.opened_count || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Clicked</p>
                    <p className="text-sm font-medium">{notification.clicked_count || 0}</p>
                  </div>
                  {notification.failed_count > 0 && (
                    <div className="text-center">
                      <AlertTriangle className="h-4 w-4 text-destructive mx-auto" />
                      <p className="text-xs text-destructive">{notification.failed_count}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
