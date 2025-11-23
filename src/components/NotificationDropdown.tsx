import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { CheckCheck, Bell, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

interface NotificationDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotificationRead: () => void;
}

export const NotificationDropdown = ({ 
  open, 
  onOpenChange,
  onNotificationRead 
}: NotificationDropdownProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      onNotificationRead();
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      onNotificationRead();
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      onNotificationRead();
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
      onOpenChange(false);
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-4 border-l-green-500';
      case 'warning':
        return 'border-l-4 border-l-yellow-500';
      case 'error':
        return 'border-l-4 border-l-red-500';
      default:
        return 'border-l-4 border-l-blue-500';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md border-l border-border/50 bg-gradient-to-b from-background to-background/95 backdrop-blur-xl">
        <SheetHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <SheetTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Notifications
              </SheetTitle>
            </div>
            {notifications.some(n => !n.is_read) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs hover:bg-primary/10 hover:text-primary transition-all duration-300"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          <SheetDescription className="text-muted-foreground/80">
            Stay updated with your latest notifications
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] mt-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse space-y-4">
                <div className="h-20 bg-muted/20 rounded-xl" />
                <div className="h-20 bg-muted/20 rounded-xl" />
                <div className="h-20 bg-muted/20 rounded-xl" />
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full animate-pulse" />
                <div className="relative flex items-center justify-center h-full">
                  <Bell className="h-12 w-12 text-primary/40" />
                </div>
              </div>
              <p className="text-lg font-semibold text-foreground/70 mb-2">All caught up!</p>
              <p className="text-sm text-muted-foreground">No new notifications at the moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                    getNotificationColor(notification.type)
                  } ${
                    !notification.is_read 
                      ? 'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10' 
                      : 'bg-card/50 hover:bg-card/80 shadow-sm hover:shadow-md'
                  } backdrop-blur-sm hover:scale-[1.02] border border-border/30`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-semibold text-base mb-1.5 text-foreground group-hover:text-primary transition-colors break-words">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-2 break-words whitespace-pre-wrap">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
                        <span className="inline-block w-1 h-1 rounded-full bg-primary/40" />
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-all duration-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
