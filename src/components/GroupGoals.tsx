import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Target, Calendar, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GroupGoalsProps {
  groupId: string;
}

export default function GroupGoals({ groupId }: GroupGoalsProps) {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [newGoalTargetDate, setNewGoalTargetDate] = useState("");

  useEffect(() => {
    loadGoals();
    getCurrentUser();
  }, [groupId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadGoals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_goals')
        .select(`
          *,
          creator:profiles!group_goals_created_by_fkey (
            id,
            full_name
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error: any) {
      console.error('Error loading goals:', error);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) {
      toast.error("Please enter a goal title");
      return;
    }

    try {
      const { error } = await supabase
        .from('group_goals')
        .insert({
          group_id: groupId,
          created_by: currentUserId,
          title: newGoalTitle.trim(),
          description: newGoalDescription.trim() || null,
          target_date: newGoalTargetDate || null,
          status: 'active'
        });

      if (error) throw error;

      toast.success("Goal created!");
      setShowCreateDialog(false);
      setNewGoalTitle("");
      setNewGoalDescription("");
      setNewGoalTargetDate("");
      loadGoals();
    } catch (error: any) {
      console.error('Error creating goal:', error);
      toast.error("Failed to create goal");
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('group_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast.success("Goal deleted");
      loadGoals();
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      toast.error("Failed to delete goal");
    }
  };

  const handleUpdateStatus = async (goalId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('group_goals')
        .update({ status: newStatus })
        .eq('id', goalId);

      if (error) throw error;

      toast.success("Goal status updated");
      loadGoals();
    } catch (error: any) {
      console.error('Error updating goal:', error);
      toast.error("Failed to update goal");
    }
  };

  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal);
    setNewGoalTitle(goal.title);
    setNewGoalDescription(goal.description || "");
    setNewGoalTargetDate(goal.target_date || "");
    setShowEditDialog(true);
  };

  const handleUpdateGoal = async () => {
    if (!newGoalTitle.trim() || !editingGoal) return;

    try {
      const { error } = await supabase
        .from('group_goals')
        .update({
          title: newGoalTitle.trim(),
          description: newGoalDescription.trim() || null,
          target_date: newGoalTargetDate || null,
        })
        .eq('id', editingGoal.id);

      if (error) throw error;

      toast.success("Goal updated!");
      setShowEditDialog(false);
      setEditingGoal(null);
      setNewGoalTitle("");
      setNewGoalDescription("");
      setNewGoalTargetDate("");
      loadGoals();
    } catch (error: any) {
      console.error('Error updating goal:', error);
      toast.error("Failed to update goal");
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Group Goals
            </CardTitle>
            <CardDescription>
              Collective goals for all group members
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Group Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="Enter goal title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newGoalDescription}
                    onChange={(e) => setNewGoalDescription(e.target.value)}
                    placeholder="Describe the goal (optional)"
                    className="min-h-[80px]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Target Date (Optional)</label>
                  <Input
                    type="date"
                    value={newGoalTargetDate}
                    onChange={(e) => setNewGoalTargetDate(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateGoal} className="flex-1">
                    Create Goal
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Loading goals...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No group goals yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create a goal to get everyone working together!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <Card key={goal.id} className="border-border/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-base">{goal.title}</CardTitle>
                        <Badge variant={goal.status === 'active' ? 'default' : 'secondary'}>
                          {goal.status}
                        </Badge>
                      </div>
                      {goal.description && (
                        <CardDescription className="mb-2">{goal.description}</CardDescription>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>By {goal.creator?.full_name || "Unknown"}</span>
                        {goal.target_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(goal.target_date), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    {goal.created_by === currentUserId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditGoal(goal)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Goal
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStatus(
                                goal.id,
                                goal.status === 'active' ? 'completed' : 'active'
                              )
                            }
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Mark as {goal.status === 'active' ? 'Completed' : 'Active'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Goal Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Title</Label>
              <Input
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="Enter goal title"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={newGoalDescription}
                onChange={(e) => setNewGoalDescription(e.target.value)}
                placeholder="Describe the goal (optional)"
                className="min-h-[80px]"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Target Date (Optional)</Label>
              <Input
                type="date"
                value={newGoalTargetDate}
                onChange={(e) => setNewGoalTargetDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateGoal} className="flex-1">
                Update Goal
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
