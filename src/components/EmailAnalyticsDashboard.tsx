import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MousePointerClick, Eye, AlertCircle, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, Area, AreaChart } from "recharts";
import { motion } from "framer-motion";

export const EmailAnalyticsDashboard = () => {
  // Fetch overall stats
  const { data: stats } = useQuery({
    queryKey: ["email-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*");

      if (error) throw error;

      const totalSent = data.reduce((sum, c) => sum + (c.sent_count || 0), 0);
      const totalDelivered = data.reduce((sum, c) => sum + (c.delivered_count || 0), 0);
      const totalOpened = data.reduce((sum, c) => sum + (c.opened_count || 0), 0);
      const totalClicked = data.reduce((sum, c) => sum + (c.clicked_count || 0), 0);
      const totalFailed = data.reduce((sum, c) => sum + (c.failed_count || 0), 0);

      return {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalFailed,
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
        clickToOpenRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
        failureRate: totalSent > 0 ? (totalFailed / totalSent) * 100 : 0,
      };
    },
  });

  // Fetch campaign performance
  const { data: campaigns } = useQuery({
    queryKey: ["email-campaigns-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("name, sent_count, opened_count, clicked_count, failed_count")
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Fetch recent email events
  const { data: recentEvents } = useQuery({
    queryKey: ["recent-email-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_events")
        .select(`
          *,
          email_campaigns(name)
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch user details separately
      const eventsWithUsers = await Promise.all(
        (data || []).map(async (event) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", event.user_id)
            .single();

          return { ...event, profile };
        })
      );

      return eventsWithUsers;
    },
  });

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue }: any) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border/50 hover:border-border transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{value}</div>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-sm text-muted-foreground">{subtitle}</p>
            {trend && (
              <Badge variant={trend === "up" ? "default" : "destructive"} className="gap-1">
                {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trendValue}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Email Analytics</h2>
        <p className="text-muted-foreground text-lg">Monitor your email campaign performance and engagement</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sent"
          value={stats?.totalSent.toLocaleString() || "0"}
          subtitle={`${stats?.deliveryRate.toFixed(1)}% delivered`}
          icon={Mail}
        />
        <StatCard
          title="Open Rate"
          value={`${stats?.openRate.toFixed(1)}%`}
          subtitle={`${stats?.totalOpened.toLocaleString()} opens`}
          icon={Eye}
        />
        <StatCard
          title="Click Rate"
          value={`${stats?.clickRate.toFixed(1)}%`}
          subtitle={`${stats?.totalClicked.toLocaleString()} clicks`}
          icon={MousePointerClick}
        />
        <StatCard
          title="Click-to-Open"
          value={`${stats?.clickToOpenRate.toFixed(1)}%`}
          subtitle="Engagement quality"
          icon={Activity}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>Performance metrics for recent campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--foreground))"
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={100}
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
                    <Bar dataKey="sent" fill="#8B5CF6" name="Sent" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="opened" fill="#10B981" name="Opened" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="clicked" fill="#3B82F6" name="Clicked" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No campaign data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Email Events</CardTitle>
              <CardDescription>Latest opens and clicks across all campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEvents?.map((event) => (
                  <div key={event.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {event.profile?.full_name || event.profile?.email || "Unknown User"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.email_campaigns?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={event.event_type === "open" ? "secondary" : "default"}>
                        {event.event_type === "open" ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Opened
                          </>
                        ) : (
                          <>
                            <MousePointerClick className="h-3 w-3 mr-1" />
                            Clicked
                          </>
                        )}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                {(!recentEvents || recentEvents.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    No events recorded yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};