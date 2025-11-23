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
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
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
    setSelectedNotification(notification);
  };

  const handleBackToList = () => {
    setSelectedNotification(null);
  };

  const handleActionClick = () => {
    if (selectedNotification?.action_url) {
      navigate(selectedNotification.action_url);
      onOpenChange(false);
      setSelectedNotification(null);
    }
  };

  const truncateMessage = (message: string, maxLength: number = 100) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
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
    <Sheet open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) setSelectedNotification(null);
    }}>
      <SheetContent side="right" className="w-full sm:max-w-md border-l border-border/50 bg-gradient-to-b from-background to-background/95 backdrop-blur-xl">
        {selectedNotification ? (
          // Detail View
          <>
            <SheetHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToList}
                  className="h-9 w-9 hover:bg-primary/10 hover:text-primary transition-all duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </Button>
                <div className="flex-1">
                  <SheetTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Notification Details
                  </SheetTitle>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="h-[calc(100vh-140px)] mt-6">
              <div className="space-y-6 px-1">
                {/* Header Card */}
                <div className={`p-6 rounded-2xl bg-gradient-to-br ${
                  selectedNotification.type === 'success' 
                    ? 'from-green-500/10 to-green-500/5 border-l-4 border-l-green-500'
                    : selectedNotification.type === 'warning'
                    ? 'from-yellow-500/10 to-yellow-500/5 border-l-4 border-l-yellow-500'
                    : selectedNotification.type === 'error'
                    ? 'from-red-500/10 to-red-500/5 border-l-4 border-l-red-500'
                    : 'from-primary/10 to-primary/5 border-l-4 border-l-primary'
                } shadow-lg backdrop-blur-sm border border-border/30`}>
                  <h2 className="text-2xl font-bold text-foreground mb-2 leading-tight">
                    {selectedNotification.title}
                  </h2>
                  <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/40" />
                    {formatDistanceToNow(new Date(selectedNotification.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>

                {/* Message Card */}
                <div className="p-6 rounded-2xl bg-card/50 shadow-md border border-border/30 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Message
                  </h3>
                  <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {selectedNotification.message}
                  </p>
                </div>

                {/* Action Button */}
                {selectedNotification.action_url && (
                  <Button
                    onClick={handleActionClick}
                    className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                  >
                    View Details
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </Button>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      deleteNotification(selectedNotification.id);
                      handleBackToList();
                    }}
                    className="flex-1 h-11 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-300 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          // List View
          <>
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
                      <div className="flex items-start gap-3">
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors break-words flex-1">
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <span className="inline-block w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-2 line-clamp-2">
                            {truncateMessage(notification.message)}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
                              <span className="inline-block w-1 h-1 rounded-full bg-primary/40" />
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                            <span className="text-xs text-primary/70 font-medium group-hover:text-primary">
                              Tap to view
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
