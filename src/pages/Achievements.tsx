import { Layout } from "@/components/Layout";
import AchievementProgressTracker from "@/components/AchievementProgressTracker";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";

export default function Achievements() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchTrades();
  };

  const fetchTrades = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id);

    if (data) {
      setTrades(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6 flex items-center justify-center">
          <div className="text-muted-foreground">Loading achievements...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Trophy className="h-10 w-10 text-primary" />
            Achievements
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your progress and unlock achievements as you trade
          </p>
        </div>

        <AchievementProgressTracker trades={trades} />
      </div>
    </Layout>
  );
}
