import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Download, Search, Eye, Crown, Bell, Mail, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminNotificationSender } from "@/components/AdminNotificationSender";
import { EmailTemplateManager } from "@/components/EmailTemplateManager";
import { EmailCampaignManager } from "@/components/EmailCampaignManager";
import { EmailAnalyticsDashboard } from "@/components/EmailAnalyticsDashboard";

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
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-foreground">Admin Panel</h1>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
        </div>

        {/* Stats Cards */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="users">Users Management</TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Push Notifications
            </TabsTrigger>
            <TabsTrigger value="email-templates">
              <Mail className="mr-2 h-4 w-4" />
              Email Templates
            </TabsTrigger>
            <TabsTrigger value="email-campaigns">
              <Mail className="mr-2 h-4 w-4" />
              Email Campaigns
            </TabsTrigger>
            <TabsTrigger value="email-analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Email Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">{stats.totalUsers}</p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">Total Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">{stats.totalTrades}</p>
                </CardContent>
              </Card>
            </div>

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
              <CardHeader>
                <CardTitle className="text-foreground">All Users</CardTitle>
              </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Trades</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-foreground">{user.email}</TableCell>
                      <TableCell className="text-foreground">{user.full_name || "N/A"}</TableCell>
                      <TableCell className="text-foreground">{user.trades_count || 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSubscriptionBadge(user.subscription_tier || 'free')}
                          <Select
                            value={user.subscription_tier || 'free'}
                            onValueChange={(value) => handleUpdateSubscription(user.id, value)}
                          >
                            <SelectTrigger className="w-[130px]">
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
                      <TableCell className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(user)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <AdminNotificationSender />
          </TabsContent>

          <TabsContent value="email-templates">
            <EmailTemplateManager />
          </TabsContent>

          <TabsContent value="email-campaigns">
            <EmailCampaignManager />
          </TabsContent>

          <TabsContent value="email-analytics">
            <EmailAnalyticsDashboard />
          </TabsContent>
        </Tabs>

        {/* User Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details: {selectedUser?.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="text-foreground font-medium">{selectedUser?.full_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-foreground font-medium">{selectedUser?.trades_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subscription</p>
                  <div className="mt-1">{getSubscriptionBadge(selectedUser?.subscription_tier || 'free')}</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Recent Trades</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pair</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>P/L</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userTrades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell className="text-foreground">{trade.pair}</TableCell>
                        <TableCell className="text-foreground">{trade.direction}</TableCell>
                        <TableCell>
                          <span className={trade.result === 'win' ? 'text-success' : trade.result === 'loss' ? 'text-destructive' : 'text-muted-foreground'}>
                            {trade.result || 'pending'}
                          </span>
                        </TableCell>
                        <TableCell className="text-foreground">{trade.profit_loss || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(trade.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Admin;
