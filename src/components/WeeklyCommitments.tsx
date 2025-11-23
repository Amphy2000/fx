import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import GoalCheckInDialog from "./GoalCheckInDialog";
import GoalCreationDialog from "./GoalCreationDialog";
import PartnerGoalsCard from "./PartnerGoalsCard";

interface WeeklyCommitmentsProps {
  partnershipId: string;
}

export default function WeeklyCommitments({ partnershipId }: WeeklyCommitmentsProps) {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

  useEffect(() => {
    loadGoals();
  }, [partnershipId]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-partner-goals', {
        body: { partnership_id: partnershipId }
      });

      if (error) throw error;
      setGoals(data.goals || []);
    } catch (error: any) {
      console.error('Error loading goals:', error);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (goalData: any) => {
    try {
      const { error } = await supabase.functions.invoke('create-partner-goal', {
        body: { ...goalData, partnership_id: partnershipId }
      });

      if (error) throw error;
      toast.success("Goal created!");
      loadGoals();
    } catch (error: any) {
      console.error('Error creating goal:', error);
      toast.error(error.message || "Failed to create goal");
    }
  };

  const handleCheckIn = (goal: any) => {
    setSelectedGoal(goal);
    setShowCheckIn(true);
  };

  const handleCheckInSubmit = async (checkInData: any) => {
    try {
      const { error } = await supabase.functions.invoke('submit-goal-checkin', {
        body: { ...checkInData, goal_id: selectedGoal.id }
      });

      if (error) throw error;
      toast.success("Check-in submitted!");
      setShowCheckIn(false);
      setSelectedGoal(null);
      loadGoals();
    } catch (error: any) {
      console.error('Error submitting check-in:', error);
      toast.error(error.message || "Failed to submit check-in");
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Weekly Commitments
                </CardTitle>
                <CardDescription>
                  Set goals and track progress with your accountability partner
                </CardDescription>
              </div>
              <Button onClick={() => setShowCreateGoal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </div>
          </CardHeader>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading goals...</p>
            </CardContent>
          </Card>
        ) : goals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No goals yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first goal to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((goal) => (
              <PartnerGoalsCard
                key={goal.id}
                goal={goal}
                onCheckIn={() => handleCheckIn(goal)}
                onReload={loadGoals}
              />
            ))}
          </div>
        )}
      </div>

      <GoalCreationDialog
        open={showCreateGoal}
        onOpenChange={setShowCreateGoal}
        onSubmit={handleCreateGoal}
      />

      {selectedGoal && (
        <GoalCheckInDialog
          open={showCheckIn}
          onOpenChange={setShowCheckIn}
          goal={selectedGoal}
          onSubmit={handleCheckInSubmit}
        />
      )}
    </>
  );
}
