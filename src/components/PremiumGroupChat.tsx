import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AvatarImage, getDisplayName } from "@/components/AvatarImage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Send, Smile, Search, MoreVertical, 
  Edit2, Trash2, Reply, Check, CheckCheck,
  X 
} from "lucide-react";
import { VoiceRecorder } from "./VoiceRecorder";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";
import { formatDistanceToNow, format } from "date-fns";
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

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  updated_at: string;
  sender: any;
  is_edited?: boolean;
  reply_to_id?: string;
  reply_to?: Message;
  metadata?: any;
  attachment_url?: string;
  attachment_type?: string;
}

interface PremiumGroupChatProps {
  groupId: string;
}

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥"];

export default function PremiumGroupChat({ groupId }: PremiumGroupChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
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
  }, [groupId]);

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
        .from('group_messages')
        .select(`
          *,
          sender:profiles!group_messages_sender_id_fkey(
            id,
            full_name,
            email,
            display_name,
            avatar_url
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error("Failed to load messages");
    }
  };

  const setupRealtimeSubscription = async () => {
    const channel = supabase
      .channel(`premium-group-${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`
      }, () => {
        loadMessages();
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing = new Set<string>();
        const online = new Set<string>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id !== currentUserId) {
              online.add(presence.user_id);
              if (presence.typing) {
                typing.add(presence.user_name || 'Someone');
              }
            }
          });
        });
        
        setTypingUsers(typing);
        setOnlineUsers(online);
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

  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const channel = supabase.channel(`premium-group-${groupId}`);
    channel.track({
      user_id: currentUserId,
      user_name: 'User',
      typing: true,
    });

    typingTimeoutRef.current = setTimeout(() => {
      channel.track({
        user_id: currentUserId,
        typing: false,
      });
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const messageData: any = {
        group_id: groupId,
        sender_id: currentUserId,
        content: newMessage.trim()
      };

      if (replyingTo) {
        messageData.reply_to_id = replyingTo.id;
      }

      const { error } = await supabase
        .from('group_messages')
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

      const reactions = (message.metadata as any)?.reactions || [];
      const existingReaction = reactions.find((r: any) => r.emoji === emoji);

      let updatedReactions;
      if (existingReaction) {
        if (existingReaction.user_ids.includes(currentUserId!)) {
          // Remove reaction
          existingReaction.user_ids = existingReaction.user_ids.filter((id: string) => id !== currentUserId);
          if (existingReaction.user_ids.length === 0) {
            updatedReactions = reactions.filter((r: any) => r.emoji !== emoji);
          } else {
            updatedReactions = reactions;
          }
        } else {
          // Add user to existing reaction
          existingReaction.user_ids.push(currentUserId!);
          updatedReactions = reactions;
        }
      } else {
        // Add new reaction
        updatedReactions = [...reactions, { emoji, user_ids: [currentUserId!] }];
      }

      const { error } = await supabase
        .from('group_messages')
        .update({ 
          metadata: { 
            ...((message.metadata as any) || {}),
            reactions: updatedReactions 
          }
        } as any)
        .eq('id', messageId);

      if (error) throw error;
      loadMessages();
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error("Failed to add reaction");
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editingContent.trim()) return;

    try {
      const { error } = await supabase
        .from('group_messages')
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

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('group_messages')
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

  const MessageItem = ({ message }: { message: Message }) => {
    const isOwnMessage = message.sender_id === currentUserId;
    const isEditing = editingMessageId === message.id;
    const senderName = getDisplayName(message.sender);
    const reactions = (message.metadata as any)?.reactions || [];
    const readBy = (message.metadata as any)?.read_by || [];
    const isRead = readBy.includes(currentUserId!);

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
              <div className="font-medium">{getDisplayName(message.reply_to.sender)}</div>
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
                {(message.metadata as any)?.type === 'voice' ? (
                  <VoiceMessagePlayer 
                    audioUrl={(message.metadata as any)?.voice_url} 
                    duration={(message.metadata as any)?.voice_duration}
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
                      <span className="text-xs">{reaction.user_ids.length}</span>
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

          {isOwnMessage && (
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
                  onClick={() => handleDeleteMessage(message.id)}
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
    <Card className="border-border/50 shadow-lg">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-muted/30">
        <div>
          <h3 className="font-semibold">Group Chat</h3>
          <p className="text-xs text-muted-foreground">
            {onlineUsers.size} online • {messages.length} messages
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSearch(!showSearch)}
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
              <p className="text-xs font-medium">Replying to {getDisplayName(replyingTo.sender)}</p>
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
            <VoiceRecorder
              onRecordingComplete={async (audioBlob: Blob, duration: number) => {
                try {
                  const fileName = `${groupId}/${Date.now()}.webm`;
                  
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
                    .from('group_messages')
                    .insert({
                      group_id: groupId,
                      sender_id: currentUserId,
                      content: `Voice message (${duration}s)`,
                      metadata: { voice_url: publicUrl, voice_duration: duration, type: 'voice' }
                    });

                  if (insertError) throw insertError;
                } catch (error) {
                  console.error('Error sending voice message:', error);
                  toast.error("Failed to send voice message");
                }
              }}
              onCancel={() => {}}
            />
            
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
          accept="image/*,application/pdf"
        />
      </CardContent>
    </Card>
  );
}
