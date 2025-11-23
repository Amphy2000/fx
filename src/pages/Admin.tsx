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
import { Loader2, Download, Search, Eye, Crown, Mail, BarChart3, Shield } from "lucide-react";
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
      <div className="w-full px-3 sm:px-4 lg:px-6 py-4 max-w-full overflow-x-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Admin Panel</h1>
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex mb-4 h-auto flex-wrap gap-1">
              <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
              <TabsTrigger value="weekly-summaries" className="text-xs sm:text-sm">
                <Mail className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Weekly Summaries</span>
                <span className="sm:hidden">Weekly</span>
              </TabsTrigger>
              <TabsTrigger value="abuse-prevention" className="text-xs sm:text-sm">
                <Shield className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Abuse Prevention</span>
                <span className="sm:hidden">Abuse</span>
              </TabsTrigger>
              <TabsTrigger value="email-lists" className="text-xs sm:text-sm">Lists</TabsTrigger>
              <TabsTrigger value="email-templates" className="text-xs sm:text-sm">Templates</TabsTrigger>
              <TabsTrigger value="email-campaigns" className="text-xs sm:text-sm">Campaigns</TabsTrigger>
              <TabsTrigger value="email-workflows" className="text-xs sm:text-sm">Workflows</TabsTrigger>
              <TabsTrigger value="ab-tests" className="text-xs sm:text-sm">A/B Tests</TabsTrigger>
              <TabsTrigger value="personalization" className="text-xs sm:text-sm">Personalization</TabsTrigger>
              <TabsTrigger value="warmup" className="text-xs sm:text-sm">Warm-Up</TabsTrigger>
              <TabsTrigger value="email-analytics" className="text-xs sm:text-sm">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
            </TabsList>
          </ScrollArea>

          <TabsContent value="users" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-foreground">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{stats.totalUsers}</p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-foreground">Total Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{stats.totalTrades}</p>
                </CardContent>
              </Card>
            </div>

            {/* Credit Manager */}
            <AdminCreditManager />

            {/* Search Bar */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Users Table */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-foreground">All Users</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <ScrollArea className="h-[500px] w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Email</TableHead>
                          <TableHead className="whitespace-nowrap">Name</TableHead>
                          <TableHead className="whitespace-nowrap">Trades</TableHead>
                          <TableHead className="whitespace-nowrap min-w-[200px]">Subscription</TableHead>
                          <TableHead className="whitespace-nowrap">Joined</TableHead>
                          <TableHead className="whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="text-foreground whitespace-nowrap text-sm">{user.email}</TableCell>
                            <TableCell className="text-foreground whitespace-nowrap text-sm">{user.full_name || "N/A"}</TableCell>
                            <TableCell className="text-foreground text-sm">{user.trades_count || 0}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getSubscriptionBadge(user.subscription_tier || 'free')}
                                <Select
                                  value={user.subscription_tier || 'free'}
                                  onValueChange={(value) => handleUpdateSubscription(user.id, value)}
                                >
                                  <SelectTrigger className="w-[110px] h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="lifetime">
                                      <div className="flex items-center gap-1">
                                        <Crown className="h-3 w-3" />
                                        Lifetime
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(user)}
                                className="h-8"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                <span className="text-xs">View</span>
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
        </Tabs>

        {/* User Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-full sm:max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">User Details: {selectedUser?.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Full Name</p>
                  <p className="text-sm sm:text-base text-foreground font-medium">{selectedUser?.full_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-sm sm:text-base text-foreground font-medium">{selectedUser?.trades_count || 0}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Subscription</p>
                  <div className="mt-1">{getSubscriptionBadge(selectedUser?.subscription_tier || 'free')}</div>
                </div>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">Recent Trades</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Pair</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Direction</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Result</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">P/L</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userTrades.map((trade) => (
                        <TableRow key={trade.id}>
                          <TableCell className="text-foreground text-xs sm:text-sm">{trade.pair}</TableCell>
                          <TableCell className="text-foreground text-xs sm:text-sm">{trade.direction}</TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <span className={trade.result === 'win' ? 'text-success' : trade.result === 'loss' ? 'text-destructive' : 'text-muted-foreground'}>
                              {trade.result || 'pending'}
                            </span>
                          </TableCell>
                          <TableCell className="text-foreground text-xs sm:text-sm">{trade.profit_loss || 'N/A'}</TableCell>
                          <TableCell className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                            {new Date(trade.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
