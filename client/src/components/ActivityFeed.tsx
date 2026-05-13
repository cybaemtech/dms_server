import { useState } from "react";
import { FileText, CheckCircle, XCircle, Send, Clock, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const [isExpanded, setIsExpanded] = useState(false);

  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "created":
        return <FileText className="w-3.5 h-3.5 text-blue-600" />;
      case "approved":
        return <CheckCircle className="w-3.5 h-3.5 text-green-600" />;
      case "declined":
        return <XCircle className="w-3.5 h-3.5 text-red-600" />;
      case "issued":
        return <Send className="w-3.5 h-3.5 text-purple-600" />;
      case "pending":
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
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
    <Card className="overflow-hidden border-slate-200 shadow-sm" data-testid="card-activity-feed">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full h-10 px-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors border-none"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-[13px] font-bold text-slate-800">Recent Activity</h3>
        </div>
        <div className="flex items-center gap-2">
          {activities.length > 0 && <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activities.length}</span>}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 p-3.5 max-h-[300px] overflow-y-auto bg-slate-50/30">
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic text-center py-4">No recent activities found.</p>
            ) : (
              activities.slice(0, maxItems).map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex gap-2.5"
                  data-testid={`activity-${activity.id}`}
                >
                  <div className="mt-0.5 flex-shrink-0">{getIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-foreground leading-snug">
                      <span className="font-semibold">{activity.userName}</span>{" "}
                      {getActionText(activity.type)}{" "}
                      <span className="font-semibold break-words">{activity.docName}</span>
                    </p>
                    {activity.remarks && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 italic leading-tight">"{activity.remarks}"</p>
                    )}
                    <p className="text-[9px] text-muted-foreground mt-0.5">{activity.timestamp}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
