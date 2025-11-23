import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AccountabilityProfileSetupProps {
  onProfileCreated?: () => void;
}

export default function AccountabilityProfileSetup({ onProfileCreated }: AccountabilityProfileSetupProps) {
  const [loading, setLoading] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    bio: "",
    experience_level: "",
    timezone: "",
    trading_style: [] as string[],
    goals: [] as string[],
    is_seeking_partner: true,
    max_partners: 3
  });

  const tradingStyles = ["Day Trading", "Swing Trading", "Scalping", "Position Trading", "Options", "Futures"];
  const goalOptions = ["Consistency", "Risk Management", "Emotional Control", "Strategy Development", "Accountability"];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('accountability_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setExistingProfile(profile);
        setFormData({
          bio: profile.bio || "",
          experience_level: profile.experience_level || "",
          timezone: profile.timezone || "",
          trading_style: profile.trading_style || [],
          goals: profile.goals || [],
          is_seeking_partner: profile.is_seeking_partner ?? true,
          max_partners: profile.max_partners || 3
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (existingProfile) {
        const { error } = await supabase
          .from('accountability_profiles')
          .update(formData)
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success("Profile updated successfully!");
      } else {
        const { error } = await supabase
          .from('accountability_profiles')
          .insert([{ ...formData, user_id: user.id }]);

        if (error) throw error;
        toast.success("Profile created successfully!");
        onProfileCreated?.();
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const toggleStyle = (style: string) => {
    setFormData(prev => ({
      ...prev,
      trading_style: prev.trading_style.includes(style)
        ? prev.trading_style.filter(s => s !== style)
        : [...prev.trading_style, style]
    }));
  };

  const toggleGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accountability Profile</CardTitle>
        <CardDescription>
          Set up your profile to find compatible accountability partners
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell potential partners about yourself, your trading journey, and what you're looking for..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="experience">Experience Level</Label>
              <Select
                value={formData.experience_level}
                onValueChange={(value) => setFormData({ ...formData, experience_level: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner (0-1 years)</SelectItem>
                  <SelectItem value="intermediate">Intermediate (1-3 years)</SelectItem>
                  <SelectItem value="advanced">Advanced (3-5 years)</SelectItem>
                  <SelectItem value="expert">Expert (5+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                placeholder="e.g., EST, GMT+1"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Trading Style</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {tradingStyles.map((style) => (
                <div key={style} className="flex items-center space-x-2">
                  <Checkbox
                    id={`style-${style}`}
                    checked={formData.trading_style.includes(style)}
                    onCheckedChange={() => toggleStyle(style)}
                  />
                  <Label htmlFor={`style-${style}`} className="cursor-pointer">
                    {style}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Goals</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {goalOptions.map((goal) => (
                <div key={goal} className="flex items-center space-x-2">
                  <Checkbox
                    id={`goal-${goal}`}
                    checked={formData.goals.includes(goal)}
                    onCheckedChange={() => toggleGoal(goal)}
                  />
                  <Label htmlFor={`goal-${goal}`} className="cursor-pointer">
                    {goal}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="seeking"
                checked={formData.is_seeking_partner}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_seeking_partner: checked as boolean })
                }
              />
              <Label htmlFor="seeking" className="cursor-pointer">
                I'm currently seeking accountability partners
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_partners">Maximum Partners</Label>
              <Select
                value={formData.max_partners.toString()}
                onValueChange={(value) => setFormData({ ...formData, max_partners: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Partner</SelectItem>
                  <SelectItem value="2">2 Partners</SelectItem>
                  <SelectItem value="3">3 Partners</SelectItem>
                  <SelectItem value="5">5 Partners</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingProfile ? "Update Profile" : "Create Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
