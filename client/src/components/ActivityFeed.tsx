import { FileText, CheckCircle, XCircle, Send, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Activity {
  id: string;
  type: "created" | "approved" | "declined" | "issued" | "pending";
  docName: string;
  userName: string;
  timestamp: string;
  remarks?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  maxItems?: number;
}

export default function ActivityFeed({ activities, maxItems = 10 }: ActivityFeedProps) {
  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "created":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "declined":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "issued":
        return <Send className="w-4 h-4 text-purple-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  const getActionText = (type: Activity["type"]) => {
    switch (type) {
      case "created":
        return "created";
      case "approved":
        return "approved";
      case "declined":
        return "declined";
      case "issued":
        return "issued";
      case "pending":
        return "submitted for review";
    }
  };

  return (
    <Card className="p-3.5" data-testid="card-activity-feed">
      <h3 className="text-base font-semibold mb-3">Recent Activity</h3>
      <div className="space-y-2">
        {activities.slice(0, maxItems).map((activity, index) => (
          <div
            key={activity.id}
            className={`flex gap-2.5 py-1.5 ${index !== activities.length - 1 ? "border-b border-slate-100" : ""}`}
            data-testid={`activity-${activity.id}`}
          >
            <div className="mt-0.5">{getIcon(activity.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-foreground leading-snug">
                <span className="font-semibold">{activity.userName}</span>{" "}
                {getActionText(activity.type)}{" "}
                <span className="font-semibold">{activity.docName}</span>
              </p>
              {activity.remarks && (
                <p className="text-[10px] text-muted-foreground mt-0.5 italic">"{activity.remarks}"</p>
              )}
              <p className="text-[9px] text-muted-foreground mt-0.5">{activity.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
