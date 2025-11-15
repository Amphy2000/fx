import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CheckCircle2, TrendingUp, Target, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { updateStreak, awardAchievement } from "@/utils/streakManager";

const Routine = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [todayRoutine, setTodayRoutine] = useState<any>(null);
  const [keyLevels, setKeyLevels] = useState<string[]>([""]);
  
  const [formData, setFormData] = useState({
    market_bias: "",
    trading_rules_checked: false,
    pre_session_ready: false,
    session_notes: ""
  });

  useEffect(() => {
    checkAuth();
    fetchTodayRoutine();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchTodayRoutine = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const { data, error } = await (supabase as any)
      .from("routine_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("entry_date", today)
      .single();

    if (data) {
      setTodayRoutine(data);
      setFormData({
        market_bias: data.market_bias || "",
        trading_rules_checked: data.trading_rules_checked,
        pre_session_ready: data.pre_session_ready,
        session_notes: data.session_notes || ""
      });
      
      const levels = data.key_levels || [];
      setKeyLevels(levels.length > 0 ? levels : [""]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    
    const routineData = {
      user_id: user.id,
      entry_date: today,
      ...formData,
      key_levels: keyLevels.filter(level => level.trim() !== "")
    };

    const { error } = todayRoutine
      ? await (supabase as any).from("routine_entries").update(routineData).eq("id", todayRoutine.id)
      : await (supabase as any).from("routine_entries").insert(routineData);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Routine saved!",
        description: "Your daily trading routine has been recorded."
      });
      
      // Update streak if routine is completed
      if (routineData.trading_rules_checked && routineData.pre_session_ready) {
        await updateStreak(user.id, 'routine_completion');
        
        // Award 7-day streak achievement
        const { data: streakData } = await supabase
          .from('streaks')
          .select('current_count')
          .eq('user_id', user.id)
          .eq('streak_type', 'routine_completion')
          .single();
        
        if (streakData?.current_count >= 7) {
          await awardAchievement(user.id, '7 Day Routine Streak', 'streak');
        }
      }
      
      fetchTodayRoutine();
    }

    setLoading(false);
  };

  const addKeyLevel = () => {
    setKeyLevels([...keyLevels, ""]);
  };

  const removeKeyLevel = (index: number) => {
    setKeyLevels(keyLevels.filter((_, i) => i !== index));
  };

  const updateKeyLevel = (index: number, value: string) => {
    const newLevels = [...keyLevels];
    newLevels[index] = value;
    setKeyLevels(newLevels);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Daily Trading Routine</h1>
            <p className="text-muted-foreground">Plan your trading day systematically</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {format(new Date(), 'MMMM dd, yyyy')}
                </CardTitle>
                <CardDescription>Complete your pre-market routine</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Market Bias
                    </Label>
                    <Input
                      value={formData.market_bias}
                      onChange={(e) => setFormData({...formData, market_bias: e.target.value})}
                      placeholder="e.g., Bullish EUR/USD, Bearish Gold"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Key Levels to Watch
                    </Label>
                    {keyLevels.map((level, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={level}
                          onChange={(e) => updateKeyLevel(index, e.target.value)}
                          placeholder="e.g., 1.0850 support, 1.0920 resistance"
                        />
                        {keyLevels.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeKeyLevel(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addKeyLevel}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Level
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Session Notes</Label>
                    <Textarea
                      value={formData.session_notes}
                      onChange={(e) => setFormData({...formData, session_notes: e.target.value})}
                      placeholder="Market conditions, news events, personal notes..."
                      rows={4}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Saving..." : "Save Routine"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Pre-Session Checklist
              </CardTitle>
              <CardDescription>Complete these before starting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={formData.trading_rules_checked}
                  onCheckedChange={(checked) => 
                    setFormData({...formData, trading_rules_checked: checked as boolean})
                  }
                />
                <div>
                  <Label className="font-medium">Review Trading Rules</Label>
                  <p className="text-sm text-muted-foreground">
                    Read your trading plan and risk rules
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={formData.pre_session_ready}
                  onCheckedChange={(checked) => 
                    setFormData({...formData, pre_session_ready: checked as boolean})
                  }
                />
                <div>
                  <Label className="font-medium">Mentally Ready?</Label>
                  <p className="text-sm text-muted-foreground">
                    Calm, focused, and prepared to trade
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Daily Reminders:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✓ Max 2% risk per trade</li>
                  <li>✓ No revenge trading</li>
                  <li>✓ Follow your setup rules</li>
                  <li>✓ Journal every trade</li>
                  <li>✓ Stop after 3 losses</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Routine;
