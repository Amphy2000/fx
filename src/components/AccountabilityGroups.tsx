import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Plus, Crown, UserMinus } from "lucide-react";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  description: string;
  created_by: string;
  max_members: number;
  is_public: boolean;
  group_image_url: string | null;
  created_at: string;
  member_count?: number;
  user_role?: string;
}

export default function AccountabilityGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    max_members: 5,
    is_public: true,
  });

  useEffect(() => {
    loadGroups();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get groups user is a member of
      const { data: memberships } = await supabase
        .from('group_memberships')
        .select('group_id, role, accountability_groups(*)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      // Get public groups
      const { data: publicGroups } = await supabase
        .from('accountability_groups')
        .select('*')
        .eq('is_public', true);

      // Combine and deduplicate
      const memberGroups = memberships?.map(m => ({
        ...(m.accountability_groups as any),
        user_role: m.role,
      })) || [];

      const allGroups = [...memberGroups];
      
      // Add public groups not already in member groups
      publicGroups?.forEach(pg => {
        if (!allGroups.find(g => g.id === pg.id)) {
          allGroups.push(pg);
        }
      });

      // Get member counts
      for (const group of allGroups) {
        const { count } = await supabase
          .from('group_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id)
          .eq('status', 'active');
        
        group.member_count = count || 0;
      }

      setGroups(allGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create group
      const { data: group, error } = await supabase
        .from('accountability_groups')
        .insert({
          ...newGroup,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin member
      await supabase
        .from('group_memberships')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin',
          status: 'active',
        });

      toast.success("Group created successfully!");
      setIsCreateOpen(false);
      setNewGroup({ name: "", description: "", max_members: 5, is_public: true });
      loadGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error("Failed to create group");
    }
  };

  const joinGroup = async (groupId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('group_memberships')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member',
          status: 'active',
        });

      if (error) throw error;

      toast.success("Joined group successfully!");
      loadGroups();
    } catch (error: any) {
      console.error('Error joining group:', error);
      toast.error(error.message || "Failed to join group");
    }
  };

  const leaveGroup = async (groupId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('group_memberships')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Left group successfully");
      loadGroups();
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error("Failed to leave group");
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading groups...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Accountability Groups</h2>
          <p className="text-muted-foreground">Join or create groups for multi-trader accountability</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>
                Create a group to connect with multiple accountability partners
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g., Day Traders Unite"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="What's your group about?"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="max_members">Max Members</Label>
                <Input
                  id="max_members"
                  type="number"
                  min={2}
                  max={20}
                  value={newGroup.max_members}
                  onChange={(e) => setNewGroup({ ...newGroup, max_members: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={newGroup.is_public}
                  onChange={(e) => setNewGroup({ ...newGroup, is_public: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_public">Make group public (visible to all users)</Label>
              </div>
              <Button onClick={createGroup} className="w-full">Create Group</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => {
          const isMember = !!group.user_role;
          const isAdmin = group.user_role === 'admin';
          const isFull = (group.member_count || 0) >= group.max_members;

          return (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                  </div>
                  {isAdmin && <Crown className="h-4 w-4 text-yellow-500" />}
                </div>
                <CardDescription className="line-clamp-2">
                  {group.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-medium">
                      {group.member_count} / {group.max_members}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Visibility</span>
                    <span className="font-medium">
                      {group.is_public ? "Public" : "Private"}
                    </span>
                  </div>
                  {isMember ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => leaveGroup(group.id)}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Leave Group
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => joinGroup(group.id)}
                      disabled={isFull}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {isFull ? "Group Full" : "Join Group"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No groups found. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}