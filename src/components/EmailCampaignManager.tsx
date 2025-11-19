import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Send, Calendar, BarChart3 } from "lucide-react";

export const EmailCampaignManager = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_id: "",
    user_segment: {
      subscription_tier: "all",
      has_trades: undefined as boolean | undefined,
      min_streak: undefined as number | undefined,
    },
  });

  // Fetch campaigns
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["email-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*, email_templates(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Create campaign
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Calculate recipients count based on user segment
      let query = supabase.from("profiles").select("id", { count: "exact", head: true });
      
      const segment = data.user_segment;
      if (segment.subscription_tier && segment.subscription_tier !== "all") {
        query = query.eq("subscription_tier", segment.subscription_tier);
      }
      if (segment.has_trades !== undefined) {
        if (segment.has_trades) {
          query = query.gt("trades_count", 0);
        } else {
          query = query.eq("trades_count", 0);
        }
      }
      if (segment.min_streak) {
        query = query.gte("current_streak", segment.min_streak);
      }

      const { count } = await query;

      const { error } = await supabase.from("email_campaigns").insert({
        ...data,
        created_by: currentUser?.id,
        total_recipients: count || 0,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast.success("Campaign created successfully");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    },
  });

  // Send campaign
  const sendMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase.functions.invoke("send-email-campaign", {
        body: { campaignId },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast.success("Campaign sent successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to send campaign: ${error.message}`);
    },
  });

  // Delete campaign
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast.success("Campaign deleted successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete campaign: ${error.message}`);
    },
  });

  // Update campaign
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      // Recalculate recipients if user_segment changed
      if (data.user_segment) {
        let query = supabase.from("profiles").select("id", { count: "exact", head: true });
        
        const segment = data.user_segment;
        if (segment.subscription_tier && segment.subscription_tier !== "all") {
          query = query.eq("subscription_tier", segment.subscription_tier);
        }
        if (segment.has_trades !== undefined) {
          if (segment.has_trades) {
            query = query.gt("trades_count", 0);
          } else {
            query = query.eq("trades_count", 0);
          }
        }
        if (segment.min_streak) {
          query = query.gte("current_streak", segment.min_streak);
        }

        const { count } = await query;
        data.total_recipients = count || 0;
      }

      const { error } = await supabase
        .from("email_campaigns")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast.success("Campaign updated successfully");
      setIsCreateOpen(false);
      setEditingCampaign(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Failed to update campaign: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      template_id: "",
      user_segment: {
        subscription_tier: "all",
        has_trades: undefined,
        min_streak: undefined,
      },
    });
    setEditingCampaign(null);
  };

  const handleEdit = (campaign: any) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || "",
      template_id: campaign.template_id || "",
      user_segment: campaign.user_segment || {
        subscription_tier: "all",
        has_trades: undefined,
        min_streak: undefined,
      },
    });
    setIsCreateOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "secondary";
      case "sending": return "default";
      case "sent": return "success";
      case "scheduled": return "outline";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sending": return "⏳";
      case "sent": return "✓";
      case "scheduled": return "📅";
      default: return "📝";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Email Campaigns</h2>
          <p className="text-muted-foreground">Create and manage email campaigns</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingCampaign ? "Edit" : "Create"} Email Campaign</DialogTitle>
              <DialogDescription>
                {editingCampaign ? "Update your email campaign settings" : "Create a new email campaign with user segmentation"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 overflow-y-auto pr-2">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Weekly Performance Summary"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Send weekly performance summaries to all active traders"
                  rows={3}
                />
              </div>
              <div>
                <Label>Email Template</Label>
                {templates && templates.length > 0 ? (
                  <Select
                    value={formData.template_id}
                    onValueChange={(value) => setFormData({ ...formData, template_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/50">
                    No email templates available. Please create a template first in the Templates tab.
                  </div>
                )}
              </div>
              
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold">User Segmentation</h4>
                
                <div>
                  <Label>Subscription Tier</Label>
                  <Select
                    value={formData.user_segment.subscription_tier}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        user_segment: { ...formData.user_segment, subscription_tier: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="free">Free users</SelectItem>
                      <SelectItem value="monthly">Monthly subscribers</SelectItem>
                      <SelectItem value="lifetime">Lifetime subscribers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_trades"
                    checked={formData.user_segment.has_trades === true}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        user_segment: {
                          ...formData.user_segment,
                          has_trades: checked ? true : undefined,
                        },
                      })
                    }
                  />
                  <Label htmlFor="has_trades">Only users with trades</Label>
                </div>

                <div>
                  <Label>Minimum Streak</Label>
                  <Input
                    type="number"
                    value={formData.user_segment.min_streak || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        user_segment: {
                          ...formData.user_segment,
                          min_streak: e.target.value ? parseInt(e.target.value) : undefined,
                        },
                      })
                    }
                    placeholder="Leave empty for no minimum"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateOpen(false);
                resetForm();
              }}>Cancel</Button>
              <Button
                onClick={() => {
                  if (editingCampaign) {
                    updateMutation.mutate({ id: editingCampaign.id, data: formData });
                  } else {
                    createMutation.mutate(formData);
                  }
                }}
                disabled={!formData.name || !formData.template_id || createMutation.isPending || updateMutation.isPending}
              >
                {editingCampaign ? "Update" : "Create"} Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading campaigns...</div>
      ) : (
        <div className="grid gap-6">
          {campaigns?.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span>{getStatusIcon(campaign.status)}</span>
                      {campaign.name}
                    </CardTitle>
                    <CardDescription>{campaign.description}</CardDescription>
                  </div>
                  <Badge variant={getStatusColor(campaign.status) as any}>
                    {campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Recipients</p>
                    <p className="text-2xl font-bold">{campaign.total_recipients || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Sent</p>
                    <p className="text-2xl font-bold">{campaign.sent_count || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Opened</p>
                    <p className="text-2xl font-bold">{campaign.opened_count || 0}</p>
                    {campaign.sent_count > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {((campaign.opened_count / campaign.sent_count) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Clicked</p>
                    <p className="text-2xl font-bold">{campaign.clicked_count || 0}</p>
                    {campaign.sent_count > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {((campaign.clicked_count / campaign.sent_count) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold text-destructive">{campaign.failed_count || 0}</p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Template: {campaign.email_templates?.name}</p>
                  <p>Created: {new Date(campaign.created_at).toLocaleString()}</p>
                  {campaign.sent_at && (
                    <p>Sent: {new Date(campaign.sent_at).toLocaleString()}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between gap-2">
                <div className="flex gap-2">
                  {campaign.status === "draft" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(campaign)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this campaign?")) {
                            deleteMutation.mutate(campaign.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {campaign.status === "draft" && (
                    <Button
                      onClick={() => {
                        if (confirm(`Send this campaign to ${campaign.total_recipients} recipients now?`)) {
                          sendMutation.mutate(campaign.id);
                        }
                      }}
                      disabled={sendMutation.isPending || campaign.total_recipients === 0}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Now
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};