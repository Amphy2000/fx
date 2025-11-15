import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, TrendingUp, Target, Users, Eye, EyeOff, Medal } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LeaderboardProfile {
  id: string;
  display_name: string;
  total_trades: number;
  win_rate: number;
  profit_factor: number;
  best_pair: string | null;
  trading_since: string | null;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<LeaderboardProfile[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    fetchUserProfile();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard_profiles')
        .select('*')
        .eq('is_public', true)
        .order('win_rate', { ascending: false })
        .limit(50);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('leaderboard_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setUserProfile(data);
        setIsPublic(data.is_public);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const togglePublicProfile = async (checked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch current profile or user's data
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const displayName = profile?.full_name || profile?.email || 'Anonymous Trader';

      const { error } = await supabase
        .from('leaderboard_profiles')
        .upsert({
          user_id: user.id,
          is_public: checked,
          display_name: displayName
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setIsPublic(checked);
      toast.success(checked ? "Profile is now public!" : "Profile is now private");
      
      // Refresh both profiles
      await fetchUserProfile();
      if (checked) {
        await fetchLeaderboard();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile visibility");
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground font-semibold">#{index + 1}</span>;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-yellow-500 text-black">Champion</Badge>;
    if (index === 1) return <Badge variant="secondary">Elite</Badge>;
    if (index === 2) return <Badge variant="secondary">Expert</Badge>;
    return null;
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Trophy className="h-10 w-10 text-primary" />
              Trader Leaderboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Compare your performance with the best traders on Amphy
            </p>
          </div>
        </div>

        {userProfile && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Your Profile</span>
                <div className="flex items-center gap-2">
                  <Label htmlFor="public-toggle" className="text-sm">
                    {isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Label>
                  <Switch
                    id="public-toggle"
                    checked={isPublic}
                    onCheckedChange={togglePublicProfile}
                  />
                  <span className="text-sm text-muted-foreground">
                    {isPublic ? "Public" : "Private"}
                  </span>
                </div>
              </CardTitle>
              <CardDescription>
                {isPublic 
                  ? "Your stats are visible to other traders" 
                  : "Make your profile public to appear on the leaderboard"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold">{userProfile.total_trades}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{userProfile.win_rate.toFixed(1)}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Profit Factor</p>
                <p className="text-2xl font-bold">{userProfile.profit_factor.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Best Pair</p>
                <p className="text-xl font-bold">{userProfile.best_pair || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Traders
            </CardTitle>
            <CardDescription>
              Ranked by win rate with minimum 10 completed trades
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading leaderboard...</div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-muted-foreground">No public profiles yet.</p>
                <p className="text-sm text-muted-foreground">Be the first to make your profile public!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {profiles.map((profile, index) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 flex items-center justify-center">
                        {getRankIcon(index)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{profile.display_name}</p>
                          {getRankBadge(index)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Trading since {profile.trading_since ? new Date(profile.trading_since).getFullYear() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Trades</p>
                        <p className="text-lg font-bold">{profile.total_trades}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Win Rate</p>
                        <p className="text-lg font-bold text-green-500">{profile.win_rate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">P. Factor</p>
                        <p className="text-lg font-bold">{profile.profit_factor.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Climb the Ranks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="rounded-full bg-primary/10 p-2 h-fit">
                <span className="text-primary font-bold">1</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Log Consistent Trades</p>
                <p className="text-sm text-muted-foreground">
                  Record all your trades to build accurate statistics
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="rounded-full bg-primary/10 p-2 h-fit">
                <span className="text-primary font-bold">2</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Improve Your Win Rate</p>
                <p className="text-sm text-muted-foreground">
                  Use Trade Copilot to validate setups before entering
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="rounded-full bg-primary/10 p-2 h-fit">
                <span className="text-primary font-bold">3</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Make Your Profile Public</p>
                <p className="text-sm text-muted-foreground">
                  Share your success and inspire other traders
                </p>
              </div>
            </div>
            <Button className="w-full mt-4" onClick={() => navigate('/trade-copilot')}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Use Trade Copilot to Improve
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
