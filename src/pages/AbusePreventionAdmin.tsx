import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Check, X, Plus, Trash2, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface FlaggedSignup {
  id: string;
  email: string;
  signup_ip_address: string | null;
  signup_fingerprint: string | null;
  flagged_reason: string;
  flagged_at: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface Override {
  id: string;
  override_type: 'ip_address' | 'fingerprint' | 'email';
  override_value: string;
  reason: string;
  created_by: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AbusePreventionAdmin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [flaggedSignups, setFlaggedSignups] = useState<FlaggedSignup[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSignup, setSelectedSignup] = useState<FlaggedSignup | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  
  // Override form state
  const [overrideType, setOverrideType] = useState<'ip_address' | 'fingerprint' | 'email'>('email');
  const [overrideValue, setOverrideValue] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideExpiry, setOverrideExpiry] = useState("");

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

      const { data: roleData, error: roleError } = await supabase
        .rpc('has_role', { _user_id: session.user.id, _role: 'admin' });

      if (roleError) throw roleError;

      if (!roleData) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await fetchData();
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast.error("Failed to verify admin access");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [flaggedRes, overridesRes] = await Promise.all([
        supabase
          .from('flagged_signups')
          .select('*')
          .order('flagged_at', { ascending: false }),
        supabase
          .from('abuse_prevention_overrides')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (flaggedRes.error) throw flaggedRes.error;
      if (overridesRes.error) throw overridesRes.error;

      setFlaggedSignups(flaggedRes.data as FlaggedSignup[] || []);
      setOverrides(overridesRes.data as Override[] || []);
    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
    }
  };

  const handleReview = async (signupId: string, status: 'approved' | 'rejected') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('flagged_signups')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: reviewNotes
        })
        .eq('id', signupId);

      if (error) throw error;

      toast.success(`Signup ${status}`);
      setIsReviewDialogOpen(false);
      setReviewNotes("");
      setSelectedSignup(null);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to review signup: " + error.message);
    }
  };

  const handleCreateOverride = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('abuse_prevention_overrides')
        .insert({
          override_type: overrideType,
          override_value: overrideValue,
          reason: overrideReason,
          created_by: user.id,
          expires_at: overrideExpiry || null,
          is_active: true
        });

      if (error) throw error;

      toast.success("Override created successfully");
      setIsOverrideDialogOpen(false);
      setOverrideType('email');
      setOverrideValue("");
      setOverrideReason("");
      setOverrideExpiry("");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to create override: " + error.message);
    }
  };

  const handleToggleOverride = async (overrideId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('abuse_prevention_overrides')
        .update({ is_active: !currentStatus })
        .eq('id', overrideId);

      if (error) throw error;

      toast.success(`Override ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update override: " + error.message);
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    if (!confirm("Are you sure you want to delete this override?")) return;

    try {
      const { error } = await supabase
        .from('abuse_prevention_overrides')
        .delete()
        .eq('id', overrideId);

      if (error) throw error;

      toast.success("Override deleted");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to delete override: " + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Abuse Prevention Admin</h1>
          <p className="text-muted-foreground">Manage flagged signups and IP/device overrides</p>
        </div>
      </div>

      <Tabs defaultValue="flagged" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flagged">Flagged Signups</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="flagged" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flagged Signup Attempts</CardTitle>
              <CardDescription>
                Review and manage suspicious signup attempts blocked by the abuse prevention system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {flaggedSignups.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No flagged signups</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Flagged At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flaggedSignups.map((signup) => (
                      <TableRow key={signup.id}>
                        <TableCell className="font-medium">{signup.email}</TableCell>
                        <TableCell>{signup.flagged_reason}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {signup.signup_ip_address || 'N/A'}
                        </TableCell>
                        <TableCell>{getStatusBadge(signup.status)}</TableCell>
                        <TableCell>{format(new Date(signup.flagged_at), 'MMM d, yyyy HH:mm')}</TableCell>
                        <TableCell>
                          {signup.status === 'pending' && (
                            <Dialog open={isReviewDialogOpen && selectedSignup?.id === signup.id} onOpenChange={setIsReviewDialogOpen}>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setSelectedSignup(signup)}
                                >
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Review Flagged Signup</DialogTitle>
                                  <DialogDescription>
                                    Decide whether to approve or reject this signup attempt
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Email</Label>
                                    <p className="text-sm font-medium">{signup.email}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Reason</Label>
                                    <p className="text-sm">{signup.flagged_reason}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>IP Address</Label>
                                    <p className="text-sm font-mono">{signup.signup_ip_address || 'N/A'}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Device Fingerprint</Label>
                                    <p className="text-sm font-mono text-xs break-all">
                                      {signup.signup_fingerprint?.substring(0, 50) || 'N/A'}...
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="notes">Admin Notes</Label>
                                    <Textarea
                                      id="notes"
                                      value={reviewNotes}
                                      onChange={(e) => setReviewNotes(e.target.value)}
                                      placeholder="Add notes about your decision..."
                                      rows={3}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleReview(signup.id, 'approved')}
                                      className="flex-1"
                                    >
                                      <Check className="h-4 w-4 mr-2" />
                                      Approve
                                    </Button>
                                    <Button
                                      onClick={() => handleReview(signup.id, 'rejected')}
                                      variant="destructive"
                                      className="flex-1"
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overrides" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Abuse Prevention Overrides</CardTitle>
                  <CardDescription>
                    Create overrides to allow specific IPs, devices, or emails to bypass abuse prevention
                  </CardDescription>
                </div>
                <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Override
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Override</DialogTitle>
                      <DialogDescription>
                        Allow a specific IP, device, or email to bypass abuse prevention checks
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="override-type">Override Type</Label>
                        <Select value={overrideType} onValueChange={(value: any) => setOverrideType(value)}>
                          <SelectTrigger id="override-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="ip_address">IP Address</SelectItem>
                            <SelectItem value="fingerprint">Device Fingerprint</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="override-value">Value</Label>
                        <Input
                          id="override-value"
                          value={overrideValue}
                          onChange={(e) => setOverrideValue(e.target.value)}
                          placeholder={
                            overrideType === 'email' ? 'user@example.com' :
                            overrideType === 'ip_address' ? '192.168.1.1' :
                            'device-fingerprint-hash'
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="override-reason">Reason</Label>
                        <Textarea
                          id="override-reason"
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="Why is this override needed?"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="override-expiry">Expiry Date (Optional)</Label>
                        <Input
                          id="override-expiry"
                          type="datetime-local"
                          value={overrideExpiry}
                          onChange={(e) => setOverrideExpiry(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleCreateOverride} className="w-full">
                        Create Override
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {overrides.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No overrides configured</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overrides.map((override) => (
                      <TableRow key={override.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {override.override_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm max-w-xs truncate">
                          {override.override_value}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{override.reason}</TableCell>
                        <TableCell>
                          <Badge variant={override.is_active ? "default" : "secondary"}>
                            {override.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {override.expires_at 
                            ? format(new Date(override.expires_at), 'MMM d, yyyy')
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleOverride(override.id, override.is_active)}
                            >
                              {override.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteOverride(override.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
}
