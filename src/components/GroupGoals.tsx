import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GroupGoalsProps {
  groupId: string;
}

export default function GroupGoals({ groupId }: GroupGoalsProps) {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, [groupId]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_goals')
        .select(`
          *,
          creator:created_by (
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

  return (
    <Card>
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
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Loading goals...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No group goals yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create a goal to get everyone working together!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <Card key={goal.id}>
                <CardHeader>
                  <CardTitle className="text-base">{goal.title}</CardTitle>
                  {goal.description && (
                    <CardDescription>{goal.description}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
