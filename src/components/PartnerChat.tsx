import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mic, MicOff, Send, ThumbsUp, PartyPopper, Heart, Flame, MessageSquare, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { RealtimeChat } from "@/utils/RealtimeAudio";
import { AvatarImage, getDisplayName } from "@/components/AvatarImage";

const getAvatarColor = (userId: string) => {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

interface PartnerChatProps {
  partnershipId: string;
}

export default function PartnerChat({ partnershipId }: PartnerChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const realtimeChatRef = useRef<RealtimeChat | null>(null);

  useEffect(() => {
    loadMessages();
    getCurrentUser();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [partnershipId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('partner_messages')
        .select(`
          *,
          sender:profiles!partner_messages_sender_id_fkey(full_name, email, display_name, avatar_url),
          reactions:message_reactions(id, user_id, reaction_type)
        `)
        .eq('partnership_id', partnershipId)
        .eq('is_system', false) // Filter out system messages
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Mark messages as read when loading
      if (currentUserId) {
        await supabase.rpc('mark_messages_as_read', {
          p_partnership_id: partnershipId,
          p_user_id: currentUserId
        });
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error("Failed to load messages");
    }
  };

  const setupRealtimeSubscription = () => {
    // Subscribe to new messages
    const messageChannel = supabase
      .channel(`messages:${partnershipId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partner_messages',
          filter: `partnership_id=eq.${partnershipId}`
        },
        () => loadMessages()
      )
      .subscribe();

    // Subscribe to message reactions
    const reactionsChannel = supabase
      .channel(`reactions:${partnershipId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions'
        },
        () => loadMessages()
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel(`typing:${partnershipId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `partnership_id=eq.${partnershipId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { user_id, is_typing } = payload.new;
            if (user_id !== currentUserId) {
              setTypingUsers(prev => {
                const newSet = new Set(prev);
                if (is_typing) {
                  newSet.add(user_id);
                } else {
                  newSet.delete(user_id);
                }
                return newSet;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(typingChannel);
    };
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateTypingStatus = async (isTyping: boolean) => {
    try {
      await supabase
        .from('typing_indicators')
        .upsert({
          partnership_id: partnershipId,
          user_id: currentUserId,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'partnership_id,user_id'
        });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Update typing indicator
    updateTypingStatus(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to clear typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 3000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    updateTypingStatus(false);

    try {
      const { error } = await supabase
        .from('partner_messages')
        .insert({
          partnership_id: partnershipId,
          sender_id: currentUserId,
          message_type: 'text',
          content: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleVoiceToggle = async () => {
    if (isVoiceActive) {
      realtimeChatRef.current?.disconnect();
      realtimeChatRef.current = null;
      setIsVoiceActive(false);
      toast.success("Voice chat ended");
    } else {
      try {
        // Check for microphone permission first
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permission.state === 'denied') {
          toast.error("Microphone access denied. Please enable it in your browser settings.");
          return;
        }

        toast.info("Connecting to voice chat...");
        realtimeChatRef.current = new RealtimeChat((event) => {
          console.log('Voice event:', event);
          // Handle voice events - could display transcripts, etc.
        });
        await realtimeChatRef.current.init();
        setIsVoiceActive(true);
        toast.success("Voice chat started - speak naturally!");
      } catch (error: any) {
        console.error('Error starting voice:', error);
        const errorMessage = error?.message || "Failed to start voice chat";
        toast.error(errorMessage);
        realtimeChatRef.current = null;
      }
    }
  };

  const handleReaction = async (messageId: string, reactionType: string) => {
    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: currentUserId,
          reaction_type: reactionType,
        });

      if (error) throw error;
      await loadMessages();
    } catch (error: any) {
      console.error('Error adding reaction:', error);
      toast.error("Failed to add reaction");
    }
  };

  const getReactionIcon = (type: string) => {
    const icons: Record<string, any> = {
      heart: Heart,
      fire: Flame,
      thumbs_up: ThumbsUp,
      celebrate: PartyPopper,
    };
    return icons[type] || Heart;
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from('partner_messages')
        .update({ content: newContent, updated_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', currentUserId);

      if (error) throw error;
      toast.success("Message updated");
      loadMessages();
    } catch (error: any) {
      console.error('Error editing message:', error);
      toast.error("Failed to edit message");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('partner_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', currentUserId);

      if (error) throw error;
      toast.success("Message deleted");
      loadMessages();
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast.error("Failed to delete message");
    }
  };

  const getAvatarColor = (userId: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-orange-500',
    ];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const MessageItem = ({ message }: { message: any }) => {
    const isOwn = message.sender_id === currentUserId;
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const avatarColor = getAvatarColor(message.sender_id);

    return (
      <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
        <AvatarImage
          avatarUrl={message.sender?.avatar_url}
          fallbackText={getDisplayName(message.sender)}
          className="h-8 w-8"
        />
        
        <div className={`flex-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
          {isEditing ? (
            <div className="flex gap-2 w-full">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => {
                  handleEditMessage(message.id, editContent);
                  setIsEditing(false);
                }}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <div className={`rounded-lg p-3 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <p className="text-sm">{message.content}</p>
                {message.updated_at !== message.created_at && (
                  <span className="text-xs opacity-70">(edited)</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </span>
                
                {!isOwn && (
                  <div className="flex gap-1">
                    {['heart', 'fire', 'thumbs_up'].map((type) => {
                      const Icon = getReactionIcon(type);
                      return (
                        <button
                          key={type}
                          onClick={() => handleReaction(message.id, type)}
                          className="p-1 hover:bg-muted rounded opacity-50 hover:opacity-100 transition-opacity"
                        >
                          <Icon className="h-3 w-3" />
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {isOwn && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 hover:bg-muted rounded opacity-50 hover:opacity-100 transition-opacity"
                    >
                      <MessageSquare className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="p-1 hover:bg-muted rounded opacity-50 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {message.reactions && message.reactions.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {Array.from(new Set(message.reactions.map((r: any) => r.reaction_type))).map((type: any) => {
                    const Icon = getReactionIcon(type);
                    const count = message.reactions.filter((r: any) => r.reaction_type === type).length;
                    return (
                      <Badge key={type} variant="secondary" className="text-xs">
                        <Icon className="h-3 w-3 mr-1" />
                        {count}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-[700px]">
      <CardHeader className="border-b shrink-0">
        <CardTitle className="flex items-center gap-2">
          Partner Chat
          {isVoiceActive && (
            <Badge variant="default" className="animate-pulse">
              Voice Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center py-12">
                <div>
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">No messages yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start the conversation with your partner!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))
            )}
            
            {typingUsers.size > 0 && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>...</AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4 shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Button
              type="button"
              variant={isVoiceActive ? "default" : "outline"}
              size="icon"
              onClick={handleVoiceToggle}
            >
              {isVoiceActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type a message..."
              disabled={sending || isVoiceActive}
            />
            <Button type="submit" disabled={sending || !newMessage.trim() || isVoiceActive}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}