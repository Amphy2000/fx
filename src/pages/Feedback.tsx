import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Feedback {
  id: string;
  rating: number;
  message: string | null;
  created_at: string;
  user_id: string;
}

const Feedback = () => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roles) {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to view this page.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);

      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load feedback.",
          variant: "destructive",
        });
      } else {
        setFeedback(data || []);
      }

      setLoading(false);
    };

    checkAdminAndFetch();
  }, [navigate]);

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-500";
    if (rating >= 3) return "text-yellow-500";
    return "text-red-500";
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Loading feedback...</p>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">User Feedback</h1>
          <p className="text-muted-foreground">
            View and analyze user feedback to improve the platform
          </p>
        </div>

        {feedback.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No feedback submitted yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {feedback.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= item.rating
                              ? `fill-current ${getRatingColor(item.rating)}`
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <CardDescription>
                      {new Date(item.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </CardDescription>
                  </div>
                </CardHeader>
                {item.message && (
                  <CardContent>
                    <p className="text-foreground">{item.message}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Feedback;
