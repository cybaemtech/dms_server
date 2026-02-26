import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Document } from "./DocumentTable";
import { Download, FileText, Calendar, User, Hash, Clock, AlertCircle, GitCompare } from "lucide-react";
import StatusBadge from "./StatusBadge";
import WorkflowProgress, { WorkflowStep } from "./WorkflowProgress";

interface DocumentViewDialogProps {
  document: Document | null;
  open: boolean;
  onClose: () => void;
  onDownload?: (doc: Document) => void;
}

interface DocumentDetails {
  id: string;
  docName: string;
  docNumber: string;
  status: string;
  dateOfIssue: string;
  revisionNo: number;
  preparerName: string;
  approverName?: string;
  issuerName?: string;
  content?: string;
  headerInfo?: string;
  footerInfo?: string;
  approvalRemarks?: string;
  declineRemarks?: string;
  issueRemarks?: string;
  departments?: Array<{ id: string; name: string }>;
  previousVersion?: DocumentDetails;
}

export default function DocumentViewDialog({
  document,
  open,
  onClose,
  onDownload,
}: DocumentViewDialogProps) {
  const { data: docDetails, isLoading } = useQuery<DocumentDetails>({
    queryKey: ["/api/documents", document?.id],
    queryFn: async () => {
      if (!document?.id) throw new Error("No document ID");
      const response = await fetch(`/api/documents/${document.id}`);
      if (!response.ok) throw new Error("Failed to fetch document details");
      return response.json();
    },
    enabled: open && !!document?.id,
  });

  if (!document) return null;

  const getWorkflowStep = (): WorkflowStep => {
    switch (document.status) {
      case "Pending":
        return "Approver";
      case "Approved":
        return "Issuer";
      case "Issued":
        return "Issued";
      default:
        return "Creator";
    }
  };

  const parseJsonOrText = (data: string): { isJson: boolean; parsed?: any; text?: string } => {
    try {
      const parsed = JSON.parse(data);
      return { isJson: true, parsed };
    } catch {
      return { isJson: false, text: data };
    }
  };

  const renderRevisionComparison = () => {
    if (!docDetails?.previousVersion) return null;

    return (
      <Card className="p-6 border-amber-200 dark:border-amber-900">
        <div className="flex items-start gap-3 mb-4">
          <GitCompare className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold">Revision Comparison</h3>
            <p className="text-sm text-muted-foreground">Compare with previous version (Rev {docDetails.previousVersion.revisionNo})</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Previous Version (Rev {docDetails.previousVersion.revisionNo})</h4>
            <div className="bg-muted/30 p-3 rounded-md space-y-1 text-sm">
              <p><strong>Status:</strong> {docDetails.previousVersion.status}</p>
              <p><strong>Date:</strong> {new Date(docDetails.previousVersion.dateOfIssue).toLocaleDateString()}</p>
              {docDetails.previousVersion.approverName && (
                <p><strong>Approved By:</strong> {docDetails.previousVersion.approverName}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Current Version (Rev {docDetails.revisionNo})</h4>
            <div className="bg-primary/10 p-3 rounded-md space-y-1 text-sm">
              <p><strong>Status:</strong> {docDetails.status}</p>
              <p><strong>Date:</strong> {new Date(docDetails.dateOfIssue).toLocaleDateString()}</p>
              {docDetails.approverName && (
                <p><strong>Approved By:</strong> {docDetails.approverName}</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-view-document">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            {document.docName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading document details...</div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={document.status} />
              {onDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownload(document)}
                  data-testid="button-download-doc"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download as Word
                </Button>
              )}
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Document Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hash className="w-4 h-4" />
                    Document Number
                  </div>
                  <p className="font-mono text-sm font-medium">{document.docNumber}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Date of Issue
                  </div>
                  <p className="text-sm font-medium">{document.dateOfIssue}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Revision Number
                  </div>
                  <p className="text-sm font-medium">Rev {document.revisionNo}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    Prepared By
                  </div>
                  <p className="text-sm font-medium">{document.preparedBy}</p>
                </div>

                {docDetails?.approverName && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      Approved By
                    </div>
                    <p className="text-sm font-medium">{docDetails.approverName}</p>
                  </div>
                )}

                {docDetails?.issuerName && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      Issued By
                    </div>
                    <p className="text-sm font-medium">{docDetails.issuerName}</p>
                  </div>
                )}
              </div>

              {docDetails?.departments && docDetails.departments.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Shared with Departments</h4>
                  <div className="flex flex-wrap gap-2">
                    {docDetails.departments.map(dept => (
                      <span key={dept.id} className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                        {dept.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {docDetails?.approvalRemarks && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Approval Remarks</h4>
                  <p className="text-sm bg-green-50 dark:bg-green-950/20 p-3 rounded-md">{docDetails.approvalRemarks}</p>
                </div>
              )}

              {docDetails?.declineRemarks && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <h4 className="text-sm font-medium text-destructive">Decline Remarks</h4>
                  </div>
                  <p className="text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded-md">{docDetails.declineRemarks}</p>
                </div>
              )}

              {docDetails?.issueRemarks && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Issuance Remarks</h4>
                  <p className="text-sm bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">{docDetails.issueRemarks}</p>
                </div>
              )}
            </Card>

            {renderRevisionComparison()}

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Document Workflow</h3>
              <WorkflowProgress currentStep={getWorkflowStep()} />
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
