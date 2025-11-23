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
import { Loader2, Download, Search, Eye, Crown, Mail, BarChart3, Shield, Bell } from "lucide-react";
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

        <Tabs defaultValue="users" className="w-full">
          <div className="mb-3 overflow-x-auto">
            <TabsList className="flex flex-wrap w-full justify-start gap-1 h-auto bg-muted/50 p-1">
              <TabsTrigger value="users" className="text-xs px-2 py-1.5">Users</TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs px-2 py-1.5">
                <Bell className="h-3 w-3 mr-1" />
                <span>Notify</span>
              </TabsTrigger>
              <TabsTrigger value="weekly-summaries" className="text-xs px-2 py-1.5">
                <Mail className="h-3 w-3 mr-1" />
                <span>Weekly</span>
              </TabsTrigger>
              <TabsTrigger value="abuse-prevention" className="text-xs px-2 py-1.5">
                <Shield className="h-3 w-3 mr-1" />
                <span>Abuse</span>
              </TabsTrigger>
              <TabsTrigger value="email-lists" className="text-xs px-2 py-1.5">Lists</TabsTrigger>
              <TabsTrigger value="email-templates" className="text-xs px-2 py-1.5">Templates</TabsTrigger>
              <TabsTrigger value="email-campaigns" className="text-xs px-2 py-1.5">Campaigns</TabsTrigger>
              <TabsTrigger value="email-workflows" className="text-xs px-2 py-1.5">Workflows</TabsTrigger>
              <TabsTrigger value="ab-tests" className="text-xs px-2 py-1.5">A/B</TabsTrigger>
              <TabsTrigger value="personalization" className="text-xs px-2 py-1.5">Personal</TabsTrigger>
              <TabsTrigger value="warmup" className="text-xs px-2 py-1.5">Warm-Up</TabsTrigger>
              <TabsTrigger value="email-analytics" className="text-xs px-2 py-1.5">
                <BarChart3 className="h-3 w-3 mr-1" />
                Stats
              </TabsTrigger>
              <TabsTrigger value="affiliates" className="text-xs px-2 py-1.5">Affiliates</TabsTrigger>
            </TabsList>
          </div>

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

          <TabsContent value="abuse-prevention">
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

          <TabsContent value="email-lists">
            <EmailListManager />
          </TabsContent>

          <TabsContent value="email-templates">
            <EmailTemplateManager />
          </TabsContent>

          <TabsContent value="email-campaigns">
            <EmailCampaignManager />
          </TabsContent>

          <TabsContent value="email-workflows">
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

          <TabsContent value="email-analytics">
            <EmailAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="weekly-summaries">
            <WeeklySummaryEmailManager />
          </TabsContent>

          <TabsContent value="affiliates">
            <AdminAffiliateManager />
          </TabsContent>

          <TabsContent value="notifications">
            <AdminNotificationSender />
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
