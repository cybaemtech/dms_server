import { useState } from "react";
import NotificationPopup from "../NotificationPopup";
import { Button } from "@/components/ui/button";

export default function NotificationPopupExample() {
  const [notifications, setNotifications] = useState<any[]>([]);

  const addNotification = (type: "success" | "error" | "info" | "warning") => {
    const newNotif = {
      id: Date.now().toString(),
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Notification`,
      message: `This is a ${type} notification message.`,
    };
    setNotifications((prev) => [...prev, newNotif]);
  };

  return (
    <div className="p-6 space-x-4">
      <Button onClick={() => addNotification("success")}>Success</Button>
      <Button onClick={() => addNotification("error")} variant="destructive">
        Error
      </Button>
      <Button onClick={() => addNotification("warning")}>Warning</Button>
      <Button onClick={() => addNotification("info")}>Info</Button>

      {notifications.map((notif) => (
        <NotificationPopup
          key={notif.id}
          notification={notif}
          onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
        />
      ))}
    </div>
  );
}
