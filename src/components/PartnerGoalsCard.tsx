import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, Calendar, Heart, PartyPopper, ThumbsUp, Zap } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PartnerGoalsCardProps {
  goal: any;
  onCheckIn: () => void;
  onReload: () => void;
}

export default function PartnerGoalsCard({ goal, onCheckIn, onReload }: PartnerGoalsCardProps) {
  const [sending, setSending] = useState(false);

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

  const isMyGoal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id === goal.user_id;
  };

  const handleReaction = async (reactionType: string) => {
    if (await isMyGoal()) {
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
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
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
          <Badge variant={goal.status === 'active' ? 'default' : 'secondary'}>
            {goal.status}
          </Badge>
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
      </CardContent>
    </Card>
  );
}
