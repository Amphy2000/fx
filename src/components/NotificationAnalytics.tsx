import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModernDonutChart } from "./ModernDonutChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Send, MousePointerClick, Eye, AlertTriangle, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const NotificationAnalytics = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
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
          <CardDescription>Detailed performance metrics with filtering</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notifications List */}
          <div className="space-y-2">
            {(() => {
              const filtered = notifications?.filter(n => {
                const matchesSearch = searchQuery === "" || 
                  n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (n.body && n.body.toLowerCase().includes(searchQuery.toLowerCase()));
                const matchesStatus = statusFilter === "all" || n.status === statusFilter;
                return matchesSearch && matchesStatus;
              }) || [];

              const startIndex = (currentPage - 1) * itemsPerPage;
              const paginatedNotifications = filtered.slice(startIndex, startIndex + itemsPerPage);
              const totalPages = Math.ceil(filtered.length / itemsPerPage);

              if (paginatedNotifications.length === 0) {
                return (
                  <p className="text-center text-muted-foreground py-8">
                    No notifications found
                  </p>
                );
              }

              return (
                <>
                  {paginatedNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="text-sm font-medium truncate">{notification.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {notification.body}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded bg-muted">
                            {notification.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(notification.created_at!).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
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

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} notifications
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
