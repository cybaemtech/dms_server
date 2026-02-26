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

  const urgentDocs = dueDocuments.filter(doc => doc.daysUntilDue <= 7);

  return (
    <Card className="p-6 mb-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" data-testid="card-review-reminders">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
            Document Review Reminders
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
            {dueDocuments.length} document{dueDocuments.length !== 1 ? 's' : ''} due for review in the next {daysAhead} days
          </p>
          
          <div className="space-y-3">
            {dueDocuments.slice(0, 5).map((doc) => {
              const isUrgent = doc.daysUntilDue <= 7;
              const isOverdue = doc.daysUntilDue < 0;
              
              return (
                <Alert 
                  key={doc.id} 
                  className={`${isOverdue ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : isUrgent ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' : 'bg-white dark:bg-gray-800'}`}
                  data-testid={`alert-due-doc-${doc.id}`}
                >
                  <AlertCircle className={`h-4 w-4 ${isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-amber-600'}`} />
                  <AlertTitle className="text-sm font-medium">
                    {doc.docName} ({doc.docNumber})
                    <Badge 
                      variant={isOverdue ? "destructive" : isUrgent ? "default" : "secondary"}
                      className="ml-2"
                    >
                      Rev {doc.revisionNo}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {isOverdue 
                          ? `Overdue by ${Math.abs(doc.daysUntilDue)} day${Math.abs(doc.daysUntilDue) !== 1 ? 's' : ''}`
                          : `Due in ${doc.daysUntilDue} day${doc.daysUntilDue !== 1 ? 's' : ''}`
                        }
                      </span>
                      <span>Review Due: {new Date(doc.reviewDueDate).toLocaleDateString()}</span>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })}
            
            {dueDocuments.length > 5 && (
              <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
                + {dueDocuments.length - 5} more document{dueDocuments.length - 5 !== 1 ? 's' : ''} due for review
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
