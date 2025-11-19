import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, PlayCircle, PauseCircle, Trash2, TrendingUp, Zap } from "lucide-react";

export const CampaignManager = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    trigger_type: "inactivity",
    trigger_conditions: { days: 7 },
    notification_title: "",
    notification_body: "",
    user_segment: "all",
  });

  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["notification-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (campaign: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("notification_campaigns")
        .insert({
          ...campaign,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-campaigns"] });
      toast.success("Campaign created successfully");
      setIsCreateOpen(false);
      setNewCampaign({
        name: "",
        description: "",
        trigger_type: "inactivity",
        trigger_conditions: { days: 7 },
        notification_title: "",
        notification_body: "",
        user_segment: "all",
      });
    },
    onError: (error) => {
      toast.error("Failed to create campaign");
      console.error(error);
    },
  });

  const toggleCampaignMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("notification_campaigns")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-campaigns"] });
      toast.success("Campaign updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update campaign");
      console.error("Campaign toggle error:", error);
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notification_campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete campaign");
      console.error("Campaign delete error:", error);
    },
  });

  const runCampaignsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("process-campaigns");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notification-campaigns"] });
      toast.success(`Processed ${data.campaigns_processed} campaigns, sent ${data.total_notifications_sent} notifications`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to run campaigns");
      console.error("Run campaigns error:", error);
    },
  });

  const handleCreateCampaign = () => {
    createCampaignMutation.mutate(newCampaign);
  };

  const getTriggerDescription = (type: string, conditions: any) => {
    switch (type) {
      case "inactivity":
        return `After ${conditions.days || 7} days of inactivity`;
      case "milestone":
        return `On ${conditions.milestone_type || "achievement"}`;
      case "trade_count":
        return `${conditions.min_trades || 0}+ trades`;
      case "win_streak":
        return `${conditions.min_streak || 3}+ win streak`;
      case "loss_streak":
        return `${conditions.min_losses || 3}+ consecutive losses`;
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Automated Campaigns</h3>
          <p className="text-sm text-muted-foreground">Create rule-based notification campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => runCampaignsMutation.mutate()}
            disabled={runCampaignsMutation.isPending}
          >
            <Zap className="mr-2 h-4 w-4" />
            {runCampaignsMutation.isPending ? "Running..." : "Run Now"}
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Automated Campaign</DialogTitle>
              <DialogDescription>Set up a rule-based notification campaign</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="7-Day Inactivity Reminder"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  placeholder="Send reminder to users who haven't traded in 7 days"
                />
              </div>

              <div>
                <Label htmlFor="trigger_type">Trigger Type</Label>
                <Select
                  value={newCampaign.trigger_type}
                  onValueChange={(value) => {
                    const defaultConditions: any = {
                      inactivity: { days: 7 },
                      milestone: { milestone_type: "first_trade" },
                      trade_count: { min_trades: 10 },
                      win_streak: { min_streak: 3 },
                      loss_streak: { min_losses: 3 },
                    };
                    setNewCampaign({
                      ...newCampaign,
                      trigger_type: value,
                      trigger_conditions: defaultConditions[value] || {},
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inactivity">Inactivity</SelectItem>
                    <SelectItem value="milestone">Milestone Achievement</SelectItem>
                    <SelectItem value="trade_count">Trade Count</SelectItem>
                    <SelectItem value="win_streak">Win Streak</SelectItem>
                    <SelectItem value="loss_streak">Loss Streak</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newCampaign.trigger_type === "inactivity" && (
                <div>
                  <Label>Days of Inactivity</Label>
                  <Input
                    type="number"
                    value={newCampaign.trigger_conditions.days || 7}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        trigger_conditions: { days: parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
              )}

              <div>
                <Label htmlFor="user_segment">Target Segment</Label>
                <Select
                  value={newCampaign.user_segment}
                  onValueChange={(value) => setNewCampaign({ ...newCampaign, user_segment: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="free">Free Users</SelectItem>
                    <SelectItem value="monthly">Monthly Subscribers</SelectItem>
                    <SelectItem value="lifetime">Lifetime Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notification_title">Notification Title</Label>
                <Input
                  id="notification_title"
                  value={newCampaign.notification_title}
                  onChange={(e) => setNewCampaign({ ...newCampaign, notification_title: e.target.value })}
                  placeholder="We miss you! 📈"
                />
              </div>

              <div>
                <Label htmlFor="notification_body">Notification Body</Label>
                <Textarea
                  id="notification_body"
                  value={newCampaign.notification_body}
                  onChange={(e) => setNewCampaign({ ...newCampaign, notification_body: e.target.value })}
                  placeholder="It's been a while since your last trade. Come back and continue your trading journey!"
                />
              </div>

              <Button onClick={handleCreateCampaign} className="w-full">
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {campaigns?.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{campaign.name}</CardTitle>
                    <Badge variant={campaign.is_active ? "default" : "secondary"}>
                      {campaign.is_active ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <CardDescription>{campaign.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      toggleCampaignMutation.mutate({
                        id: campaign.id,
                        is_active: !campaign.is_active,
                      })
                    }
                  >
                    {campaign.is_active ? (
                      <PauseCircle className="h-4 w-4" />
                    ) : (
                      <PlayCircle className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Trigger:</span>{" "}
                    <span className="font-medium">
                      {getTriggerDescription(campaign.trigger_type, campaign.trigger_conditions)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Segment:</span>{" "}
                    <span className="font-medium capitalize">{campaign.user_segment}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>{campaign.total_triggered} runs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Sent:</span>
                    <span className="font-medium">{campaign.total_sent}</span>
                  </div>
                  {campaign.last_run_at && (
                    <div className="text-muted-foreground">
                      Last: {new Date(campaign.last_run_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
