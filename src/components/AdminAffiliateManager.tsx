import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, Eye, DollarSign, Users, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";

export default function AdminAffiliateManager() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [customPromoCode, setCustomPromoCode] = useState("");
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, totalEarnings: 0 });
  const [payouts, setPayouts] = useState<any[]>([]);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [payoutNotes, setPayoutNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch affiliate profiles
      const { data: affiliateData, error: affiliateError } = await supabase
        .from("affiliate_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (affiliateError) {
        console.error("Error loading affiliate profiles:", affiliateError);
        toast.error("Failed to load affiliate profiles");
        return;
      }

      // Fetch user profiles for the affiliates
      const userIds = affiliateData?.map(a => a.user_id) || [];
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      if (userError) {
        console.error("Error loading user profiles:", userError);
      }

      // Merge the data
      const mergedData = affiliateData?.map(affiliate => ({
        ...affiliate,
        profiles: userData?.find(u => u.id === affiliate.user_id)
      })) || [];

      setProfiles(mergedData);

      // Calculate stats
      const total = mergedData?.length || 0;
      const active = mergedData?.filter(p => p.status === 'active').length || 0;
      const pending = mergedData?.filter(p => p.status === 'pending').length || 0;
      const totalEarnings = mergedData?.reduce((sum, p) => sum + (p.total_earnings || 0), 0) || 0;

      setStats({ total, active, pending, totalEarnings });

      // Fetch payout requests
      const { data: payoutsData, error: payoutsError } = await supabase
        .from("affiliate_payouts")
        .select(`
          *,
          affiliate_profiles!inner(
            id,
            user_id,
            promo_code,
            paid_earnings,
            profiles:user_id(email, full_name)
          )
        `)
        .order("requested_at", { ascending: false });

      if (payoutsError) {
        console.error("Error loading payouts:", payoutsError);
      } else {
        setPayouts(payoutsData || []);
      }
    } catch (error) {
      console.error("Error loading affiliates:", error);
      toast.error("Failed to load affiliates");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (profileId: string, status: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: any = { status };
      
      if (status === "active") {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = user?.id;
      }

      const { error } = await supabase
        .from("affiliate_profiles")
        .update(updates)
        .eq("id", profileId);

      if (error) throw error;

      toast.success(`Affiliate ${status === "active" ? "approved" : "rejected"}`);
      loadData();
      setSelectedProfile(null);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const updateProfile = async () => {
    if (!selectedProfile) return;

    try {
      const updateData: any = {
        status: newStatus,
        application_notes: notes,
      };

      // If custom promo code is provided, validate and update it
      if (customPromoCode && customPromoCode !== selectedProfile.promo_code) {
        const cleanCode = customPromoCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Check if code is unique
        const { data: existing } = await supabase
          .from("affiliate_profiles")
          .select("id")
          .eq("promo_code", cleanCode)
          .neq("id", selectedProfile.id)
          .single();

        if (existing) {
          toast.error("This promo code is already in use");
          return;
        }

        updateData.promo_code = cleanCode;
      }

      const { error } = await supabase
        .from("affiliate_profiles")
        .update(updateData)
        .eq("id", selectedProfile.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      loadData();
      setSelectedProfile(null);
      setCustomPromoCode("");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const processPayout = async (payoutId: string, status: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: any = {
        status,
        processed_at: new Date().toISOString(),
        processed_by: user?.id,
        notes: payoutNotes || null,
      };

      const { error } = await supabase
        .from("affiliate_payouts")
        .update(updates)
        .eq("id", payoutId);

      if (error) throw error;

      // If completed, update affiliate earnings
      if (status === "completed") {
        const payout = payouts.find(p => p.id === payoutId);
        if (payout) {
          const { error: earningsError } = await supabase
            .from("affiliate_profiles")
            .update({
              pending_earnings: 0,
              paid_earnings: (payout.affiliate_profiles.paid_earnings || 0) + payout.amount,
            })
            .eq("id", payout.affiliate_id);

          if (earningsError) throw earningsError;
        }
      }

      toast.success(`Payout ${status}`);
      setSelectedPayout(null);
      setPayoutNotes("");
      loadData();
    } catch (error) {
      console.error("Error processing payout:", error);
      toast.error("Failed to process payout");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const pendingPayouts = payouts.filter(p => p.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayouts}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="affiliates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="payouts">Payout Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="affiliates">
          <Card>
            <CardHeader>
              <CardTitle>Affiliate Applications</CardTitle>
              <CardDescription>Manage and approve affiliate applications</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name/Email</TableHead>
                    <TableHead>Promo Code</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{profile.profiles?.full_name || "N/A"}</span>
                          <span className="text-xs text-muted-foreground">{profile.profiles?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{profile.promo_code}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{profile.tier}</Badge>
                      </TableCell>
                      <TableCell>{profile.total_referrals}</TableCell>
                      <TableCell>${profile.total_earnings.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          profile.status === "active" ? "default" : 
                          profile.status === "pending" ? "secondary" : 
                          "destructive"
                        }>
                          {profile.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(profile.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedProfile(profile);
                              setNotes(profile.application_notes || "");
                              setNewStatus(profile.status);
                              setCustomPromoCode("");
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {profile.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600"
                                onClick={() => updateStatus(profile.id, "active")}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600"
                                onClick={() => updateStatus(profile.id, "rejected")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Payout Requests</CardTitle>
              <CardDescription>Review and process affiliate payout requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Promo Code</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No payout requests yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {payout.affiliate_profiles?.profiles?.full_name || "N/A"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {payout.affiliate_profiles?.profiles?.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {payout.affiliate_profiles?.promo_code}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">${payout.amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {payout.payment_method || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(payout.requested_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payout.status === "completed"
                                ? "default"
                                : payout.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {payout.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPayout(payout);
                              setPayoutNotes(payout.notes || "");
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Affiliate Profile Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Affiliate Details</DialogTitle>
            <DialogDescription>
              Review and manage affiliate profile
            </DialogDescription>
          </DialogHeader>
          {selectedProfile && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Email</Label>
                  <p className="text-sm">{selectedProfile.profiles?.email}</p>
                </div>
                <div>
                  <Label>Current Promo Code</Label>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{selectedProfile.promo_code}</p>
                </div>
                <div>
                  <Label>Tier</Label>
                  <p className="text-sm">{selectedProfile.tier}</p>
                </div>
                <div>
                  <Label>Commission Rate</Label>
                  <p className="text-sm">{selectedProfile.commission_rate}%</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customPromo">Custom Promo Code (for influencers)</Label>
                <Input
                  id="customPromo"
                  value={customPromoCode}
                  onChange={(e) => setCustomPromoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="e.g., TRADER10, FOREXKING"
                  className="font-mono"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to keep current code. Only letters and numbers allowed.
                </p>
              </div>

              {selectedProfile.social_links && (
                <div>
                  <Label>Social Links</Label>
                  <div className="grid gap-2 md:grid-cols-2 text-sm mt-2">
                    {Object.entries(selectedProfile.social_links).map(([platform, link]) => (
                      link && (
                        <div key={platform}>
                          <span className="font-medium capitalize">{platform}:</span> {link as string}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {selectedProfile.payment_info && (
                <div>
                  <Label>Payment Information</Label>
                  <div className="space-y-2 text-sm mt-2 bg-muted p-3 rounded">
                    <div>
                      <span className="font-medium">Method:</span>{" "}
                      <Badge variant="outline" className="capitalize">
                        {selectedProfile.payment_info.method}
                      </Badge>
                    </div>
                    {selectedProfile.payment_info.method === "paypal" && (
                      <div>
                        <span className="font-medium">PayPal Email:</span>{" "}
                        {selectedProfile.payment_info.paypalEmail}
                      </div>
                    )}
                    {selectedProfile.payment_info.method === "bank" && (
                      <div className="space-y-1">
                        <div>
                          <span className="font-medium">Bank Name:</span>{" "}
                          {selectedProfile.payment_info.bankName}
                        </div>
                        <div>
                          <span className="font-medium">Account Holder:</span>{" "}
                          {selectedProfile.payment_info.accountHolderName}
                        </div>
                        <div>
                          <span className="font-medium">Account Number:</span>{" "}
                          {selectedProfile.payment_info.accountNumber}
                        </div>
                      </div>
                    )}
                    {selectedProfile.payment_info.method === "crypto" && (
                      <div className="space-y-1">
                        <div>
                          <span className="font-medium">Type:</span>{" "}
                          {selectedProfile.payment_info.cryptoType}
                        </div>
                        <div>
                          <span className="font-medium">Wallet Address:</span>
                          <p className="font-mono text-xs break-all mt-1 bg-background p-2 rounded">
                            {selectedProfile.payment_info.walletAddress}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Application Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <Button onClick={updateProfile} className="w-full">
                Update Profile
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payout Request Dialog */}
      <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payout Request Details</DialogTitle>
            <DialogDescription>Review and process this payout request</DialogDescription>
          </DialogHeader>
          {selectedPayout && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Affiliate</Label>
                  <p className="text-sm font-medium">
                    {selectedPayout.affiliate_profiles?.profiles?.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPayout.affiliate_profiles?.profiles?.email}
                  </p>
                </div>
                <div>
                  <Label>Promo Code</Label>
                  <code className="text-sm bg-muted px-2 py-1 rounded block w-fit">
                    {selectedPayout.affiliate_profiles?.promo_code}
                  </code>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="text-2xl font-bold">${selectedPayout.amount}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge
                    variant={
                      selectedPayout.status === "completed"
                        ? "default"
                        : selectedPayout.status === "pending"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {selectedPayout.status}
                  </Badge>
                </div>
                <div>
                  <Label>Requested Date</Label>
                  <p className="text-sm">
                    {format(new Date(selectedPayout.requested_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                {selectedPayout.processed_at && (
                  <div>
                    <Label>Processed Date</Label>
                    <p className="text-sm">
                      {format(new Date(selectedPayout.processed_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}
              </div>

              {selectedPayout.payment_details && (
                <div>
                  <Label>Payment Details</Label>
                  <div className="space-y-2 text-sm mt-2 bg-muted p-3 rounded">
                    <div>
                      <span className="font-medium">Method:</span>{" "}
                      <Badge variant="outline" className="capitalize">
                        {selectedPayout.payment_details.method}
                      </Badge>
                    </div>
                    {selectedPayout.payment_details.method === "paypal" && (
                      <div>
                        <span className="font-medium">PayPal Email:</span>{" "}
                        {selectedPayout.payment_details.paypalEmail}
                      </div>
                    )}
                    {selectedPayout.payment_details.method === "bank" && (
                      <div className="space-y-1">
                        <div>
                          <span className="font-medium">Bank Name:</span>{" "}
                          {selectedPayout.payment_details.bankName}
                        </div>
                        <div>
                          <span className="font-medium">Account Holder:</span>{" "}
                          {selectedPayout.payment_details.accountHolderName}
                        </div>
                        <div>
                          <span className="font-medium">Account Number:</span>{" "}
                          {selectedPayout.payment_details.accountNumber}
                        </div>
                      </div>
                    )}
                    {selectedPayout.payment_details.method === "crypto" && (
                      <div>
                        <div>
                          <span className="font-medium">Type:</span>{" "}
                          {selectedPayout.payment_details.cryptoType}
                        </div>
                        <div>
                          <span className="font-medium">Wallet Address:</span>
                          <p className="font-mono text-xs break-all mt-1 bg-background p-2 rounded">
                            {selectedPayout.payment_details.walletAddress}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes about this payout..."
                />
              </div>

              {selectedPayout.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => processPayout(selectedPayout.id, "completed")}
                    className="flex-1"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Mark as Completed
                  </Button>
                  <Button
                    onClick={() => processPayout(selectedPayout.id, "rejected")}
                    variant="destructive"
                    className="flex-1"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
