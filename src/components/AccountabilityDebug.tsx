import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bug, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AccountabilityDebug() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTests = async () => {
    setTesting(true);
    const testResults: any = {
      auth: false,
      profile: false,
      partnerships: false,
      goals: false,
      errors: []
    };

    try {
      // Test 1: Authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`Auth: ${authError.message}`);
      testResults.auth = !!user;

      // Test 2: Profile
      const { data: profile, error: profileError } = await supabase
        .from('accountability_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        testResults.errors.push(`Profile: ${profileError.message}`);
      } else {
        testResults.profile = !!profile;
      }

      // Test 3: Partnerships
      const { data: partnerships, error: partnershipError } = await supabase
        .from('accountability_partnerships')
        .select('*')
        .or(`user_id.eq.${user!.id},partner_id.eq.${user!.id}`);
      
      if (partnershipError) {
        testResults.errors.push(`Partnerships: ${partnershipError.message}`);
      } else {
        testResults.partnerships = true;
        testResults.partnershipCount = partnerships?.length || 0;
      }

      // Test 4: Goals
      const { data: goals, error: goalsError } = await supabase
        .from('partner_goals')
        .select('*')
        .eq('user_id', user!.id);
      
      if (goalsError) {
        testResults.errors.push(`Goals: ${goalsError.message}`);
      } else {
        testResults.goals = true;
        testResults.goalCount = goals?.length || 0;
      }

      // Test Edge Functions
      try {
        const { data, error } = await supabase.functions.invoke('get-partner-goals');
        if (error) {
          testResults.errors.push(`Edge Function: ${error.message}`);
        } else {
          testResults.edgeFunctions = true;
        }
      } catch (e: any) {
        testResults.errors.push(`Edge Function: ${e.message}`);
      }

      setResults(testResults);
      
      if (testResults.errors.length === 0) {
        toast.success("All tests passed!");
      } else {
        toast.error(`${testResults.errors.length} test(s) failed`);
      }
    } catch (error: any) {
      console.error('Test error:', error);
      testResults.errors.push(error.message);
      setResults(testResults);
      toast.error("Tests failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          System Check
        </CardTitle>
        <CardDescription>
          Test accountability partner features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTests} disabled={testing} className="w-full">
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Bug className="h-4 w-4 mr-2" />
              Run Tests
            </>
          )}
        </Button>

        {results && (
          <div className="space-y-3 pt-4 border-t">
            <TestResult label="Authentication" passed={results.auth} />
            <TestResult label="Profile Access" passed={results.profile} />
            <TestResult label="Partnership Access" passed={results.partnerships} />
            {results.partnershipCount !== undefined && (
              <p className="text-xs text-muted-foreground ml-6">
                Found {results.partnershipCount} partnership(s)
              </p>
            )}
            <TestResult label="Goals Access" passed={results.goals} />
            {results.goalCount !== undefined && (
              <p className="text-xs text-muted-foreground ml-6">
                Found {results.goalCount} goal(s)
              </p>
            )}
            {results.edgeFunctions !== undefined && (
              <TestResult label="Edge Functions" passed={results.edgeFunctions} />
            )}
            
            {results.errors.length > 0 && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm font-medium text-destructive mb-2">Errors:</p>
                {results.errors.map((error: string, idx: number) => (
                  <p key={idx} className="text-xs text-destructive/80">
                    • {error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TestResult({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      {passed ? (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Pass
        </Badge>
      ) : (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Fail
        </Badge>
      )}
    </div>
  );
}
