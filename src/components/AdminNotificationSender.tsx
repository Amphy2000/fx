import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export const AdminNotificationSender = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['push-stats'],
    queryFn: async () => {
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('id', { count: 'exact' })
        .eq('is_active', true);

      if (subError) throw subError;

      const { data: notifications, error: notifError } = await supabase
        .from('push_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (notifError) throw notifError;

      return {
        activeSubscriptions: subscriptions?.length || 0,
        recentNotifications: notifications || []
      };
    }
  });

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Please enter both title and message');
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: title.trim(),
          body: body.trim(),
          targetUsers: ['all']
        }
      });

      if (error) throw error;

      toast.success(`Notification sent to ${data.sentCount} users!`);
      setTitle("");
      setBody("");
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Subscribers
          </CardTitle>
          <CardDescription>
            Users who have enabled push notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats?.activeSubscriptions || 0}</div>
        </CardContent>
      </Card>

      {/* Send Notification Card */}
      <Card>
        <CardHeader>
          <CardTitle>Send Push Notification</CardTitle>
          <CardDescription>
            Send a notification to all active subscribers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Notification Title</Label>
            <Input
              id="title"
              placeholder="e.g., New Feature Available!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">{title.length}/50 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Notification Message</Label>
            <Textarea
              id="body"
              placeholder="e.g., Check out our new AI-powered trade analysis feature..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{body.length}/200 characters</p>
          </div>

          <Button
            onClick={handleSend}
            disabled={isSending || !title.trim() || !body.trim()}
            className="w-full"
          >
            <Send className="mr-2 h-4 w-4" />
            {isSending ? 'Sending...' : 'Send Notification'}
          </Button>
        </CardContent>
      </Card>

      {/* Notification History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>Last 5 sent notifications</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentNotifications && stats.recentNotifications.length > 0 ? (
            <div className="space-y-3">
              {stats.recentNotifications.map((notif: any) => (
                <div key={notif.id} className="border-b pb-3 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{notif.title}</p>
                      <p className="text-sm text-muted-foreground">{notif.body}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{new Date(notif.created_at).toLocaleDateString()}</p>
                      <p className="text-green-600">{notif.sent_count} sent</p>
                      {notif.failed_count > 0 && (
                        <p className="text-red-600">{notif.failed_count} failed</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No notifications sent yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
