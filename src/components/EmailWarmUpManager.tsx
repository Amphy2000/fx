import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Play, Pause, Trash2, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export const EmailWarmUpManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    domain: "",
    current_daily_limit: 50,
    target_daily_limit: 10000,
    daily_increment: 50,
  });

  // Fetch warm-up schedules
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["warmup-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_warm_up_schedules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch today's send tracking
  const { data: sendTracking } = useQuery({
    queryKey: ["send-tracking"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("email_send_tracking")
        .select("*")
        .eq("send_date", today);

      if (error) throw error;
      return data;
    },
  });

  // Create schedule mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("email_warm_up_schedules").insert({
        ...data,
        created_by: user.user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warmup-schedules"] });
      toast.success("Warm-up schedule created successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Failed to create schedule: ${error.message}`);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("email_warm_up_schedules")
        .update({ is_active: !is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warmup-schedules"] });
      toast.success("Schedule updated");
    },
  });

  // Delete schedule mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_warm_up_schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warmup-schedules"] });
      toast.success("Schedule deleted");
    },
  });

  const resetForm = () => {
    setFormData({
      domain: "",
      current_daily_limit: 50,
      target_daily_limit: 10000,
      daily_increment: 50,
    });
  };

  const getTodaySends = (domain: string) => {
    const tracking = sendTracking?.find((t) => t.domain === domain);
    return tracking?.emails_sent || 0;
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading warm-up schedules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Warm-Up Scheduler</h2>
          <p className="text-muted-foreground">
            Gradually increase send volume to build sender reputation
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Warm-Up Schedule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  placeholder="example.com"
                  value={formData.domain}
                  onChange={(e) =>
                    setFormData({ ...formData, domain: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="current">Starting Daily Limit</Label>
                <Input
                  id="current"
                  type="number"
                  value={formData.current_daily_limit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      current_daily_limit: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="target">Target Daily Limit</Label>
                <Input
                  id="target"
                  type="number"
                  value={formData.target_daily_limit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      target_daily_limit: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="increment">Daily Increment</Label>
                <Input
                  id="increment"
                  type="number"
                  value={formData.daily_increment}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      daily_increment: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={
                  createMutation.isPending ||
                  !formData.domain ||
                  formData.current_daily_limit <= 0 ||
                  formData.target_daily_limit <= 0
                }
                className="w-full"
              >
                Create Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {schedules?.map((schedule) => {
          const todaySends = getTodaySends(schedule.domain);
          const progress = getProgressPercentage(
            schedule.current_daily_limit,
            schedule.target_daily_limit
          );
          const daysToTarget = Math.ceil(
            (schedule.target_daily_limit - schedule.current_daily_limit) /
              schedule.daily_increment
          );

          return (
            <Card key={schedule.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{schedule.domain}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        toggleActiveMutation.mutate({
                          id: schedule.id,
                          is_active: schedule.is_active,
                        })
                      }
                    >
                      {schedule.is_active ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(schedule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div className="font-semibold">
                      {schedule.is_active ? "Active" : "Paused"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Today's Sends</div>
                    <div className="font-semibold">
                      {todaySends} / {schedule.current_daily_limit}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Daily Increment</div>
                    <div className="font-semibold">
                      +{schedule.daily_increment}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Days to Target</div>
                    <div className="font-semibold flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {daysToTarget} days
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">
                      {schedule.current_daily_limit} / {schedule.target_daily_limit}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {progress.toFixed(1)}% to target limit
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {schedules?.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No warm-up schedules yet. Create one to start building your sender
              reputation.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
