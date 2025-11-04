import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Brain, GraduationCap, Loader2, TrendingUp } from "lucide-react";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { Badge } from "@/components/ui/badge";

export default function AICoach() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => {
    document.title = "AI Trade Coach – Weekly Mentorship | Amphy AI";
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-coach", { body: {} });

      if (error) {
        const status = (error as any)?.status;
        if (status === 402) {
          toast.error("Insufficient AI credits", {
            description: "Upgrade your plan to continue using AI Trade Coach",
            action: { label: "Upgrade", onClick: () => (window.location.href = "/pricing") },
          });
          return;
        }
        if (status === 429) {
          toast.error("AI is rate limited", { description: "Please wait a moment and try again." });
          return;
        }
        if (status === 401) {
          toast.error("Sign in required", {
            description: "Please sign in to use AI Trade Coach",
            action: { label: "Sign in", onClick: () => (window.location.href = "/auth") },
          });
          return;
        }
        const fallbackMatch = error.message?.match(/fallback[:=]\s?([^}]+)$/);
        if (fallbackMatch?.[1]) {
          toast.error("AI Trade Coach Unavailable", { description: fallbackMatch[1] });
        } else {
          toast.error("AI Trade Coach Unavailable", { description: "AI Trade Coach is temporarily unavailable. Please try again in a few minutes." });
        }
        return;
      }

      if (data && (data.ok === false || data.error)) {
        toast.error("AI Trade Coach Unavailable", {
          description: data.fallback || data.error || "Please try again in a few minutes.",
        });
        return;
      }

      setReport(data.report);
      toast.success("Coaching report ready");
    } catch (e: any) {
      if (e.message?.includes('Edge Function returned a non-2xx status code')) {
        toast.error("AI Trade Coach Unavailable", { description: "AI Trade Coach is temporarily unavailable. Please try again in a few minutes." });
      } else {
        toast.error("Failed to generate coaching report", { description: e.message || "Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <GraduationCap className="h-10 w-10 text-primary" />
              AI Trade Coach
            </h1>
            <p className="text-muted-foreground mt-2">
              Your weekly mentorship: personalized insights, patterns, and a focused improvement task.
            </p>
          </div>
          <Badge variant="default" className="text-lg px-4 py-2">
            <TrendingUp className="h-4 w-4 mr-2" />
            Premium Feature
          </Badge>
        </div>

        <CreditsDisplay />

        <Card>
          <CardHeader>
            <CardTitle>Weekly Coaching Report</CardTitle>
            <CardDescription>Generate a fresh report now. New users get motivational guidance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={generateReport} disabled={loading} size="lg" className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating your coaching report...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Generate Coaching Report
                </>
              )}
            </Button>

            {report ? (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {report}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click the button to generate your personalized weekly coaching summary and focus task.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
