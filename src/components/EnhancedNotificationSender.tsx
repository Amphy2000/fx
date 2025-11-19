import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Clock, Target, Zap, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ActionButton {
  action: string;
  title: string;
  url?: string;
}

export const EnhancedNotificationSender = () => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [userSegment, setUserSegment] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [actionButtons, setActionButtons] = useState<ActionButton[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const { data: templates } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['push-stats'],
    queryFn: async () => {
      // Count unique users with active subscriptions
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .eq('is_active', true);

      // Get unique user count
      const uniqueUsers = new Set(subscriptions?.map(s => s.user_id) || []);

      const { data: notifications } = await supabase
        .from('push_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      return {
        activeSubscriptions: uniqueUsers.size,
        recentNotifications: notifications || []
      };
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('push_notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-stats'] });
      toast.success('Notification deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete notification');
    }
  });

  const { data: usersWithPush } = useQuery({
    queryKey: ['users-with-push'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .eq('is_active', true);
      
      if (error) throw error;
      
      const uniqueUserIds = [...new Set(data.map(s => s.user_id))];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', uniqueUserIds);
      
      if (profilesError) throw profilesError;
      
      return profiles;
    }
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setTitle(template.title);
      setBody(template.body);
    }
  };

  const addActionButton = () => {
    if (actionButtons.length < 2) {
      setActionButtons([...actionButtons, { action: '', title: '', url: '' }]);
    }
  };

  const removeActionButton = (index: number) => {
    setActionButtons(actionButtons.filter((_, i) => i !== index));
  };

  const updateActionButton = (index: number, field: keyof ActionButton, value: string) => {
    const updated = [...actionButtons];
    updated[index] = { ...updated[index], [field]: value };
    setActionButtons(updated);
  };

  const handleSendNow = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Please enter both title and message');
      return;
    }

    if (userSegment === 'specific' && selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setIsSending(true);
    try {
      console.log('Sending notification...', { title, body, userSegment, selectedUsers });
      
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: title.trim(),
          body: body.trim(),
          userSegment: userSegment,
          targetUsers: userSegment === 'specific' ? selectedUsers : undefined,
          templateId: selectedTemplate || null,
          actionButtons: actionButtons.filter(b => b.action && b.title).length > 0 
            ? JSON.parse(JSON.stringify(actionButtons.filter(b => b.action && b.title)))
            : null
        }
      });

      console.log('Response:', { data, error });

      if (error) {
        console.error('Function invocation error:', error);
        throw new Error(error.message || 'Failed to send notification');
      }

      if (!data) {
        throw new Error('No response data from notification service');
      }

      if (data.sentCount === 0 && data.totalSubscriptions === 0) {
        toast.error('No active subscribers found for this segment');
        return;
      }

      toast.success(`Notification sent to ${data.sentCount} users!`);
      resetForm();
      
      // Refetch stats
      queryClient.invalidateQueries({ queryKey: ['push-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-notifications'] });
    } catch (error: any) {
      console.error('Error sending notification:', error);
      const errorMessage = error?.message || error?.details || 'Failed to send notification';
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!title.trim() || !body.trim() || !scheduledFor) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to schedule notifications');
        return;
      }

      const { error } = await supabase
        .from('scheduled_notifications')
        .insert([{
          title: title.trim(),
          body: body.trim(),
          user_segment: userSegment,
          scheduled_for: scheduledFor,
          recurrence: recurrence || null,
          template_id: selectedTemplate || null,
          action_buttons: actionButtons.filter(b => b.action && b.title).length > 0 
            ? JSON.parse(JSON.stringify(actionButtons.filter(b => b.action && b.title)))
            : null,
          created_by: user.id
        }]);

      if (error) throw error;

      toast.success('Notification scheduled successfully!');
      resetForm();
    } catch (error) {
      console.error('Error scheduling notification:', error);
      toast.error('Failed to schedule notification');
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setBody("");
    setUserSegment("all");
    setSelectedTemplate("");
    setScheduledFor("");
    setRecurrence("");
    setActionButtons([]);
    setSelectedUsers([]);
  };

  const [subscriptionCount, setSubscriptionCount] = useState<number>(0);

  useEffect(() => {
    const updateCount = async () => {
      if (userSegment === 'specific' && selectedUsers.length > 0) {
        const { count } = await supabase
          .from('push_subscriptions')
          .select('*', { count: 'exact', head: true })
          .in('user_id', selectedUsers)
          .eq('is_active', true);
        setSubscriptionCount(count || 0);
      } else {
        const total = stats?.activeSubscriptions || 0;
        let count = total;
        switch (userSegment) {
          case 'free': count = Math.floor(total * 0.7); break;
          case 'monthly': count = Math.floor(total * 0.2); break;
          case 'lifetime': count = Math.floor(total * 0.1); break;
        }
        setSubscriptionCount(count);
      }
    };
    updateCount();
  }, [userSegment, selectedUsers, stats]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.recentNotifications?.reduce((sum, n) => sum + (n.sent_count || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg. Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.recentNotifications?.length 
                ? Math.round(
                    (stats.recentNotifications.reduce((sum, n) => sum + (n.opened_count || 0), 0) / 
                    stats.recentNotifications.reduce((sum, n) => sum + (n.sent_count || 1), 0)) * 100
                  )
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send Push Notification</CardTitle>
          <CardDescription>Create and send notifications to your users</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="compose" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compose">
                <Send className="mr-2 h-4 w-4" />
                Compose
              </TabsTrigger>
              <TabsTrigger value="schedule">
                <Clock className="mr-2 h-4 w-4" />
                Schedule
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="space-y-4 mt-4">
              {/* Template Selection */}
              {templates && templates.length > 0 && (
                <div className="space-y-2">
                  <Label>Use Template (Optional)</Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None - Start Fresh</SelectItem>
                      {templates.map((template: any) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* User Segment */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Target Audience
                </Label>
                <Select value={userSegment} onValueChange={setUserSegment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All Users ({stats?.activeSubscriptions || 0})
                    </SelectItem>
                    <SelectItem value="specific">
                      <Target className="inline mr-2 h-4 w-4" />
                      Specific Users (Test)
                    </SelectItem>
                    <SelectItem value="free">
                      Free Users (~{Math.floor((stats?.activeSubscriptions || 0) * 0.7)})
                    </SelectItem>
                    <SelectItem value="monthly">
                      Monthly Subscribers (~{Math.floor((stats?.activeSubscriptions || 0) * 0.2)})
                    </SelectItem>
                    <SelectItem value="lifetime">
                      Lifetime Members (~{Math.floor((stats?.activeSubscriptions || 0) * 0.1)})
                    </SelectItem>
                    <SelectItem value="active">
                      Active Traders (last 7 days)
                    </SelectItem>
                    <SelectItem value="inactive">
                      Inactive Users (7+ days)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Specific Users Selection */}
              {userSegment === 'specific' && (
                <div className="space-y-2">
                  <Label>Select Users</Label>
                  <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                    {usersWithPush && usersWithPush.length > 0 ? (
                      usersWithPush.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={user.id}
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers([...selectedUsers, user.id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                              }
                            }}
                          />
                          <label
                            htmlFor={user.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {user.full_name || user.email}
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No users with push notifications enabled</p>
                    )}
                  </div>
                  {selectedUsers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              )}

              {/* Title & Body */}
              <div className="space-y-2">
                <Label>Notification Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., New Feature Available!"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">{title.length}/50</p>
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="e.g., Check out our new AI-powered trade analysis..."
                  rows={4}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">{body.length}/200</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Action Buttons (Optional)
                  </Label>
                  {actionButtons.length < 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addActionButton}
                    >
                      Add Button
                    </Button>
                  )}
                </div>
                {actionButtons.map((button, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Button text (e.g., View Trade)"
                        value={button.title}
                        onChange={(e) => updateActionButton(index, 'title', e.target.value)}
                        maxLength={20}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="URL (e.g., /dashboard)"
                        value={button.url}
                        onChange={(e) => updateActionButton(index, 'url', e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeActionButton(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                {actionButtons.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Users can interact directly from the notification
                  </p>
                )}
              </div>

              <Button
                onClick={handleSendNow}
                disabled={isSending || !title.trim() || !body.trim()}
                className="w-full"
              >
                <Send className="mr-2 h-4 w-4" />
                {isSending ? 'Sending...' : `Send to ${subscriptionCount} ${subscriptionCount === 1 ? 'Subscription' : 'Subscriptions'}`}
              </Button>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 mt-4">
              {/* Same fields as compose */}
              <div className="space-y-4">
                {/* Copy of all fields from compose tab */}
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={userSegment} onValueChange={setUserSegment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="free">Free Users</SelectItem>
                      <SelectItem value="monthly">Monthly Subscribers</SelectItem>
                      <SelectItem value="lifetime">Lifetime Members</SelectItem>
                      <SelectItem value="active">Active Traders</SelectItem>
                      <SelectItem value="inactive">Inactive Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Schedule For</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recurrence (Optional)</Label>
                  <Select value={recurrence} onValueChange={setRecurrence}>
                    <SelectTrigger>
                      <SelectValue placeholder="One-time only" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">One-time only</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSchedule}
                  disabled={isSending || !title.trim() || !body.trim() || !scheduledFor}
                  className="w-full"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  {isSending ? 'Scheduling...' : 'Schedule Notification'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Notifications with Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentNotifications && stats.recentNotifications.length > 0 ? (
            <div className="space-y-3">
              {stats.recentNotifications.map((notif: any) => (
                <div key={notif.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{notif.title}</p>
                      <p className="text-sm text-muted-foreground">{notif.body}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-muted">
                        {notif.user_segment || 'all'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNotificationMutation.mutate(notif.id)}
                        disabled={deleteNotificationMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div>📤 Sent: {notif.sent_count}</div>
                    <div>👁️ Opened: {notif.opened_count || 0}</div>
                    <div>🖱️ Clicked: {notif.clicked_count || 0}</div>
                    <div>
                      📊 Rate: {notif.sent_count > 0 
                        ? Math.round((notif.opened_count || 0) / notif.sent_count * 100)
                        : 0}%
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
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
