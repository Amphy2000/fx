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

      // Show SQL instructions to create test partner
      const testPartnerEmail = `test.partner.${user.id.slice(0, 8)}@example.com`;
      
      toast.info(
        <div className="space-y-2 max-w-2xl">
          <p className="font-semibold">Copy and run this SQL in your database:</p>
          <div className="bg-muted p-3 rounded overflow-auto max-h-60 text-xs font-mono">
{`-- Step 1: Create test auth user and save the returned ID
WITH new_user AS (
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_super_admin,
    raw_app_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    '${testPartnerEmail}',
    crypt('testpassword123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"full_name": "Test Partner"}'::jsonb,
    false,
    '{"provider": "email", "providers": ["email"]}'::jsonb
  )
  RETURNING id
)
-- Step 2: Create accountability profile
, new_profile AS (
  INSERT INTO accountability_profiles (user_id, bio, experience_level, goals, trading_style)
  SELECT id, 'Test partner for development', 'intermediate', 
         ARRAY['consistency', 'risk management'], 
         ARRAY['day trading']
  FROM new_user
  RETURNING user_id
)
-- Step 3: Create active partnership
INSERT INTO accountability_partnerships (
  user_id, 
  partner_id, 
  initiated_by, 
  status, 
  accepted_at
)
SELECT 
  '${user.id}'::uuid,
  user_id,
  '${user.id}'::uuid,
  'active',
  now()
FROM new_profile;`}
          </div>
          <p className="text-xs text-muted-foreground">After running this, refresh the page!</p>
        </div>,
        { duration: 60000 }
      );
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error generating SQL");
    } finally {
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
