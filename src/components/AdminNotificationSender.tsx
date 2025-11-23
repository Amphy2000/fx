import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Send } from "lucide-react";

export const AdminNotificationSender = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [userSegment, setUserSegment] = useState("all");
  const [sending, setSending] = useState(false);

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSending(true);

    try {
      // Get all users or specific segment
      let query = supabase.from('profiles').select('id');
      
      if (userSegment === 'premium') {
        query = query.in('subscription_tier', ['monthly', 'lifetime']);
      } else if (userSegment === 'free') {
        query = query.eq('subscription_tier', 'free');
      }

      const { data: users, error: usersError } = await query;

      if (usersError) throw usersError;

      if (!users || users.length === 0) {
        toast.error("No users found for this segment");
        setSending(false);
        return;
      }

      // Create notifications for all users
      const notifications = users.map(user => ({
        user_id: user.id,
        title,
        message,
        type,
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      toast.success(`Notification sent to ${users.length} users!`);
      
      // Reset form
      setTitle("");
      setMessage("");
      setType("info");
      setUserSegment("all");
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error("Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Send Notification</CardTitle>
        </div>
        <CardDescription>
          Send notifications to users from the admin panel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Notification message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="segment">User Segment</Label>
            <Select value={userSegment} onValueChange={setUserSegment}>
              <SelectTrigger id="segment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="premium">Premium Only</SelectItem>
                <SelectItem value="free">Free Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleSendNotification} 
          disabled={sending}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {sending ? "Sending..." : "Send Notification"}
        </Button>
      </CardContent>
    </Card>
  );
};
