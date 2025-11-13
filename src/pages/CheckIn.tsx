import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Brain, Heart, Moon, Target, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const CheckIn = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    mood: "neutral",
    confidence: 5,
    stress: 5,
    sleep_hours: 7,
    focus_level: 5,
    note: ""
  });

  useEffect(() => {
    checkAuth();
    fetchTodayCheckIn();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchTodayCheckIn = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from("daily_checkins")
      .select("*")
      .eq("user_id", user.id)
      .eq("check_in_date", today)
      .single();

    if (data) {
      setTodayCheckIn(data);
      setFormData({
        mood: data.mood,
        confidence: data.confidence,
        stress: data.stress,
        sleep_hours: data.sleep_hours,
        focus_level: data.focus_level,
        note: data.note || ""
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    
    const checkInData = {
      user_id: user.id,
      check_in_date: today,
      ...formData
    };

    const { error } = todayCheckIn
      ? await supabase.from("daily_checkins").update(checkInData).eq("id", todayCheckIn.id)
      : await supabase.from("daily_checkins").insert(checkInData);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Check-in saved!",
        description: "Your daily mental state has been recorded."
      });
      fetchTodayCheckIn();
    }

    setLoading(false);
  };

  const getAIFeedback = () => {
    if (formData.stress > 7 && formData.sleep_hours < 6) {
      return "⚠️ High stress + low sleep = increased risk of overtrading today. Consider taking it easy.";
    }
    if (formData.confidence < 4 && formData.focus_level < 4) {
      return "💭 Low confidence and focus detected. Maybe skip live trading and stick to demo/review today.";
    }
    if (formData.stress > 7) {
      return "😰 High stress levels detected. Consider breathing exercises before trading.";
    }
    if (formData.sleep_hours < 6) {
      return "😴 Low sleep hours. Your decision-making may be impaired today.";
    }
    if (formData.confidence >= 7 && formData.focus_level >= 7 && formData.stress < 5) {
      return "✅ You're in great shape! Perfect conditions for focused trading.";
    }
    return "👍 You're doing okay. Stay mindful during your session.";
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Daily Check-In</h1>
            <p className="text-muted-foreground">Track your mental state before trading</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Today's Check-In</CardTitle>
              <CardDescription>{format(new Date(), 'MMMM dd, yyyy')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Mood</Label>
                  <Select value={formData.mood} onValueChange={(value) => setFormData({...formData, mood: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">😄 Excellent</SelectItem>
                      <SelectItem value="good">🙂 Good</SelectItem>
                      <SelectItem value="neutral">😐 Neutral</SelectItem>
                      <SelectItem value="low">😔 Low</SelectItem>
                      <SelectItem value="anxious">😰 Anxious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Confidence: {formData.confidence}/10
                  </Label>
                  <Slider
                    value={[formData.confidence]}
                    onValueChange={(value) => setFormData({...formData, confidence: value[0]})}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Stress Level: {formData.stress}/10
                  </Label>
                  <Slider
                    value={[formData.stress]}
                    onValueChange={(value) => setFormData({...formData, stress: value[0]})}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    Sleep Hours
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.sleep_hours}
                    onChange={(e) => setFormData({...formData, sleep_hours: parseFloat(e.target.value)})}
                    min={0}
                    max={12}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Focus Level: {formData.focus_level}/10
                  </Label>
                  <Slider
                    value={[formData.focus_level]}
                    onValueChange={(value) => setFormData({...formData, focus_level: value[0]})}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={formData.note}
                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                    placeholder="How are you feeling today?"
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Saving..." : todayCheckIn ? "Update Check-In" : "Save Check-In"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-lg font-medium">{getAIFeedback()}</p>
                
                <div className="pt-4 border-t space-y-2">
                  <h4 className="font-semibold text-sm">Today's Stats:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Confidence: {formData.confidence}/10</div>
                    <div>Stress: {formData.stress}/10</div>
                    <div>Sleep: {formData.sleep_hours}h</div>
                    <div>Focus: {formData.focus_level}/10</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default CheckIn;
