import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ArrowRight } from "lucide-react";
import { AvatarImage, getDisplayName } from "@/components/AvatarImage";
import { supabase } from "@/integrations/supabase/client";

interface PartnerChatListProps {
  partnerships: any[];
  unreadCounts: Record<string, number>;
  currentUserId: string | null;
  onSelectPartner: (partnershipId: string) => void;
}

export default function PartnerChatList({ 
  partnerships, 
  unreadCounts, 
  currentUserId,
  onSelectPartner 
}: PartnerChatListProps) {
  
  const handlePartnerClick = async (partnershipId: string) => {
    // Mark messages as read
    if (currentUserId) {
      try {
        await supabase.rpc('mark_messages_as_read', {
          p_partnership_id: partnershipId,
          p_user_id: currentUserId
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
    
    onSelectPartner(partnershipId);
  };

  if (partnerships.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No partners to chat with yet.</p>
          <p className="text-sm text-muted-foreground mt-2">Find a partner in the "Find" tab!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Your Conversations</h2>
        <Badge variant="secondary" className="ml-auto">
          {partnerships.length} {partnerships.length === 1 ? 'Partner' : 'Partners'}
        </Badge>
      </div>
      
      {partnerships.map((partnership) => {
        const isInitiator = partnership.user_id === partnership.currentUserId;
        const partnerProfile = isInitiator ? partnership.partner_profile : partnership.user_profile;
        const partnerName = getDisplayName(partnerProfile);
        const unreadCount = unreadCounts[partnership.id] || 0;
        
        return (
          <Card 
            key={partnership.id}
            className="border-border/50 hover:border-primary/50 transition-all cursor-pointer group"
            onClick={() => handlePartnerClick(partnership.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <AvatarImage 
                  avatarUrl={partnerProfile?.avatar_url}
                  fallbackText={partnerName}
                  className="h-12 w-12"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg truncate">{partnerName}</h3>
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full text-xs"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    Accountability Partner
                  </p>
                </div>
                
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
