import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Notification {
  id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  documentId: string;
}

interface NotificationPanelProps {
  userId: string;
}

export default function NotificationPanel({ userId }: NotificationPanelProps) {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: async () => {
      const response = await fetch(`/api/notifications/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
    refetchInterval: 5000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to mark notification as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_document":
      case "approved_document":
      case "document_status_update":
      case "document_declined":
        return <FileText className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "approved_document":
        return "text-green-600 bg-green-50 dark:bg-green-950/20";
      case "document_declined":
        return "text-red-600 bg-red-50 dark:bg-red-950/20";
      case "new_document":
        return "text-blue-600 bg-blue-50 dark:bg-blue-950/20";
      default:
        return "text-muted-foreground bg-muted/30";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          size="icon" 
          variant="ghost" 
          className="relative" 
          data-testid="button-notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0" 
        align="end"
        data-testid="notification-panel"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? "bg-muted/30" : ""
                  }`}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.isRead ? "font-medium" : ""}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="flex-shrink-0 h-8 w-8"
                        onClick={() => handleMarkAsRead(notification.id)}
                        data-testid={`button-mark-read-${notification.id}`}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
