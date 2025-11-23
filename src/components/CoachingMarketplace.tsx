import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Clock, DollarSign, Users, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Coach {
  id: string;
  user_id: string;
  bio: string;
  specialties: string[];
  hourly_rate: number;
  rating: number;
  total_sessions: number;
  is_verified: boolean;
  availability: any;
  profile: {
    full_name: string;
    avatar_url: string;
  };
}

interface CoachingMarketplaceProps {
  userTier: string;
}

export const CoachingMarketplace = ({ userTier }: CoachingMarketplaceProps) => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isPremium = userTier === 'pro' || userTier === 'lifetime';

  useEffect(() => {
    fetchCoaches();
  }, []);

  const fetchCoaches = async () => {
    try {
      const { data, error } = await supabase
        .from('coaches')
        .select(`
          *,
          profile:profiles(full_name, avatar_url)
        `)
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      setCoaches(data || []);
    } catch (error) {
      console.error('Error fetching coaches:', error);
      toast.error('Failed to load coaches');
    } finally {
      setLoading(false);
    }
  };

  const handleBookSession = async (coachId: string, hourlyRate: number) => {
    if (!isPremium) {
      toast.error('Premium subscription required to book coaching sessions');
      navigate('/pricing');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      const { data, error } = await supabase.functions.invoke('initialize-payment', {
        body: {
          planType: 'coaching_session',
          email: profile?.email,
          amount: hourlyRate,
          metadata: {
            coach_id: coachId,
            session_type: 'one_on_one'
          }
        }
      });

      if (error) throw error;

      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error('Error booking session:', error);
      toast.error('Failed to book session');
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading coaches...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Coaching Marketplace</h3>
          <p className="text-sm text-muted-foreground">
            Connect with verified trading coaches
          </p>
        </div>
        {!isPremium && (
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" />
            Premium Only
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {coaches.map((coach) => (
          <Card key={coach.id} className={!isPremium ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={coach.profile?.avatar_url} />
                  <AvatarFallback>
                    {coach.profile?.full_name?.charAt(0) || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {coach.profile?.full_name || 'Coach'}
                    </CardTitle>
                    {coach.is_verified && (
                      <Badge variant="default" className="text-xs">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span>{coach.rating.toFixed(1)}</span>
                    <span className="text-xs">({coach.total_sessions} sessions)</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {coach.bio}
              </p>

              <div className="flex flex-wrap gap-1">
                {coach.specialties.slice(0, 3).map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-1 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">₦{coach.hourly_rate.toLocaleString()}</span>
                  <span className="text-muted-foreground">/hour</span>
                </div>
                <Button 
                  size="sm"
                  onClick={() => handleBookSession(coach.id, coach.hourly_rate)}
                  disabled={!isPremium}
                >
                  {isPremium ? 'Book Session' : <Lock className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {coaches.length === 0 && (
        <Card>
          <CardContent className="text-center p-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No coaches available yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
