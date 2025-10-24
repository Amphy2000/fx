import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format, addWeeks, addMonths, addYears, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { cn } from "@/lib/utils";

interface Target {
  id: string;
  title: string;
  description: string | null;
  target_type: "weekly" | "monthly" | "annual";
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
}

export default function Targets() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetType, setTargetType] = useState<"weekly" | "monthly" | "annual">("weekly");
  const [targetValue, setTargetValue] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchTargets();
  };

  const fetchTargets = async () => {
    try {
      const { data, error } = await supabase
        .from("targets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTargets((data || []) as Target[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateEndDate = (start: Date, type: "weekly" | "monthly" | "annual"): Date => {
    switch (type) {
      case "weekly":
        return addWeeks(start, 1);
      case "monthly":
        return addMonths(start, 1);
      case "annual":
        return addYears(start, 1);
    }
  };

  const getDefaultStartDate = (type: "weekly" | "monthly" | "annual"): Date => {
    const now = new Date();
    switch (type) {
      case "weekly":
        return startOfWeek(now, { weekStartsOn: 1 });
      case "monthly":
        return startOfMonth(now);
      case "annual":
        return startOfYear(now);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !targetValue || !startDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const endDate = calculateEndDate(startDate, targetType);

      const { error } = await supabase.from("targets").insert({
        user_id: user.id,
        title,
        description,
        target_type: targetType,
        target_value: parseFloat(targetValue),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Target created successfully",
      });

      setTitle("");
      setDescription("");
      setTargetValue("");
      setStartDate(undefined);
      setShowForm(false);
      fetchTargets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("targets").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Target deleted successfully",
      });
      fetchTargets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getProgressPercentage = (target: Target): number => {
    return Math.min((target.current_value / target.target_value) * 100, 100);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Trading Targets</h1>
            <p className="text-muted-foreground mt-2">Set and track your trading goals</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? "Cancel" : "New Target"}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New Target</CardTitle>
              <CardDescription>Set a new trading target to track your progress</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Weekly Profit Target"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional notes about this target"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetType">Target Period *</Label>
                    <Select
                      value={targetType}
                      onValueChange={(value: "weekly" | "monthly" | "annual") => {
                        setTargetType(value);
                        setStartDate(getDefaultStartDate(value));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetValue">Target Value *</Label>
                    <Input
                      id="targetValue"
                      type="number"
                      step="0.01"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder="e.g., 1000"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {startDate && (
                    <p className="text-sm text-muted-foreground">
                      End Date: {format(calculateEndDate(startDate, targetType), "PPP")}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full">Create Target</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6">
          {targets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No targets yet</p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Target
                </Button>
              </CardContent>
            </Card>
          ) : (
            targets.map((target) => (
              <Card key={target.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{target.title}</CardTitle>
                      <CardDescription>
                        {target.description}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(target.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {format(new Date(target.start_date), "MMM d, yyyy")} - {format(new Date(target.end_date), "MMM d, yyyy")}
                    </span>
                    <span className="font-medium capitalize">{target.target_type}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">
                        {target.current_value} / {target.target_value}
                      </span>
                    </div>
                    <Progress value={getProgressPercentage(target)} />
                    <p className="text-xs text-muted-foreground text-right">
                      {getProgressPercentage(target).toFixed(1)}% complete
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
