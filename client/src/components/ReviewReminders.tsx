import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bell, Calendar, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DueDocument {
  id: string;
  docName: string;
  docNumber: string;
  revisionNo: number;
  reviewDueDate: string;
  dateOfRev?: string;
  dateOfIssue?: string;
  daysUntilDue: number;
  preparerName: string;
}

interface ReviewRemindersProps {
  daysAhead?: number;
}

export default function ReviewReminders({ daysAhead = 30 }: ReviewRemindersProps) {
  const { data: dueDocuments = [], isLoading } = useQuery<DueDocument[]>({
    queryKey: ["/api/documents/due-for-review", daysAhead],
    queryFn: async () => {
      const response = await fetch(`/api/documents/due-for-review?daysAhead=${daysAhead}`);
      if (!response.ok) throw new Error("Failed to fetch due documents");
      return response.json();
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return null;
  }

  if (dueDocuments.length === 0) {
    return null;
  }

  const urgentDocs = dueDocuments.filter(doc => doc.daysUntilDue <= 15);

  return (
    <Card className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 shadow-sm" data-testid="card-review-reminders">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <div className="flex-shrink-0 p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-md">
            <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-bold text-amber-900 dark:text-amber-100 leading-none">
              Review Reminders
            </h3>
            <p className="text-[10px] text-amber-800 dark:text-amber-200 mt-1 leading-none">
              {dueDocuments.length} documents due for review (15d & 30d thresholds)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {dueDocuments.slice(0, 5).map((doc) => {
            const isCritical = doc.daysUntilDue <= 15;
            const isUrgent = doc.daysUntilDue <= 30; // 1 month
            const isOverdue = doc.daysUntilDue < 0;

            return (
              <div
                key={doc.id}
                className={`p-2.5 rounded-md border flex flex-col gap-2 ${isOverdue
                  ? 'bg-red-50/80 border-red-200 dark:bg-red-950/30'
                  : isCritical
                    ? 'bg-orange-50/80 border-orange-200 dark:bg-orange-950/30'
                    : isUrgent
                      ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30'
                      : 'bg-white border-slate-200 dark:bg-slate-900 shadow-sm'
                  }`}
                data-testid={`alert-due-doc-${doc.id}`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <AlertCircle className={`flex-shrink-0 h-3 w-3 mt-0.5 ${isOverdue ? 'text-red-600' : isCritical ? 'text-orange-600' : isUrgent ? 'text-amber-600' : 'text-blue-600'}`} />
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-tight break-words">
                      {doc.docName} <span className="text-[10px] font-normal text-slate-500">({doc.docNumber})</span>
                    </span>
                  </div>
                  <Badge
                    variant={isOverdue ? "destructive" : isUrgent ? "default" : "secondary"}
                    className="flex-shrink-0 h-4 px-1.5 text-[9px] font-bold uppercase tracking-tight"
                  >
                    Rev {doc.revisionNo}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1.5 border-t border-slate-100/60 dark:border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase text-muted-foreground font-bold leading-none mb-0.5">
                      Revision Date
                    </span>
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                      {(doc.revisionNo > 0 && doc.dateOfRev) ? new Date(doc.dateOfRev).toLocaleDateString('en-GB') :
                        (doc.dateOfIssue ? new Date(doc.dateOfIssue).toLocaleDateString('en-GB') : '-')}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase text-muted-foreground font-bold leading-none mb-0.5">Review Due</span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                      {new Date(doc.reviewDueDate).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <div className="flex flex-col col-span-2">
                    <span className="text-[8px] uppercase text-muted-foreground font-bold leading-none mb-0.5">Status</span>
                    <span className={`text-[10px] font-bold flex items-center gap-1 ${isOverdue ? 'text-red-700' : isCritical ? 'text-orange-700' : isUrgent ? 'text-amber-700' : 'text-blue-700'}`}>
                      {isOverdue ? 'Overdue' : isCritical ? '15 Days' : isUrgent ? '30 Days' : 'Upcoming'}
                      <span className="font-normal text-[9px]">
                        {isOverdue ? `(by ${Math.abs(doc.daysUntilDue)}d)` : `(in ${doc.daysUntilDue}d)`}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {dueDocuments.length > 5 && (
            <p className="text-[10px] text-amber-700 dark:text-amber-300 text-center font-bold px-4 py-1.5 bg-amber-100/50 rounded-full mt-2">
              + {dueDocuments.length - 5} more pending reviews
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
