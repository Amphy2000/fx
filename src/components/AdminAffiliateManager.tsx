import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, Eye, DollarSign, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function AdminAffiliateManager() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [customPromoCode, setCustomPromoCode] = useState("");
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, totalEarnings: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: profilesData } = await supabase
        .from("affiliate_profiles")
        .select(`
          *,
          profiles!affiliate_profiles_user_id_fkey(email, full_name)
        `)
        .order("created_at", { ascending: false });

      setProfiles(profilesData || []);

      // Calculate stats
      const total = profilesData?.length || 0;
      const active = profilesData?.filter(p => p.status === 'active').length || 0;
      const pending = profilesData?.filter(p => p.status === 'pending').length || 0;
      const totalEarnings = profilesData?.reduce((sum, p) => sum + (p.total_earnings || 0), 0) || 0;

      setStats({ total, active, pending, totalEarnings });
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-4">
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
      </div>

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
    </div>
  );
}
