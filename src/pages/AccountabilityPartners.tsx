import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Settings, Target, TrendingUp, MessageSquare, UsersRound, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AvatarImage, getDisplayName } from "@/components/AvatarImage";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import PartnerFinder from "@/components/PartnerFinder";
import MyPartners from "@/components/MyPartners";
import AccountabilityProfileSetup from "@/components/AccountabilityProfileSetup";
import WeeklyCommitments from "@/components/WeeklyCommitments";
import PartnerActivityFeed from "@/components/PartnerActivityFeed";
import AccountabilityDebug from "@/components/AccountabilityDebug";
import AccountabilityAnalytics from "@/components/AccountabilityAnalytics";
import PartnerChat from "@/components/PartnerChat";
import PartnerChatList from "@/components/PartnerChatList";
import AccountabilityGroups from "@/components/AccountabilityGroups";
import AccountabilityChallenges from "@/components/AccountabilityChallenges";
import PartnershipLeaderboard from "@/components/PartnershipLeaderboard";
import AdminRoleManager from "@/components/AdminRoleManager";
import TestPartnerSetup from "@/components/TestPartnerSetup";

export default function AccountabilityPartners() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("partners");
  const [activePartnerships, setActivePartnerships] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPartnershipId, setSelectedPartnershipId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const { unreadCounts, totalUnread } = useUnreadMessages(currentUserId);

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
      
      setCurrentUserId(user.id);

      // Check if user is admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!adminRole);

      const { data: profile } = await supabase
        .from('accountability_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setHasProfile(!!profile);
      if (!profile) {
        setActiveTab("setup");
      }

      // Load active partnerships with profiles
      const { data: partnerships } = await supabase
        .from('accountability_partnerships')
        .select(`
          *,
          partner_profile:profiles!accountability_partnerships_partner_id_fkey(full_name, email, display_name, avatar_url),
          user_profile:profiles!accountability_partnerships_user_id_fkey(full_name, email, display_name, avatar_url)
        `)
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq('status', 'active');
      
      // Add current user ID to each partnership for easier reference
      const partnershipsWithUserId = partnerships?.map(p => ({
        ...p,
        currentUserId: user.id
      })) || [];
      
      setActivePartnerships(partnershipsWithUserId);
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

  const handleSelectPartner = (partnershipId: string) => {
    setSelectedPartnershipId(partnershipId);
    setIsChatOpen(true);
  };

  const handleBackToList = () => {
    setIsChatOpen(false);
    setSelectedPartnershipId(null);
  };

  // Reset chat state when switching away from chat tab
  useEffect(() => {
    if (activeTab !== "chat") {
      setIsChatOpen(false);
    }
  }, [activeTab]);

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
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="partners" disabled={!hasProfile}>
              <Users className="h-4 w-4 mr-2" />
              Partners
            </TabsTrigger>
            <TabsTrigger value="groups" disabled={!hasProfile}>
              <UsersRound className="h-4 w-4 mr-2" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="goals" disabled={!hasProfile || (activePartnerships.length === 0 && !isAdmin)} title={!hasProfile ? "Create a profile first" : (activePartnerships.length === 0 && !isAdmin) ? "Connect with a partner first (or get admin access)" : ""}>
              <Target className="h-4 w-4 mr-2" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="challenges" disabled={!hasProfile}>
              <Trophy className="h-4 w-4 mr-2" />
              Challenges
            </TabsTrigger>
            <TabsTrigger value="chat" disabled={!hasProfile || (activePartnerships.length === 0 && !isAdmin)} title={!hasProfile ? "Create a profile first" : (activePartnerships.length === 0 && !isAdmin) ? "Connect with a partner first (or get admin access)" : ""}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
              {totalUnread > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="find" disabled={!hasProfile}>
              <UserPlus className="h-4 w-4 mr-2" />
              Find
            </TabsTrigger>
            <TabsTrigger value="leaderboard" disabled={!hasProfile}>
              <Trophy className="h-4 w-4 mr-2" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="analytics" disabled={!hasProfile || (activePartnerships.length === 0 && !isAdmin)} title={!hasProfile ? "Create a profile first" : (activePartnerships.length === 0 && !isAdmin) ? "Connect with a partner first (or get admin access)" : ""}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="setup">
              <Settings className="h-4 w-4 mr-2" />
              Setup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="partners" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MyPartners />
              </div>
              <div>
                <PartnerActivityFeed />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="mt-6">
            {activePartnerships.length > 0 ? (
              <WeeklyCommitments partnershipId={activePartnerships[0].id} />
            ) : isAdmin ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">⚡ Admin Mode: Normally requires an active partnership</p>
                <p className="text-sm">Create a partnership in the Find tab to use goals feature</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                You need an active partnership to create goals
              </div>
            )}
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            {activePartnerships.length > 0 ? (
              isChatOpen && selectedPartnershipId ? (
                <PartnerChat 
                  partnershipId={selectedPartnershipId}
                  onBack={handleBackToList}
                />
              ) : (
                <PartnerChatList
                  partnerships={activePartnerships}
                  unreadCounts={unreadCounts}
                  currentUserId={currentUserId}
                  onSelectPartner={handleSelectPartner}
                />
              )
            ) : isAdmin ? (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-2">⚡ Admin Mode: Normally requires an active partnership</p>
                  <p className="text-sm text-muted-foreground">Create a partnership to access this feature</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">You need an active partnership to access chat.</p>
                  <p className="text-sm text-muted-foreground mt-2">Find a partner in the "Find Partners" tab!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            <AccountabilityGroups />
          </TabsContent>

          <TabsContent value="challenges" className="mt-6">
            <AccountabilityChallenges />
          </TabsContent>

          <TabsContent value="find" className="mt-6">
            <PartnerFinder />
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-6">
            <PartnershipLeaderboard />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {activePartnerships.length > 0 ? (
              <AccountabilityAnalytics partnershipId={activePartnerships[0].id} />
            ) : isAdmin ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">⚡ Admin Mode: Normally requires an active partnership</p>
                <p className="text-sm">Create a partnership in the Find tab to view analytics</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Connect with a partner to view analytics
              </div>
            )}
          </TabsContent>

          <TabsContent value="setup" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AccountabilityProfileSetup onProfileCreated={handleProfileCreated} />
              </div>
              <div className="space-y-6">
                <AdminRoleManager />
                <TestPartnerSetup />
                <AccountabilityDebug />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
