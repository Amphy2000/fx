import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Target, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface JournalEntry {
  id: string;
  entry_date: string;
  mood: string;
  energy_level: number;
  market_conditions: string | null;
  trading_mindset: string | null;
  goals_for_session: string | null;
  lessons_learned: string | null;
  notes: string | null;
}

interface JournalEntriesListProps {
  refreshTrigger?: number;
}

export const JournalEntriesList = ({ refreshTrigger }: JournalEntriesListProps) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, [refreshTrigger]);

  const loadEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error loading journal entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMoodColor = (mood: string) => {
    const positiveMap: Record<string, boolean> = {
      "Confident": true, "Calm": true, "Excited": true, 
      "Focused": true, "Optimistic": true
    };
    
    if (positiveMap[mood]) return "bg-green-500/10 text-green-500 border-green-500/20";
    if (["Anxious", "Frustrated", "Pessimistic"].includes(mood)) 
      return "bg-red-500/10 text-red-500 border-red-500/20";
    return "bg-muted text-muted-foreground border-border";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Journal Entries Yet</h3>
          <p className="text-muted-foreground">
            Start documenting your trading journey to unlock AI-powered insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <Card key={entry.id} className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {format(new Date(entry.entry_date), "MMMM d, yyyy")}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getMoodColor(entry.mood)}>
                  {entry.mood}
                </Badge>
                <Badge variant="outline">
                  Energy: {entry.energy_level}/10
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {entry.market_conditions && (
              <div className="flex gap-2">
                <TrendingUp className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium mb-1">Market Conditions</p>
                  <p className="text-sm text-muted-foreground">{entry.market_conditions}</p>
                </div>
              </div>
            )}
            
            {entry.goals_for_session && (
              <div className="flex gap-2">
                <Target className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium mb-1">Session Goals</p>
                  <p className="text-sm text-muted-foreground">{entry.goals_for_session}</p>
                </div>
              </div>
            )}

            {entry.lessons_learned && (
              <div className="flex gap-2">
                <Lightbulb className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium mb-1">Lessons Learned</p>
                  <p className="text-sm text-muted-foreground">{entry.lessons_learned}</p>
                </div>
              </div>
            )}

            {entry.notes && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">{entry.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
