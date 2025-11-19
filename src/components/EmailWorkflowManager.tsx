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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Zap, Clock } from "lucide-react";

export const EmailWorkflowManager = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_type: "user_signup",
    template_id: "",
    delay_minutes: 0,
    is_active: true,
  });

  // Fetch workflows
  const { data: workflows, isLoading } = useQuery({
    queryKey: ["email-workflows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_workflows")
        .select("*, email_templates(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch templates for selection
  const { data: templates } = useQuery({
    queryKey: ["email-templates-list"],
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

  // Create workflow
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("email_workflows").insert({
        ...data,
        created_by: currentUser?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-workflows"] });
      toast.success("Workflow created successfully");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Failed to create workflow: ${error.message}`);
    },
  });

  // Update workflow
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from("email_workflows")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-workflows"] });
      toast.success("Workflow updated successfully");
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Failed to update workflow: ${error.message}`);
    },
  });

  // Delete workflow
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_workflows")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-workflows"] });
      toast.success("Workflow deleted successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete workflow: ${error.message}`);
    },
  });

  // Toggle workflow active status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("email_workflows")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-workflows"] });
      toast.success("Workflow status updated");
    },
    onError: (error: any) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      trigger_type: "user_signup",
      template_id: "",
      delay_minutes: 0,
      is_active: true,
    });
    setSelectedWorkflow(null);
  };

  const handleEdit = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description || "",
      trigger_type: workflow.trigger_type,
      template_id: workflow.template_id || "",
      delay_minutes: workflow.delay_minutes || 0,
      is_active: workflow.is_active,
    });
    setIsEditOpen(true);
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      user_signup: "User Signup",
      milestone_achieved: "Milestone Achieved",
      streak_milestone: "Streak Milestone",
      trade_milestone: "Trade Milestone",
    };
    return labels[trigger] || trigger;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Automated Email Workflows</h2>
          <p className="text-muted-foreground">Set up automated emails for user events and milestones</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Email Workflow</DialogTitle>
              <DialogDescription>
                Configure an automated email to be sent when specific events occur
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label>Workflow Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Welcome Email"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Sent to new users when they sign up"
                  rows={2}
                />
              </div>
              <div>
                <Label>Trigger Event</Label>
                <Select value={formData.trigger_type} onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user_signup">User Signup</SelectItem>
                    <SelectItem value="milestone_achieved">Milestone Achieved</SelectItem>
                    <SelectItem value="streak_milestone">Streak Milestone</SelectItem>
                    <SelectItem value="trade_milestone">Trade Milestone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Email Template</Label>
                <Select value={formData.template_id} onValueChange={(value) => setFormData({ ...formData, template_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Delay (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.delay_minutes}
                  onChange={(e) => setFormData({ ...formData, delay_minutes: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Wait time before sending the email (0 = immediate)
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.name || !formData.template_id}>
                Create Workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading workflows...</div>
      ) : (
        <div className="grid gap-4">
          {workflows?.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                      <Badge variant={workflow.is_active ? "default" : "secondary"}>
                        {workflow.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription>{workflow.description}</CardDescription>
                  </div>
                  <Switch
                    checked={workflow.is_active}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: workflow.id, is_active: checked })}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Trigger:</span>
                    <span>{getTriggerLabel(workflow.trigger_type)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Delay:</span>
                    <span>{workflow.delay_minutes || 0} min</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Template:</span>{" "}
                    <span className="text-muted-foreground">{workflow.email_templates?.name || "None"}</span>
                  </div>
                  <div>
                    <span className="font-medium">Sent:</span>{" "}
                    <span className="text-muted-foreground">{workflow.sent_count || 0} times</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(workflow)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this workflow?")) {
                      deleteMutation.mutate(workflow.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Email Workflow</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Workflow Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Trigger Event</Label>
              <Select value={formData.trigger_type} onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_signup">User Signup</SelectItem>
                  <SelectItem value="milestone_achieved">Milestone Achieved</SelectItem>
                  <SelectItem value="streak_milestone">Streak Milestone</SelectItem>
                  <SelectItem value="trade_milestone">Trade Milestone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email Template</Label>
              <Select value={formData.template_id} onValueChange={(value) => setFormData({ ...formData, template_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delay (minutes)</Label>
              <Input
                type="number"
                min="0"
                value={formData.delay_minutes}
                onChange={(e) => setFormData({ ...formData, delay_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate({ ...formData, id: selectedWorkflow?.id })}>
              Update Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
