import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Send, Smile, Trash2, Edit2, Reply, Check, CheckCheck,
  MoreVertical, Search, X, Paperclip 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VoiceRecorder } from "./VoiceRecorder";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";
import { AvatarImage, getDisplayName } from "./AvatarImage";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥"];

interface PartnerChatProps {
  partnershipId: string;
  onBack?: () => void;
}

export default function PartnerChat({ partnershipId, onBack }: PartnerChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    getCurrentUser();
    const subscription = setupRealtimeSubscription();
    
    return () => {
      subscription.then(channel => {
        if (channel) supabase.removeChannel(channel);
      });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [partnershipId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
          sender:profiles!partner_messages_sender_id_fkey(
            id,
            full_name,
            email,
            display_name,
            avatar_url
          ),
          reactions:partner_message_reactions(
            id,
            user_id,
            emoji
          )
        `)
        .eq('partnership_id', partnershipId)
        .eq('is_system', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Mark messages as read
      if (currentUserId) {
        const unreadMessages = data?.filter(m => 
          m.sender_id !== currentUserId && !m.read_at
        );
        
        if (unreadMessages && unreadMessages.length > 0) {
          await supabase
            .from('partner_messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadMessages.map(m => m.id));
        }
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error("Failed to load messages");
    }
  };

  const setupRealtimeSubscription = async () => {
    const channel = supabase
      .channel(`partner-chat-${partnershipId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'partner_messages',
        filter: `partnership_id=eq.${partnershipId}`
      }, () => {
        loadMessages();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'partner_message_reactions'
      }, () => {
        loadMessages();
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing = new Set<string>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id !== currentUserId && presence.typing) {
              typing.add(presence.user_name || 'Partner');
            }
          });
        });
        
        setTypingUsers(typing);
      })
      .subscribe();

    // Track user presence
    if (currentUserId) {
      channel.track({
        user_id: currentUserId,
        online_at: new Date().toISOString(),
      });
    }

    return channel;
  };

  const handleTyping = async () => {
    const channel = supabase.channel(`partner-chat-${partnershipId}`);
    
    await channel.track({
      user_id: currentUserId,
      user_name: 'You',
      online_at: new Date().toISOString(),
      typing: true
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      await channel.track({
        user_id: currentUserId,
        user_name: 'You',
        online_at: new Date().toISOString(),
        typing: false
      });
    }, 3000);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const messageData: any = {
        partnership_id: partnershipId,
        sender_id: currentUserId,
        content: newMessage.trim(),
        message_type: 'text'
      };

      if (replyingTo) {
        messageData.reply_to_id = replyingTo.id;
      }

      const { error } = await supabase
        .from('partner_messages')
        .insert(messageData);

      if (error) throw error;
      
      setNewMessage("");
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      // Check if user already reacted with this emoji
      const existingReaction = message.reactions?.find(
        (r: any) => r.user_id === currentUserId && r.emoji === emoji
      );

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('partner_message_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('partner_message_reactions')
          .insert({
            message_id: messageId,
            user_id: currentUserId!,
            emoji: emoji
          });

        if (error) throw error;
      }
      
      await loadMessages();
    } catch (error: any) {
      console.error('Error adding reaction:', error);
      toast.error("Failed to add reaction");
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editingContent.trim()) return;

    try {
      const { error } = await supabase
        .from('partner_messages')
        .update({ 
          content: editingContent.trim(),
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;

      setEditingMessageId(null);
      setEditingContent("");
      loadMessages();
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error("Failed to edit message");
    }
  };

  const handleDeleteMessage = async (messageId: string, voiceUrl?: string, attachmentUrl?: string) => {
    try {
      // Delete voice file if exists
      if (voiceUrl) {
        const filePath = voiceUrl.split('/voice-messages/').pop()?.split('?')[0];
        if (filePath) {
          await supabase.storage.from('voice-messages').remove([filePath]);
        }
      }

      // Delete attachment file if exists
      if (attachmentUrl) {
        const filePath = attachmentUrl.split('/chat-attachments/').pop()?.split('?')[0];
        if (filePath) {
          await supabase.storage.from('chat-attachments').remove([filePath]);
        }
      }

      const { error } = await supabase
        .from('partner_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      loadMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error("Failed to delete message");
    }
  };

  const filteredMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const MessageItem = ({ message }: { message: any }) => {
    const isOwnMessage = message.sender_id === currentUserId;
    const isEditing = editingMessageId === message.id;
    const senderName = getDisplayName(message.sender);
    
    // Group reactions by emoji
    const groupedReactions = (message.reactions || []).reduce((acc: any, reaction: any) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = { emoji: reaction.emoji, user_ids: [], count: 0 };
      }
      acc[reaction.emoji].user_ids.push(reaction.user_id);
      acc[reaction.emoji].count++;
      return acc;
    }, {});
    
    const reactions = Object.values(groupedReactions);
    const isRead = message.read_at !== null;
    const isVoice = message.message_type === 'voice';

    return (
      <div className={`flex gap-2 group hover:bg-muted/30 -mx-2 px-2 py-1 rounded-lg transition-colors ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
        <AvatarImage 
          avatarUrl={message.sender?.avatar_url}
          fallbackText={senderName}
          className="h-8 w-8 flex-shrink-0"
        />

        <div className={`flex-1 space-y-1 ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col max-w-[75%]`}>
          <div className={`flex items-center gap-2 text-xs ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
            <span className="font-medium text-foreground">
              {senderName}
            </span>
            <span className="text-muted-foreground">
              {format(new Date(message.created_at), 'p')}
            </span>
            {message.is_edited && (
              <span className="text-muted-foreground italic">(edited)</span>
            )}
          </div>

          {message.reply_to && (
            <div className={`text-xs p-2 rounded bg-muted/50 border-l-2 border-primary mb-1 ${isOwnMessage ? 'ml-auto' : ''}`}>
              <div className="text-muted-foreground truncate">{message.reply_to.content}</div>
            </div>
          )}

          {isEditing ? (
            <div className="w-full space-y-2">
              <Textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                className="min-h-[60px] text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleEditMessage(message.id)}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingMessageId(null);
                    setEditingContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-1">
              <div
                className={`rounded-2xl px-4 py-2 relative group/message ${
                  isOwnMessage
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {isVoice && message.voice_url ? (
                  <VoiceMessagePlayer 
                    audioUrl={message.voice_url} 
                    duration={message.voice_duration}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                )}
                
                {isOwnMessage && (
                  <div className="absolute -bottom-1 right-2 flex items-center gap-0.5">
                    {isRead ? (
                      <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                    ) : (
                      <Check className="h-3 w-3 text-primary-foreground/70" />
                    )}
                  </div>
                )}
              </div>

              {/* Attachment preview */}
              {message.attachment_url && message.attachment_type && (
                <div className="mt-2">
                  {message.attachment_type.startsWith('image/') ? (
                    <img 
                      src={message.attachment_url} 
                      alt={message.attachment_name || 'Attachment'}
                      className="max-w-sm rounded-lg cursor-pointer"
                      onClick={() => window.open(message.attachment_url, '_blank')}
                    />
                  ) : (
                    <a 
                      href={message.attachment_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-muted rounded-lg hover:bg-muted/80"
                    >
                      <div className="text-xs">📎 {message.attachment_name || 'File'}</div>
                    </a>
                  )}
                </div>
              )}

              {/* Reactions */}
              {reactions && reactions.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {reactions.map((reaction: any) => (
                    <button
                      key={reaction.emoji}
                      onClick={() => handleReaction(message.id, reaction.emoji)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                        reaction.user_ids.includes(currentUserId!)
                          ? 'bg-primary/20 border border-primary/50'
                          : 'bg-muted border border-border'
                      }`}
                    >
                      <span>{reaction.emoji}</span>
                      <span className="text-xs">{reaction.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message actions */}
        <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-1 ${isOwnMessage ? 'order-first' : ''}`}>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Smile className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="top">
              <div className="flex gap-1">
                {EMOJI_LIST.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(message.id, emoji)}
                    className="hover:bg-muted p-1.5 rounded text-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setReplyingTo(message)}
          >
            <Reply className="h-3.5 w-3.5" />
          </Button>

          {isOwnMessage && !isVoice && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setEditingMessageId(message.id);
                  setEditingContent(message.content);
                }}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteMessage(message.id, message.voice_url, message.attachment_url)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border/50 shadow-2xl bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="mr-2 hover:bg-primary/10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h3 className="font-semibold text-lg bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Partner Chat</h3>
            <p className="text-xs text-muted-foreground">
              {messages.length} messages
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSearch(!showSearch)}
          className="hover:bg-primary/10"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="p-2 border-b">
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
        </div>
      )}

      <CardContent className="p-0">
        {/* Messages */}
        <div className="h-[500px] overflow-y-auto p-4 space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Send className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground font-medium">No messages yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start the conversation!
                </p>
              </div>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="px-4 py-2 text-sm text-muted-foreground italic flex items-center gap-2 border-t">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            {Array.from(typingUsers).join(", ")} {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {/* Reply preview */}
        {replyingTo && (
          <div className="px-4 py-2 border-t bg-muted/50 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium">Replying to message</p>
              <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2 items-end">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-11 w-11 p-0"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <VoiceRecorder
                onRecordingComplete={async (audioBlob: Blob, duration: number) => {
                  try {
                    const fileName = `${currentUserId}/${partnershipId}/${Date.now()}.webm`;
                    
                    const { error: uploadError } = await supabase.storage
                      .from('voice-messages')
                      .upload(fileName, audioBlob, {
                        contentType: 'audio/webm',
                      });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                      .from('voice-messages')
                      .getPublicUrl(fileName);

                    const { error: insertError } = await supabase
                      .from('partner_messages')
                      .insert({
                        partnership_id: partnershipId,
                        sender_id: currentUserId,
                        content: `Voice message (${duration}s)`,
                        message_type: 'voice',
                        voice_url: publicUrl,
                        voice_duration: duration
                      });

                    if (insertError) throw insertError;
                  } catch (error) {
                    console.error('Error sending voice message:', error);
                    toast.error("Failed to send voice message");
                  }
                }}
                onCancel={() => {}}
              />
            </div>
            
            <Textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              disabled={sending}
              className="min-h-[44px] max-h-[120px] resize-none flex-1"
            />
            
            <Button 
              onClick={handleSendMessage} 
              disabled={sending || !newMessage.trim()}
              size="icon"
              className="h-11 w-11 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
              const fileName = `${currentUserId}/${partnershipId}/${Date.now()}_${file.name}`;
              
              const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(fileName, file);

              if (uploadError) throw uploadError;

              const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(fileName);

              const { error: insertError } = await supabase
                .from('partner_messages')
                .insert({
                  partnership_id: partnershipId,
                  sender_id: currentUserId,
                  content: file.name,
                  message_type: 'text',
                  attachment_url: publicUrl,
                  attachment_type: file.type,
                  attachment_name: file.name
                });

              if (insertError) throw insertError;
              
              toast.success("File uploaded successfully");
              e.target.value = ''; // Reset input
            } catch (error) {
              console.error('Error uploading file:', error);
              toast.error("Failed to upload file");
            }
          }}
        />
      </CardContent>
    </Card>
  );
}
