import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MessageSquare, Target, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { AvatarImage, getDisplayName } from "./AvatarImage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PremiumGroupChat from "./PremiumGroupChat";
import GroupGoals from "./GroupGoals";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface GroupDetailsProps {
  groupId: string;
  onBack: () => void;
}

export default function GroupDetails({ groupId, onBack }: GroupDetailsProps) {
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  useEffect(() => {
    loadGroupDetails();
    getCurrentUser();
  }, [groupId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadGroupDetails = async () => {
    setLoading(true);
    try {
      // Load group details
      const { data: groupData, error: groupError } = await supabase
        .from('accountability_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);
      setEditForm({ name: groupData.name, description: groupData.description || "" });

      // Load members
      const { data: membersData, error: membersError } = await supabase
        .from('group_memberships')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            display_name,
            avatar_url
          )
        `)
        .eq('group_id', groupId)
        .eq('status', 'active');

      if (membersError) throw membersError;
      setMembers(membersData || []);
    } catch (error: any) {
      console.error('Error loading group details:', error);
      toast.error("Failed to load group details");
    } finally {
      setLoading(false);
    }
  };

  const handleEditGroup = async () => {
    try {
      const { error } = await supabase
        .from('accountability_groups')
        .update({
          name: editForm.name,
          description: editForm.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId);

      if (error) throw error;

      toast.success("Group updated successfully");
      setIsEditDialogOpen(false);
      loadGroupDetails();
    } catch (error: any) {
      console.error('Error updating group:', error);
      toast.error("Failed to update group");
    }
  };

  const handleDeleteGroup = async () => {
    try {
      // Delete group memberships first
      await supabase
        .from('group_memberships')
        .delete()
        .eq('group_id', groupId);

      // Delete group messages
      await supabase
        .from('group_messages')
        .delete()
        .eq('group_id', groupId);

      // Delete group goals
      await supabase
        .from('group_goals')
        .delete()
        .eq('group_id', groupId);

      // Delete the group
      const { error } = await supabase
        .from('accountability_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast.success("Group deleted successfully");
      onBack();
    } catch (error: any) {
      console.error('Error deleting group:', error);
      toast.error("Failed to delete group");
    }
  };

  const isCreator = currentUserId && group?.created_by === currentUserId;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading group...</p>
        </CardContent>
      </Card>
    );
  }

  if (!group) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Group not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Groups
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {group.name}
              </CardTitle>
              {group.description && (
                <p className="text-sm text-muted-foreground mt-2">{group.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Users className="h-4 w-4" />
                {members.length} {members.length === 1 ? 'member' : 'members'}
                {group.max_members && ` / ${group.max_members}`}
              </div>
            </div>
            {isCreator && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="goals">
            <Target className="h-4 w-4 mr-2" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <PremiumGroupChat groupId={groupId} />
        </TabsContent>

        <TabsContent value="goals">
          <GroupGoals groupId={groupId} />
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <AvatarImage 
                      avatarUrl={member.profiles?.avatar_url}
                      fallbackText={getDisplayName(member.profiles)}
                      className="h-10 w-10"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{getDisplayName(member.profiles)}</p>
                      <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update the group name and description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter group name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Enter group description"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditGroup} disabled={!editForm.name.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? This will remove all members, messages, and goals. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
