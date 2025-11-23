import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ThumbsUp, PartyPopper, Heart, Flame, MessageSquare, Trash2, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { AvatarImage, getDisplayName } from "@/components/AvatarImage";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { VoiceMessagePlayer } from "@/components/VoiceMessagePlayer";

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
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

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

  const handleVoiceRecordingComplete = async (audioBlob: Blob, duration: number) => {
    setSending(true);
    setIsRecordingVoice(false);

    try {
      // Upload voice note to Supabase storage
      const fileName = `${currentUserId}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-notes')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get signed URL (valid for 7 days)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('voice-notes')
        .createSignedUrl(fileName, 604800); // 7 days in seconds

      if (urlError) throw urlError;

      // Send voice message
      const { error: messageError } = await supabase
        .from('partner_messages')
        .insert({
          partnership_id: partnershipId,
          sender_id: currentUserId,
          message_type: 'voice',
          content: 'Voice message',
          voice_url: urlData.signedUrl,
          voice_duration: duration,
        });

      if (messageError) throw messageError;
      toast.success("Voice note sent!");
    } catch (error: any) {
      console.error('Error sending voice note:', error);
      toast.error("Failed to send voice note");
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    }
    return format(date, 'dd/MM/yyyy HH:mm');
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

  const handleDeleteMessage = async (messageId: string, voiceUrl?: string) => {
    try {
      // If it's a voice message, delete the file from storage first
      if (voiceUrl) {
        // Extract file path from URL
        const urlParts = voiceUrl.split('/voice-notes/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1].split('?')[0]; // Remove query params
          await supabase.storage.from('voice-notes').remove([filePath]);
        }
      }

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
    const isVoice = message.message_type === 'voice';

    return (
      <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''} mb-2`}>
        <AvatarImage
          avatarUrl={message.sender?.avatar_url}
          fallbackText={getDisplayName(message.sender)}
          className="h-8 w-8 flex-shrink-0"
        />
        
        <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
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
              <div className={`rounded-2xl px-3 py-2 ${
                isOwn 
                  ? 'bg-primary text-primary-foreground rounded-br-sm' 
                  : 'bg-muted rounded-bl-sm'
              }`}>
                {isVoice && message.voice_url ? (
                  <VoiceMessagePlayer 
                    audioUrl={message.voice_url} 
                    duration={message.voice_duration || 0}
                  />
                ) : (
                  <p className="text-sm break-words">{message.content}</p>
                )}
                
                <div className={`flex items-center gap-1 mt-1 justify-end ${
                  isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  <span className="text-[10px]">
                    {formatMessageTime(new Date(message.created_at))}
                  </span>
                  {isOwn && (
                    <>
                      {message.read_at ? (
                        <CheckCheck className="h-3 w-3 text-blue-500" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </>
                  )}
                  {message.updated_at !== message.created_at && !isVoice && (
                    <span className="text-[10px]">(edited)</span>
                  )}
                </div>
              </div>
              
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {Array.from(new Set(message.reactions.map((r: any) => r.reaction_type))).map((type: any) => {
                    const Icon = getReactionIcon(type);
                    const count = message.reactions.filter((r: any) => r.reaction_type === type).length;
                    return (
                      <Badge key={type} variant="secondary" className="text-xs h-5 px-1.5">
                        <Icon className="h-2.5 w-2.5 mr-0.5" />
                        {count}
                      </Badge>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-1 mt-1">
                {!isVoice && !isOwn && (
                  <div className="flex gap-0.5">
                    {['heart', 'fire', 'thumbs_up'].map((type) => {
                      const Icon = getReactionIcon(type);
                      return (
                        <button
                          key={type}
                          onClick={() => handleReaction(message.id, type)}
                          className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity"
                        >
                          <Icon className="h-3 w-3" />
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {isOwn && (
                  <div className="flex gap-0.5">
                    {!isVoice && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMessage(message.id, message.voice_url)}
                      className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-[700px]">
      <CardHeader className="border-b shrink-0 py-3">
        <CardTitle className="text-base">Partner Chat</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0 bg-muted/20">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-1">
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
              <div className="space-y-1">
                {messages.map((message) => (
                  <div key={message.id} className="group">
                    <MessageItem message={message} />
                  </div>
                ))}
              </div>
            )}
            
            {typingUsers.size > 0 && (
              <div className="flex gap-2 mb-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>...</AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
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

        <div className="border-t p-3 shrink-0 bg-background">
          {isRecordingVoice ? (
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecordingComplete}
              onCancel={() => setIsRecordingVoice(false)}
            />
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
              <Input
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type a message..."
                disabled={sending}
                className="flex-1 rounded-full"
              />
              {!newMessage.trim() ? (
                <VoiceRecorder
                  onRecordingComplete={handleVoiceRecordingComplete}
                  onCancel={() => setIsRecordingVoice(false)}
                />
              ) : (
                <Button 
                  type="submit" 
                  disabled={sending || !newMessage.trim()}
                  size="icon"
                  className="rounded-full"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}