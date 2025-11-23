import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, Calendar, Heart, PartyPopper, ThumbsUp, Zap, MessageSquare, Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import GoalComments from "./GoalComments";
import GoalEditDialog from "./GoalEditDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

const getAvatarColor = (userId: string) => {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

interface PartnerGoalsCardProps {
  goal: any;
  onCheckIn: () => void;
  onReload: () => void;
}

export default function PartnerGoalsCard({ goal, onCheckIn, onReload }: PartnerGoalsCardProps) {
  const [sending, setSending] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const isMyGoal = currentUserId === goal.user_id;
  const avatarColor = getAvatarColor(goal.user_id);

  const handleDeleteGoal = async () => {
    try {
      const { error } = await supabase
        .from('partner_goals')
        .delete()
        .eq('id', goal.id)
        .eq('user_id', currentUserId);

      if (error) throw error;
      toast.success("Goal deleted");
      setShowDeleteDialog(false);
      onReload();
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      toast.error("Failed to delete goal");
    }
  };

  const handleEditGoal = async (goalData: any) => {
    try {
      const { error } = await supabase
        .from('partner_goals')
        .update({
          goal_text: goalData.goal_text,
          goal_type: goalData.goal_type,
          target_date: goalData.target_date || null,
          description: goalData.description || null,
        })
        .eq('id', goal.id)
        .eq('user_id', currentUserId);

      if (error) throw error;
      toast.success("Goal updated");
      setShowEditDialog(false);
      onReload();
    } catch (error: any) {
      console.error('Error updating goal:', error);
      toast.error("Failed to update goal");
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; variant: any; icon: any }> = {
      completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
      partial: { label: "Partial", variant: "secondary", icon: CheckCircle2 },
      missed: { label: "Missed", variant: "destructive", icon: CheckCircle2 },
    };
    const config = badges[status] || { label: status, variant: "outline", icon: CheckCircle2 };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="text-xs">
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getInitials = () => {
    const name = goal.user?.full_name || goal.user?.email || "?";
    return name.substring(0, 2).toUpperCase();
  };

  const handleReaction = async (reactionType: string) => {
    if (isMyGoal) {
      toast.error("You can't react to your own check-in");
      return;
    }

    const todayCheckIn = goal.check_ins?.find(
      (ci: any) => ci.check_in_date === new Date().toISOString().split('T')[0]
    );

    if (!todayCheckIn) {
      toast.error("No check-in to react to");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-partner-reaction', {
        body: {
          check_in_id: todayCheckIn.id,
          reaction_type: reactionType
        }
      });

      if (error) throw error;
      toast.success("Reaction sent!");
      onReload();
    } catch (error: any) {
      console.error('Error sending reaction:', error);
      toast.error(error.message || "Failed to send reaction");
    } finally {
      setSending(false);
    }
  };

  const todayCheckIn = goal.check_ins?.find(
    (ci: any) => ci.check_in_date === new Date().toISOString().split('T')[0]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className={`h-10 w-10 ${avatarColor}`}>
              <AvatarFallback className="text-white bg-transparent">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-lg">{goal.goal_text}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3" />
                {goal.goal_type === 'daily' ? 'Daily' : goal.goal_type === 'weekly' ? 'Weekly' : 'Custom'}
                {goal.target_date && ` · Due ${format(new Date(goal.target_date), 'MMM d')}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={goal.status === 'active' ? 'default' : 'secondary'}>
              {goal.status}
            </Badge>
            {isMyGoal && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowEditDialog(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {todayCheckIn ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              {getStatusBadge(todayCheckIn.status)}
              <span className="text-xs text-muted-foreground">
                Today
              </span>
            </div>

            {todayCheckIn.notes && (
              <p className="text-sm text-muted-foreground italic">
                "{todayCheckIn.notes}"
              </p>
            )}

            {todayCheckIn.reactions && todayCheckIn.reactions.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {todayCheckIn.reactions.map((reaction: any) => (
                  <Badge key={reaction.id} variant="outline" className="text-xs">
                    {reaction.reaction_type === 'like' && <ThumbsUp className="h-3 w-3 mr-1" />}
                    {reaction.reaction_type === 'celebrate' && <PartyPopper className="h-3 w-3 mr-1" />}
                    {reaction.reaction_type === 'support' && <Heart className="h-3 w-3 mr-1" />}
                    {reaction.reaction_type === 'motivate' && <Zap className="h-3 w-3 mr-1" />}
                    {reaction.reaction_type}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleReaction('like')}
                disabled={sending}
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                Like
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleReaction('celebrate')}
                disabled={sending}
              >
                <PartyPopper className="h-3 w-3 mr-1" />
                Celebrate
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={onCheckIn} className="w-full" size="sm">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Check In
          </Button>
        )}

        {goal.check_ins && goal.check_ins.length > 1 && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              {goal.check_ins.filter((ci: any) => ci.status === 'completed').length} completed · 
              {goal.check_ins.length} total check-ins
            </p>
          </div>
        )}

        <Collapsible open={showComments} onOpenChange={setShowComments}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full mt-2">
              <MessageSquare className="h-4 w-4 mr-2" />
              {showComments ? 'Hide' : 'Show'} Comments
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <GoalComments goalId={goal.id} checkInId={todayCheckIn?.id} />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your goal and all check-ins.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGoal} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GoalEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        goal={goal}
        onSubmit={handleEditGoal}
      />
    </Card>
  );
}
