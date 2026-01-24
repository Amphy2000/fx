import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, MousePointerClick, CreditCard, CheckCircle, TrendingUp, Calendar, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface AnalyticsData {
  page_views: number;
  button_clicks: number;
  payments_initiated: number;
  payments_success: number;
  conversion_rate: number;
  click_to_payment_rate: number;
}

interface DailyData {
  date: string;
  page_views: number;
  button_clicks: number;
  payments_initiated: number;
  payments_success: number;
}

export function AdminBundleAnalytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7");
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    page_views: 0,
    button_clicks: 0,
    payments_initiated: 0,
    payments_success: 0,
    conversion_rate: 0,
    click_to_payment_rate: 0,
  });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [diagnostics, setDiagnostics] = useState<{
    tableExists: boolean | null;
    totalRecords: number | null;
    userTier: string | null;
    error: string | null;
  }>({
    tableExists: null,
    totalRecords: null,
    userTier: null,
    error: null,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const days = parseInt(timeRange);
      const startDate = startOfDay(subDays(new Date(), days)).toISOString();
      const endDate = endOfDay(new Date()).toISOString();

      // Fetch analytics data
      const { data, error } = await supabase
        .from("bundle_analytics")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (error) throw error;

      // Count events
      const page_views = data?.filter(e => e.event_type === "page_view").length || 0;
      const button_clicks = data?.filter(e => e.event_type === "button_click").length || 0;
      const payments_initiated = data?.filter(e => e.event_type === "payment_initiated").length || 0;
      const payments_success = data?.filter(e => e.event_type === "payment_success").length || 0;

      // Calculate conversion rates
      const conversion_rate = page_views > 0 ? (payments_success / page_views) * 100 : 0;
      const click_to_payment_rate = button_clicks > 0 ? (payments_success / button_clicks) * 100 : 0;

      setAnalytics({
        page_views,
        button_clicks,
        payments_initiated,
        payments_success,
        conversion_rate,
        click_to_payment_rate,
      });

      // Group by day for trend data
      const dailyMap = new Map<string, DailyData>();

      for (let i = 0; i <= days; i++) {
        const date = format(subDays(new Date(), days - i), "yyyy-MM-dd");
        dailyMap.set(date, {
          date,
          page_views: 0,
          button_clicks: 0,
          payments_initiated: 0,
          payments_success: 0,
        });
      }

      data?.forEach(event => {
        const date = format(new Date(event.created_at), "yyyy-MM-dd");
        const existing = dailyMap.get(date);
        if (existing) {
          if (event.event_type === "page_view") existing.page_views++;
          if (event.event_type === "button_click") existing.button_clicks++;
          if (event.event_type === "payment_initiated") existing.payments_initiated++;
          if (event.event_type === "payment_success") existing.payments_success++;
        }
      });

      setDailyData(Array.from(dailyMap.values()));

      // Run diagnostics in parallel
      checkDiagnostics();
    } catch (error: any) {
      console.error("Error fetching bundle analytics:", error);
      setDiagnostics(prev => ({ ...prev, error: error.message }));
    } finally {
      setLoading(false);
    }
  };

  const checkDiagnostics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Check user tier in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();

      // 2. Check table existence and total count (ignoring time range)
      const { count, error: tableError } = await supabase
        .from("bundle_analytics")
        .select("*", { count: 'exact', head: true });

      setDiagnostics({
        tableExists: !tableError || tableError.code !== 'PGRST116',
        totalRecords: count,
        userTier: profile?.subscription_tier || 'none',
        error: tableError?.message || null,
      });

      console.log('[Analytics Diagnostics]', {
        profile_tier: profile?.subscription_tier,
        table_count: count,
        error: tableError
      });
    } catch (err) {
      console.error("Diagnostics failed:", err);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Bundle Page Analytics</h3>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Today</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Funnel Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-3.5 w-3.5" />
              Page Views
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-blue-500">{analytics.page_views}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <MousePointerClick className="h-3.5 w-3.5" />
              Button Clicks
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-yellow-500">{analytics.button_clicks}</p>
            {analytics.page_views > 0 && (
              <p className="text-xs text-muted-foreground">
                {((analytics.button_clicks / analytics.page_views) * 100).toFixed(1)}% of visitors
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5" />
              Payment Started
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-purple-500">{analytics.payments_initiated}</p>
            {analytics.button_clicks > 0 && (
              <p className="text-xs text-muted-foreground">
                {((analytics.payments_initiated / analytics.button_clicks) * 100).toFixed(1)}% of clicks
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5" />
              Purchases
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-green-500">{analytics.payments_success}</p>
            <p className="text-xs text-muted-foreground">
              ₦{(analytics.payments_success * 15000).toLocaleString()} revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Overall Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold">
              {analytics.conversion_rate.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Visitors to Purchase
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-yellow-500" />
              Click-to-Purchase Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold">
              {analytics.click_to_payment_rate.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Button Clicks to Purchase
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      {dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Daily Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-center py-2 px-2">Views</th>
                    <th className="text-center py-2 px-2">Clicks</th>
                    <th className="text-center py-2 px-2">Started</th>
                    <th className="text-center py-2 px-2">Bought</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.slice(-7).reverse().map((day) => (
                    <tr key={day.date} className="border-b border-border/50">
                      <td className="py-2 px-2 font-medium">
                        {format(new Date(day.date), "MMM d")}
                      </td>
                      <td className="text-center py-2 px-2 text-blue-500">{day.page_views}</td>
                      <td className="text-center py-2 px-2 text-yellow-500">{day.button_clicks}</td>
                      <td className="text-center py-2 px-2 text-purple-500">{day.payments_initiated}</td>
                      <td className="text-center py-2 px-2 text-green-500 font-bold">{day.payments_success}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnostics Panel (Visible if stats are zero) */}
      {(analytics.page_views === 0 || diagnostics.error) && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-500">
              <Shield className="h-4 w-4" />
              Debug Analytics Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-background rounded border">
                <p className="text-muted-foreground">Database Table</p>
                <p className="font-mono">{diagnostics.tableExists === null ? 'Checking...' : diagnostics.tableExists ? '✅ Exists' : '❌ Missing'}</p>
              </div>
              <div className="p-2 bg-background rounded border">
                <p className="text-muted-foreground">Total Records</p>
                <p className="font-mono">{diagnostics.totalRecords ?? 0} total</p>
              </div>
              <div className="p-2 bg-background rounded border">
                <p className="text-muted-foreground">Your Tier (Profiles)</p>
                <p className="font-mono">{diagnostics.userTier ?? 'N/A'}</p>
              </div>
              <div className="p-2 bg-background rounded border">
                <p className="text-muted-foreground">Status</p>
                <p className="font-mono">{diagnostics.error ? '❌ RLS Blocked' : 'Healthy'}</p>
              </div>
            </div>

            {diagnostics.userTier !== 'admin' && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-600">
                <p className="font-bold">⚠️ Security Role Mismatch</p>
                <p className="mt-1">The analytics policy requires your <b>profile tier</b> to be 'admin'. Yours is currently '{diagnostics.userTier}'.</p>
                <p className="mt-2 text-[10px] opacity-70 italic">Fix: Run SQL on Supabase to set your tier to 'admin'.</p>
              </div>
            )}

            {diagnostics.error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-600">
                <p className="font-bold">Database Error</p>
                <p className="mt-1 font-mono text-[10px]">{diagnostics.error}</p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={fetchAnalytics}>
                Retry Connection
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-7 text-[10px] bg-red-600 hover:bg-red-700 text-white border-0"
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    toast.loading("Applying one-click fix...");
                    const { data, error } = await supabase.functions.invoke('admin-upgrade-user', {
                      body: { userId: user.id, tier: 'admin' }
                    });

                    if (error) throw error;
                    toast.success("Account fixed! Refreshing stats...");
                    setTimeout(() => window.location.reload(), 1500);
                  } catch (err: any) {
                    console.error('One-click fix failed:', err);
                    toast.error(`Fix failed: ${err.message || 'Unknown error'}`);
                  }
                }}>
                Fix My Role Automatically
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[10px]"
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  const email = user?.email || "your-email@example.com";
                  const sql = `UPDATE profiles SET subscription_tier = 'admin' WHERE email = '${email}';`;
                  navigator.clipboard.writeText(sql);
                  toast.success("SQL copied for " + email);
                }}>
                Copy Upgrade SQL
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
