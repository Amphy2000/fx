import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PartnerFinder from "@/components/PartnerFinder";
import MyPartners from "@/components/MyPartners";
import AccountabilityProfileSetup from "@/components/AccountabilityProfileSetup";

export default function AccountabilityPartners() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("partners");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await checkProfile();
  };

  const checkProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('accountability_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setHasProfile(!!profile);
      if (!profile) {
        setActiveTab("setup");
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileCreated = () => {
    setHasProfile(true);
    setActiveTab("partners");
    toast.success("Profile created! Now you can find accountability partners.");
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Users className="h-10 w-10 text-primary" />
            Accountability Partners
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect with traders who share your goals and keep each other accountable
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="partners" disabled={!hasProfile}>
              <Users className="h-4 w-4 mr-2" />
              My Partners
            </TabsTrigger>
            <TabsTrigger value="find" disabled={!hasProfile}>
              <UserPlus className="h-4 w-4 mr-2" />
              Find Partners
            </TabsTrigger>
            <TabsTrigger value="setup">
              <Settings className="h-4 w-4 mr-2" />
              Profile Setup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="partners" className="mt-6">
            <MyPartners />
          </TabsContent>

          <TabsContent value="find" className="mt-6">
            <PartnerFinder />
          </TabsContent>

          <TabsContent value="setup" className="mt-6">
            <AccountabilityProfileSetup onProfileCreated={handleProfileCreated} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
