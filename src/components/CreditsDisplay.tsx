import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Sparkles, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
export const CreditsDisplay = () => {
  const [credits, setCredits] = useState<number | null>(null);
  const [tier, setTier] = useState<string>("free");
  const [resetDate, setResetDate] = useState<Date | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const fetchCredits = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data: profile
      } = await supabase.from("profiles").select("ai_credits, subscription_tier, credits_reset_date").eq("id", user.id).single();
      if (profile) {
        setCredits(profile.ai_credits);
        setTier(profile.subscription_tier || "free");
        setResetDate(profile.credits_reset_date ? new Date(profile.credits_reset_date) : null);
      }
    };
    fetchCredits();

    // Subscribe to changes
    const channel = supabase.channel("credits-changes").on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "profiles"
    }, payload => {
      if (payload.new) {
        setCredits((payload.new as any).ai_credits);
        setTier((payload.new as any).subscription_tier || "free");
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  if (credits === null) return null;
  const getCreditsColor = () => {
    if (tier === "lifetime") return "text-primary";
    if (credits > 100) return "text-green-500";
    if (credits > 20) return "text-yellow-500";
    return "text-red-500";
  };
  const daysUntilReset = resetDate ? Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
  return <Card className="p-4 bg-gradient-to-br from-background to-muted/20 border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getCreditsColor()}`}>
                {tier === "lifetime" ? "∞" : credits}
              </span>
              <span className="text-sm text-muted-foreground">AI Credits</span>
            </div>
            {tier !== "lifetime" && <p className="text-xs text-muted-foreground">
                Resets in {daysUntilReset} days
              </p>}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={tier === "free" ? "outline" : "default"}>
            {tier === "lifetime" ? "Lifetime" : tier === "monthly" ? "Pro" : "Free"}
          </Badge>
          {tier === "free" && credits < 20 && <Button size="sm" onClick={() => navigate("/pricing")} className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Upgrade
            </Button>}
        </div>
      </div>
      
      {tier === "free"}
    </Card>;
};