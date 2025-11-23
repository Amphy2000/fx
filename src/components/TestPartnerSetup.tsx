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
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        setLoading(false);
        return;
      }

      // Check if test partner already exists
      const {
        data: existingPartnership
      } = await supabase.from('accountability_partnerships').select('id').or(`user_id.eq.${user.id},partner_id.eq.${user.id}`).eq('status', 'active').limit(1).maybeSingle();
      if (existingPartnership) {
        setHasTestPartner(true);
        toast.info("You already have an active partnership!");
        setLoading(false);
        return;
      }

      // Create test partner via edge function
      const {
        data,
        error
      } = await supabase.functions.invoke('create-test-partner');
      if (error) {
        console.error('Error creating test partner:', error);
        toast.error("Failed to create test partner: " + error.message);
        setLoading(false);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
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
  return <Card>
      
      
    </Card>;
}