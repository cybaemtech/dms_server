import { useEffect, useState } from "react";
import { X, Bell, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export type NotificationType = "success" | "error" | "info" | "warning";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

interface NotificationPopupProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  autoDismiss?: boolean;
  duration?: number;
}

export default function NotificationPopup({
  notification,
  onDismiss,
  autoDismiss = true,
  duration = 5000,
}: NotificationPopupProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(notification.id), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, duration, notification.id, onDismiss]);

  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case "success":
        return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900";
      case "error":
        return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900";
      case "warning":
        return "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900";
      case "info":
        return "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900";
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
      data-testid={`notification-${notification.type}`}
    >
      <div
        className={`p-4 rounded-lg border shadow-lg max-w-md ${getBgColor()}`}
      >
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground">{notification.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onDismiss(notification.id), 300);
            }}
            data-testid="button-dismiss-notification"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
