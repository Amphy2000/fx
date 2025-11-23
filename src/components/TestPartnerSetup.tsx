import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Users } from "lucide-react";

export default function TestPartnerSetup() {
  const [loading, setLoading] = useState(false);
  const [hasTestPartner, setHasTestPartner] = useState(false);

  const createTestPartner = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        setLoading(false);
        return;
      }

      // Check if test partner already exists
      const { data: existingPartnership } = await supabase
        .from('accountability_partnerships')
        .select('id')
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (existingPartnership) {
        setHasTestPartner(true);
        toast.info("You already have an active partnership!");
        setLoading(false);
        return;
      }

      // Create test partner
      const { data, error } = await supabase.rpc('create_test_partner_for_user', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error creating test partner:', error);
        toast.error("Failed to create test partner: " + error.message);
        setLoading(false);
        return;
      }

      setHasTestPartner(true);
      toast.success("Test partner created successfully! Refreshing page...");
      
      // Refresh page after short delay
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error creating test partner");
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Test Partner Setup
        </CardTitle>
        <CardDescription>
          Create a dummy partner to test all partnership features
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasTestPartner ? (
          <div className="text-sm text-muted-foreground">
            ✅ Test partnership is active
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will create a test partner account and establish an active partnership so you can test:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Goals & Weekly Commitments</li>
              <li>Partner Chat</li>
              <li>Analytics & Progress Tracking</li>
              <li>Shared Weekly Summaries</li>
            </ul>
            <Button onClick={createTestPartner} disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Test Partner"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
