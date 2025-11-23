import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Plus, Target, TrendingUp, Calendar, Award } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  start_date: string;
  end_date: string;
  goal_criteria: any;
  created_by: string;
  is_public: boolean;
  prize_description: string | null;
  max_participants: number | null;
  created_at: string;
  updated_at: string;
}

interface ChallengeWithParticipation extends Challenge {
  participant_count?: number;
  user_participation?: any;
}

export default function AccountabilityChallenges() {
  const [challenges, setChallenges] = useState<ChallengeWithParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const getDefaultDates = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    return {
      start: today.toISOString().split('T')[0],
      end: thirtyDaysFromNow.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDates();

  const [newChallenge, setNewChallenge] = useState({
    title: "",
    description: "",
    challenge_type: "streak",
    start_date: defaultDates.start,
    end_date: defaultDates.end,
    goal_criteria: { target: 7 },
    is_public: true,
    prize_description: "",
    max_participants: null as number | null,
  });

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: challengesData } = await supabase
        .from('accountability_challenges')
        .select('*')
        .order('start_date', { ascending: false });

      if (challengesData) {
        // Get participation info for each challenge
        const enrichedChallenges: ChallengeWithParticipation[] = await Promise.all(
          challengesData.map(async (challenge) => {
            const { count } = await supabase
              .from('challenge_participants')
              .select('*', { count: 'exact', head: true })
              .eq('challenge_id', challenge.id);

            // Check if user is participating
            const { data: participation } = await supabase
              .from('challenge_participants')
              .select('*')
              .eq('challenge_id', challenge.id)
              .eq('user_id', user.id)
              .single();

            return {
              ...challenge,
              participant_count: count || 0,
              user_participation: participation,
            };
          })
        );

        setChallenges(enrichedChallenges);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
      toast.error("Failed to load challenges");
    } finally {
      setLoading(false);
    }
  };

  const createChallenge = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('accountability_challenges')
        .insert({
          ...newChallenge,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success("Challenge created successfully!");
      setIsCreateOpen(false);
      const newDefaultDates = getDefaultDates();
      setNewChallenge({
        title: "",
        description: "",
        challenge_type: "streak",
        start_date: newDefaultDates.start,
        end_date: newDefaultDates.end,
        goal_criteria: { target: 7 },
        is_public: true,
        prize_description: "",
        max_participants: null,
      });
      loadChallenges();
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error("Failed to create challenge");
    }
  };

  const joinChallenge = async (challengeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          status: 'active',
          current_progress: {},
        });

      if (error) throw error;

      toast.success("Joined challenge successfully!");
      loadChallenges();
    } catch (error: any) {
      console.error('Error joining challenge:', error);
      toast.error(error.message || "Failed to join challenge");
    }
  };

  const withdrawFromChallenge = async (challengeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('challenge_participants')
        .update({ status: 'withdrawn' })
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Withdrawn from challenge");
      loadChallenges();
    } catch (error) {
      console.error('Error withdrawing:', error);
      toast.error("Failed to withdraw from challenge");
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'streak': return <Target className="h-5 w-5" />;
      case 'win_rate': return <TrendingUp className="h-5 w-5" />;
      case 'profit_target': return <Trophy className="h-5 w-5" />;
      case 'consistency': return <Calendar className="h-5 w-5" />;
      default: return <Award className="h-5 w-5" />;
    }
  };

  const getChallengeStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) return { label: 'Upcoming', variant: 'secondary' as const };
    if (now > end) return { label: 'Ended', variant: 'outline' as const };
    return { label: 'Active', variant: 'default' as const };
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading challenges...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Accountability Challenges</h2>
          <p className="text-muted-foreground">Compete with others to achieve your trading goals</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Create New Challenge</DialogTitle>
              <DialogDescription>
                Create a challenge to motivate yourself and others
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              <div>
                <Label htmlFor="title">Challenge Title</Label>
                <Input
                  id="title"
                  value={newChallenge.title}
                  onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                  placeholder="e.g., 30-Day Consistent Trading Challenge"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newChallenge.description}
                  onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                  placeholder="Trade every day for 30 consecutive days, maintain your rules, and build the discipline that separates successful traders from the rest..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Challenge Type</Label>
                  <Select
                    value={newChallenge.challenge_type}
                    onValueChange={(value) => setNewChallenge({ ...newChallenge, challenge_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="streak">Trading Streak</SelectItem>
                      <SelectItem value="win_rate">Win Rate Target</SelectItem>
                      <SelectItem value="profit_target">Profit Target</SelectItem>
                      <SelectItem value="consistency">Consistency Challenge</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="target">Target Value</Label>
                  <Input
                    id="target"
                    type="number"
                    value={newChallenge.goal_criteria.target}
                    onChange={(e) => setNewChallenge({
                      ...newChallenge,
                      goal_criteria: { target: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newChallenge.start_date}
                    onChange={(e) => setNewChallenge({ ...newChallenge, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newChallenge.end_date}
                    onChange={(e) => setNewChallenge({ ...newChallenge, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="prize">Prize/Reward (Optional)</Label>
                <Input
                  id="prize"
                  value={newChallenge.prize_description || ""}
                  onChange={(e) => setNewChallenge({ ...newChallenge, prize_description: e.target.value })}
                  placeholder="e.g., Winner gets bragging rights and a custom trading badge!"
                />
              </div>
              <Button onClick={createChallenge} className="w-full mt-2">Create Challenge</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {challenges.map((challenge) => {
          const status = getChallengeStatus(challenge.start_date, challenge.end_date);
          const isParticipating = !!challenge.user_participation;
          const isFull = challenge.max_participants && 
            (challenge.participant_count || 0) >= challenge.max_participants;

          return (
            <Card key={challenge.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getChallengeIcon(challenge.challenge_type)}
                    <CardTitle className="text-lg">{challenge.title}</CardTitle>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {challenge.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Participants</span>
                    <span className="font-medium">
                      {challenge.participant_count}
                      {challenge.max_participants && ` / ${challenge.max_participants}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">
                      {format(new Date(challenge.start_date), 'MMM d')} - {format(new Date(challenge.end_date), 'MMM d')}
                    </span>
                  </div>
                  {challenge.prize_description && (
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="text-muted-foreground">{challenge.prize_description}</span>
                    </div>
                  )}
                  {isParticipating ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => withdrawFromChallenge(challenge.id)}
                      disabled={status.label === 'Ended'}
                    >
                      Withdraw
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => joinChallenge(challenge.id)}
                      disabled={isFull || status.label === 'Ended'}
                    >
                      {isFull ? "Challenge Full" : "Join Challenge"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {challenges.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No challenges available. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}