import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Check, X, Users, Clock, Calendar, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { AvatarImage, getDisplayName } from "@/components/AvatarImage";

export default function MyPartners({ onPartnerAccepted }: { onPartnerAccepted?: (partnershipId: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [activePartnerships, setActivePartnerships] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);

  useEffect(() => {
    loadPartnerships();
  }, []);

  const loadPartnerships = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load active partnerships
      const { data: active } = await supabase
        .from('accountability_partnerships')
        .select(`
          *,
          partner_profile:profiles!accountability_partnerships_partner_id_fkey(full_name, email, display_name, avatar_url),
          user_profile:profiles!accountability_partnerships_user_id_fkey(full_name, email, display_name, avatar_url)
        `)
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq('status', 'active');

      // Add userId to each partnership for easier access
      const activeWithUserId = active?.map(p => ({ ...p, currentUserId: user.id })) || [];
      setActivePartnerships(activeWithUserId);

      // Load pending requests (received)
      const { data: pending } = await supabase
        .from('accountability_partnerships')
        .select(`
          *,
          user_profile:profiles!accountability_partnerships_user_id_fkey(full_name, email, display_name, avatar_url)
        `)
        .eq('partner_id', user.id)
        .eq('status', 'pending');

      setPendingRequests(pending || []);

      // Load sent requests
      const { data: sent } = await supabase
        .from('accountability_partnerships')
        .select(`
          *,
          partner_profile:profiles!accountability_partnerships_partner_id_fkey(full_name, email, display_name, avatar_url)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending');

      setSentRequests(sent || []);
    } catch (error) {
      console.error('Error loading partnerships:', error);
      toast.error("Failed to load partnerships");
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToRequest = async (partnershipId: string, action: 'accept' | 'reject') => {
    try {
      const { error } = await supabase.functions.invoke('respond-partner-request', {
        body: { partnership_id: partnershipId, action }
      });

      if (error) throw error;
      
      if (action === 'accept') {
        toast.success("Partnership accepted! Click below to start chatting.", {
          action: onPartnerAccepted ? {
            label: "Go to Chat",
            onClick: () => onPartnerAccepted(partnershipId)
          } : undefined,
          duration: 5000,
        });
      } else {
        toast.success("Request declined");
      }
      
      loadPartnerships();
    } catch (error: any) {
      console.error('Error responding to request:', error);
      toast.error(error.message || "Failed to respond to request");
    }
  };

  const getPartnerInfo = (partnership: any) => {
    const isInitiator = partnership.user_id === partnership.currentUserId;
    const partnerProfile = isInitiator ? partnership.partner_profile : partnership.user_profile;
    return partnerProfile;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="active">
          Active ({activePartnerships.length})
        </TabsTrigger>
        <TabsTrigger value="pending">
          Requests ({pendingRequests.length})
        </TabsTrigger>
        <TabsTrigger value="sent">
          Sent ({sentRequests.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-6">
        {activePartnerships.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active partnerships yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Find partners in the "Find Partners" tab!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activePartnerships.map((partnership) => {
              const partnerInfo = getPartnerInfo(partnership);
              return (
                <Card key={partnership.id}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <AvatarImage
                        avatarUrl={partnerInfo?.avatar_url}
                        fallbackText={getDisplayName(partnerInfo)}
                        className="h-12 w-12"
                      />
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {getDisplayName(partnerInfo)}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3" />
                          Since {format(new Date(partnership.accepted_at), "MMM d, yyyy")}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          const partnerInfo = getPartnerInfo(partnership);
                          const partnerUserId = partnership.user_id === partnership.currentUserId 
                            ? partnership.partner_id 
                            : partnership.user_id;
                          window.location.href = `/partner-summary?partnerId=${partnerUserId}`;
                        }}
                      >
                        View Summary
                      </Button>
                      <Button 
                        variant="default" 
                        className="flex-1"
                        onClick={() => onPartnerAccepted?.(partnership.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="pending" className="mt-6">
        {pendingRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No pending requests.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => {
              const requesterInfo = request.user_profile;
              return (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <AvatarImage
                          avatarUrl={requesterInfo?.avatar_url}
                          fallbackText={getDisplayName(requesterInfo)}
                          className="h-12 w-12"
                        />
                        <div>
                          <CardTitle className="text-lg">
                            {getDisplayName(requesterInfo)}
                          </CardTitle>
                          <CardDescription>
                            Sent {format(new Date(request.created_at), "MMM d")}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {request.request_message && (
                      <p className="text-sm text-muted-foreground italic">
                        "{request.request_message}"
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => handleRespondToRequest(request.id, 'accept')}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRespondToRequest(request.id, 'reject')}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="sent" className="mt-6">
        {sentRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No sent requests.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sentRequests.map((request) => {
              const partnerInfo = request.partner_profile;
              return (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <AvatarImage
                          avatarUrl={partnerInfo?.avatar_url}
                          fallbackText={getDisplayName(partnerInfo)}
                          className="h-12 w-12"
                        />
                        <div>
                          <CardTitle className="text-lg">
                            {getDisplayName(partnerInfo)}
                          </CardTitle>
                          <CardDescription>
                            Sent {format(new Date(request.created_at), "MMM d")}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">Awaiting Response</Badge>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
