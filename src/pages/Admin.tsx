import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Download, Search, Eye, Crown, Mail, BarChart3, Shield, Bell, Brain, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTemplateManager } from "@/components/EmailTemplateManager";
import { EmailCampaignManager } from "@/components/EmailCampaignManager";
import { EmailAnalyticsDashboard } from "@/components/EmailAnalyticsDashboard";
import { EmailWorkflowManager } from "@/components/EmailWorkflowManager";
import { EmailABTestManager } from "@/components/EmailABTestManager";
import { EmailListManager } from "@/components/EmailListManager";
import { EmailPersonalizationManager } from "@/components/EmailPersonalizationManager";
import { EmailWarmUpManager } from "@/components/EmailWarmUpManager";
import { AdminCreditManager } from "@/components/AdminCreditManager";
import { WeeklySummaryEmailManager } from "@/components/WeeklySummaryEmailManager";
import AdminAffiliateManager from "@/components/AdminAffiliateManager";
import { AdminNotificationSender } from "@/components/AdminNotificationSender";
import { AdminAIInsights } from "@/components/AdminAIInsights";
import { AdminBundleAnalytics } from "@/components/AdminBundleAnalytics";

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ totalUsers: 0, totalTrades: 0 });
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userTrades, setUserTrades] = useState<any[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    checkAdminAccess();
  }, [navigate]);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is admin using the has_role function
      const { data: roleData, error: roleError } = await supabase
        .rpc('has_role', { _user_id: session.user.id, _role: 'admin' });

      if (roleError) throw roleError;

      // Super Admin bypass for amphy2000@gmail.com
      if (!roleData && session.user.email === 'amphy2000@gmail.com') {
        console.log('Super Admin access granted via email bypass');
        setIsAdmin(true);
        await fetchAdminData();
        return;
      }

      if (!roleData) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await fetchAdminData();
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast.error("Failed to verify admin access");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      // Fetch total trades count
      const { count: tradesCount, error: tradesError } = await supabase
        .from("trades")
        .select("*", { count: "exact", head: true });

      if (tradesError) throw tradesError;

      setUsers(usersData || []);
      setFilteredUsers(usersData || []);
      setStats({
        totalUsers: usersData?.length || 0,
        totalTrades: tradesCount || 0,
      });
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Failed to load admin data");
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user =>
      user.email?.toLowerCase().includes(query.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const handleViewDetails = async (user: any) => {
    setSelectedUser(user);
    setShowDetailsModal(true);

    try {
      const { data: trades, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setUserTrades(trades || []);
    } catch (error) {
      console.error("Error fetching user trades:", error);
      toast.error("Failed to load user trades");
    }
  };

  const handleUpdateSubscription = async (userId: string, tier: string) => {
    try {
      console.log(`Admin upgrading user ${userId} to ${tier}`);

      const { data, error } = await supabase.functions.invoke('admin-upgrade-user', {
        body: {
          userId,
          tier
        }
      });

      if (error) throw error;

      toast.success(`User upgraded to ${tier} successfully!`);
      await fetchAdminData();
    } catch (error: any) {
      console.error("Error updating subscription:", error);
      toast.error(error.message || "Failed to update subscription");
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ["Email", "Full Name", "Trades Count", "Subscription", "Created At"],
      ...filteredUsers.map(user => [
        user.email,
        user.full_name || "N/A",
        user.trades_count || 0,
        user.subscription_tier || "free",
        new Date(user.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("CSV exported successfully");
  };

  const getSubscriptionBadge = (tier: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", label: string }> = {
      free: { variant: "outline", label: "Free" },
      monthly: { variant: "default", label: "Monthly" },
      lifetime: { variant: "secondary", label: "Lifetime" }
    };
    const config = variants[tier] || variants.free;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  return (
    <Layout>
      <div className="w-full px-2 py-3 max-w-[100vw] overflow-x-hidden">
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold text-foreground truncate">Admin Panel</h1>
            <Button onClick={handleExportCSV} variant="outline" size="sm" className="text-xs h-8 px-2">
              <Download className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-3 overflow-x-auto">
            <TabsList className="flex flex-wrap w-full justify-start gap-1 h-auto bg-muted/50 p-1">
              <TabsTrigger value="overview" className="text-xs px-3 py-1.5 font-medium">
                <BarChart3 className="h-3 w-3 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs px-3 py-1.5">
                <Crown className="h-3 w-3 mr-1" />
                Users
              </TabsTrigger>
              <TabsTrigger value="email-management" className="text-xs px-3 py-1.5">
                <Mail className="h-3 w-3 mr-1" />
                Email Management
              </TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs px-3 py-1.5">
                <Bell className="h-3 w-3 mr-1" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="affiliates" className="text-xs px-3 py-1.5">Affiliates</TabsTrigger>
              <TabsTrigger value="security" className="text-xs px-3 py-1.5">
                <Shield className="h-3 w-3 mr-1" />
                Security
              </TabsTrigger>
              <TabsTrigger value="ai-insights" className="text-xs px-3 py-1.5">
                <Brain className="h-3 w-3 mr-1" />
                AI Insights
              </TabsTrigger>
              <TabsTrigger value="bundle-analytics" className="text-xs px-3 py-1.5">
                <TrendingUp className="h-3 w-3 mr-1" />
                Bundle
              </TabsTrigger>
              <TabsTrigger value="ai-config" className="text-xs px-3 py-1.5">
                <Brain className="h-3 w-3 mr-1" />
                AI Config
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Card className="border-border bg-card">
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-xs font-medium text-foreground">Total Users</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-2xl font-bold text-primary">{stats.totalUsers}</p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-xs font-medium text-foreground">Total Trades</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-2xl font-bold text-primary">{stats.totalTrades}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button variant="outline" className="justify-start" onClick={() => setActiveTab("users")}>
                  <Crown className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => setActiveTab("email-management")}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email Campaigns
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => setActiveTab("ai-insights")}>
                  <Brain className="h-4 w-4 mr-2" />
                  View AI Insights
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => setActiveTab("security")}>
                  <Shield className="h-4 w-4 mr-2" />
                  Security Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Card className="border-border bg-card">
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-xs font-medium text-foreground">Total Users</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-2xl font-bold text-primary">{stats.totalUsers}</p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-xs font-medium text-foreground">Total Trades</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-2xl font-bold text-primary">{stats.totalTrades}</p>
                </CardContent>
              </Card>
            </div>

            {/* Credit Manager */}
            <AdminCreditManager />

            {/* Search Bar */}
            <div className="px-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-7 h-8 text-xs"
                />
              </div>
            </div>

            {/* Users Table */}
            <Card className="border-border">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm text-foreground">All Users</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <ScrollArea className="h-[400px] w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs px-2">Email</TableHead>
                          <TableHead className="text-xs px-2">Name</TableHead>
                          <TableHead className="text-xs px-2">Trades</TableHead>
                          <TableHead className="text-xs px-2 min-w-[180px]">Subscription</TableHead>
                          <TableHead className="text-xs px-2">Joined</TableHead>
                          <TableHead className="text-xs px-2">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="text-foreground text-xs px-2 max-w-[150px] truncate">{user.email}</TableCell>
                            <TableCell className="text-foreground text-xs px-2 max-w-[100px] truncate">{user.full_name || "N/A"}</TableCell>
                            <TableCell className="text-foreground text-xs px-2">{user.trades_count || 0}</TableCell>
                            <TableCell className="px-2">
                              <div className="flex items-center gap-1 flex-nowrap">
                                <div className="flex-shrink-0">
                                  {getSubscriptionBadge(user.subscription_tier || 'free')}
                                </div>
                                <Select
                                  value={user.subscription_tier || 'free'}
                                  onValueChange={(value) => handleUpdateSubscription(user.id, value)}
                                >
                                  <SelectTrigger className="w-[90px] h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="free" className="text-xs">Free</SelectItem>
                                    <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                                    <SelectItem value="lifetime" className="text-xs">
                                      <div className="flex items-center gap-1">
                                        <Crown className="h-3 w-3" />
                                        Lifetime
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs px-2">
                              {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </TableCell>
                            <TableCell className="px-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(user)}
                                className="h-6 px-2"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email-management" className="space-y-3">
            <Tabs defaultValue="campaigns" className="w-full">
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-4">
                <TabsTrigger value="campaigns" className="text-xs">Campaigns</TabsTrigger>
                <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
                <TabsTrigger value="lists" className="text-xs">Lists</TabsTrigger>
                <TabsTrigger value="workflows" className="text-xs">Workflows</TabsTrigger>
                <TabsTrigger value="ab-tests" className="text-xs">A/B Tests</TabsTrigger>
                <TabsTrigger value="personalization" className="text-xs">Personalization</TabsTrigger>
                <TabsTrigger value="warmup" className="text-xs">Warm-Up</TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="campaigns">
                <EmailCampaignManager />
              </TabsContent>

              <TabsContent value="templates">
                <EmailTemplateManager />
              </TabsContent>

              <TabsContent value="lists">
                <EmailListManager />
              </TabsContent>

              <TabsContent value="workflows">
                <EmailWorkflowManager />
              </TabsContent>

              <TabsContent value="ab-tests">
                <EmailABTestManager />
              </TabsContent>

              <TabsContent value="personalization">
                <EmailPersonalizationManager />
              </TabsContent>

              <TabsContent value="warmup">
                <EmailWarmUpManager />
              </TabsContent>

              <TabsContent value="analytics">
                <EmailAnalyticsDashboard />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-3">
            <Tabs defaultValue="send" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="send">Send Notifications</TabsTrigger>
                <TabsTrigger value="weekly">Weekly Summaries</TabsTrigger>
              </TabsList>

              <TabsContent value="send">
                <AdminNotificationSender />
              </TabsContent>

              <TabsContent value="weekly">
                <WeeklySummaryEmailManager />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="affiliates">
            <AdminAffiliateManager />
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Abuse Prevention Management
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Manage flagged signups, IP/device blocks, and create overrides for legitimate users
                    </p>
                  </div>
                  <Button onClick={() => navigate('/admin/abuse-prevention')}>
                    Open Full Panel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    The Abuse Prevention system protects your platform from free tier abuse by:
                  </p>
                  <ul className="space-y-2 text-sm list-disc pl-6">
                    <li>Tracking IP addresses and device fingerprints during signup</li>
                    <li>Preventing multiple free accounts from the same location/device</li>
                    <li>Flagging suspicious signup attempts for admin review</li>
                    <li>Allowing manual overrides for legitimate cases</li>
                  </ul>
                  <Button
                    onClick={() => navigate('/admin/abuse-prevention')}
                    variant="outline"
                    className="w-full"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Manage Abuse Prevention
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-insights">
            <AdminAIInsights />
          </TabsContent>

          <TabsContent value="bundle-analytics">
            <AdminBundleAnalytics />
          </TabsContent>

          <TabsContent value="ai-config" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Gemini AI Configuration
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Move your AI usage from Lovable to your own free Gemini API to bypass all credit limits.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <h3 className="font-bold flex items-center gap-2 text-foreground">
                    <Shield className="h-4 w-4 text-green-500" />
                    How to use YOUR Gemini API (100% Free Forever):
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                    <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-primary underline">Google AI Studio</a>.</li>
                    <li>Create a free <b>Gemini 2.0 Flash</b> API key (completely free, no credit card).</li>
                    <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" className="text-primary underline">Supabase Dashboard</a>.</li>
                    <li>Select your project → <b>Settings</b> → <b>Edge Functions</b> → <b>Secrets</b>.</li>
                    <li>Click <b>Add Secret</b>:<br />
                      <code className="bg-background px-2 py-1 rounded mt-1 inline-block border text-foreground font-mono">Name: GEMINI_API_KEY</code><br />
                      <code className="bg-background px-2 py-1 rounded mt-1 inline-block border text-foreground font-mono">Value: [paste your key]</code>
                    </li>
                    <li>Click <b>Save</b>. Your app will instantly start using YOUR key instead of Lovable's!</li>
                  </ol>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-background shadow-sm hover:border-primary/50 transition-colors">
                    <div>
                      <p className="font-bold text-foreground">Vercel AI Bridge Status</p>
                      <p className="text-xs text-muted-foreground">This bridge automatically handles Gemini rate-limits.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={async () => {
                      try {
                        toast.info("Testing Supabase Edge Function...");

                        // Call the actual Supabase function with a test payload
                        const { data, error } = await supabase.functions.invoke('analyze-trade', {
                          body: { tradeId: 'test-gemini-key-check' }
                        });

                        if (error) {
                          if (error.message?.includes('GEMINI_API_KEY')) {
                            toast.error("❌ GEMINI_API_KEY not set in Supabase! Go to Supabase Dashboard → Settings → Edge Functions → Secrets and add it.");
                          } else if (error.message?.includes('Trade not found') || error.message?.includes('404')) {
                            toast.success("✅ SUCCESS! Edge Function is working. Add GEMINI_API_KEY to Supabase Secrets to use your own key.");
                          } else if (error.message?.includes('Insufficient credits')) {
                            toast.warning("⚠️ Using Lovable AI (credits required). Add GEMINI_API_KEY to Supabase to bypass this.");
                          } else {
                            toast.error(`Error: ${error.message}`);
                          }
                        } else {
                          toast.success("✅ Edge Function responded successfully!");
                        }

                        console.log("Edge Function Response:", { data, error });
                      } catch (e: any) {
                        console.error("Edge Function Test Failed:", e);
                        toast.error(`Test failed: ${e.message}`);
                      }
                    }}>Test Edge Function</Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic text-center">
                    Note: The app will now automatically retry calls if Google's free tier hits its 15 RPM limit.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base truncate">User: {selectedUser?.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="text-sm text-foreground font-medium truncate">{selectedUser?.full_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Trades</p>
                  <p className="text-sm text-foreground font-medium">{selectedUser?.trades_count || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Subscription</p>
                  <div className="mt-1">{getSubscriptionBadge(selectedUser?.subscription_tier || 'free')}</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 text-foreground">Recent Trades</h3>
                <div className="overflow-x-auto -mx-3">
                  <div className="inline-block min-w-full px-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs px-2">Pair</TableHead>
                          <TableHead className="text-xs px-2">Direction</TableHead>
                          <TableHead className="text-xs px-2">Result</TableHead>
                          <TableHead className="text-xs px-2">P/L</TableHead>
                          <TableHead className="text-xs px-2">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userTrades.map((trade) => (
                          <TableRow key={trade.id}>
                            <TableCell className="text-foreground text-xs px-2">{trade.pair}</TableCell>
                            <TableCell className="text-foreground text-xs px-2">{trade.direction}</TableCell>
                            <TableCell className="text-xs px-2">
                              <span className={trade.result === 'win' ? 'text-success' : trade.result === 'loss' ? 'text-destructive' : 'text-muted-foreground'}>
                                {trade.result || 'pending'}
                              </span>
                            </TableCell>
                            <TableCell className="text-foreground text-xs px-2">{trade.profit_loss || 'N/A'}</TableCell>
                            <TableCell className="text-muted-foreground text-xs px-2 whitespace-nowrap">
                              {new Date(trade.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Admin;
