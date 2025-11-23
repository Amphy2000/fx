import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface GroupChatProps {
  groupId: string;
}

export default function GroupChat({ groupId }: GroupChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string>("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    getCurrentUser();
    
    const subscription = setupRealtimeSubscription();
    
    return () => {
      subscription.then(channel => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [groupId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          *,
          sender:sender_id (
            id,
            full_name,
            email
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error("Failed to load messages");
    }
  };

  const setupRealtimeSubscription = async () => {
    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`
      }, () => {
        loadMessages();
      })
      .subscribe();

    return channel;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          sender_id: userId,
          content: input.trim()
        });

      if (error) throw error;
      setInput("");
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Group Chat
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-[400px] overflow-y-auto space-y-4 p-4 border rounded-lg">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_id === userId;
                return (
                  <div key={message.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {message.sender?.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {message.sender?.full_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.created_at), 'p')}
                        </span>
                      </div>
                      <div className={`rounded-lg px-4 py-2 max-w-md ${
                        isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {message.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={sending}
            />
            <Button onClick={handleSendMessage} disabled={sending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
