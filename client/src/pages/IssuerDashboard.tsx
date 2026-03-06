import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import DocumentTable, { Document } from "@/components/DocumentTable";
import WorkflowProgress from "@/components/WorkflowProgress";
import ApprovalDialog from "@/components/ApprovalDialog";
import DocumentViewDialog from "@/components/DocumentViewDialog";
import PDFViewer from "@/components/PDFViewer";
import { WordDocumentViewer } from "@/components/WordDocumentViewer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Send, Clock, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface IssuerDashboardProps {
  onLogout?: () => void;
  userId?: string;
  issuerName?: string;
  departmentId?: string | null;
  departmentName?: string | null;
}

interface ApiDocument {
  id: string;
  docName: string;
  docNumber: string;
  status: string;
  dateOfIssue: string;
  revisionNo: number;
  preparedBy: string;
  preparerName?: string;
  approverName?: string;
  issuerName?: string;
  departments?: Array<{ id: string; name: string }>;
  content?: string;
  headerInfo?: string;
  footerInfo?: string;
  approvalRemarks?: string;
  declineRemarks?: string;
  previousVersionId?: string;
  previousVersion?: ApiDocument;
  createdAt?: string;
  updatedAt?: string;
  location?: string;
  dateOfRev?: string;
}

interface Notification {
  id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function IssuerDashboard({ onLogout, userId = "issuer-1", issuerName = "", departmentId = null, departmentName = null }: IssuerDashboardProps) {
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfDocId, setPdfDocId] = useState<string>("");
  const [pdfDocName, setPdfDocName] = useState<string>("");
  const [wordViewerOpen, setWordViewerOpen] = useState(false);
  const [wordViewDocId, setWordViewDocId] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<ApiDocument | null>(null);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: approvedDocuments = [], isLoading } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", "approved", departmentId],
    queryFn: async () => {
      const url = departmentId
        ? `/api/documents/department/${departmentId}?status=approved`
        : "/api/documents?status=approved";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch approved documents");
      return response.json();
    },
    refetchInterval: 5000,
  });

  const { data: issuedDocuments = [] } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", "issued", departmentId],
    queryFn: async () => {
      const url = departmentId
        ? `/api/documents/department/${departmentId}?status=issued`
        : "/api/documents?status=issued";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch issued documents");
      return response.json();
    },
    refetchInterval: 5000,
  });

  // Fetch ALL issued documents for other departments
  const { data: allIssuedDocuments = [] } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", "all-issued-issuer"],
    queryFn: async () => {
      const response = await fetch("/api/documents?status=issued");
      if (!response.ok) throw new Error("Failed to fetch all issued documents");
      return response.json();
    },
    refetchInterval: 10000,
  });

  // Other department issued documents
  const otherDeptIssuedDocs = allIssuedDocuments.filter(doc => {
    if (!departmentId) return false;
    const docDeptIds = doc.departments?.map(d => d.id) || [];
    return !docDeptIds.includes(departmentId);
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: async () => {
      const response = await fetch(`/api/notifications/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
    refetchInterval: 5000,
  });

  const issueMutation = useMutation({
    mutationFn: async ({ docId, issuerName, remarks }: { docId: string; issuerName: string; remarks: string }) => {
      return apiRequest("POST", `/api/documents/${docId}/issue`, { issuedBy: userId, issuerName, remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Document Issued",
        description: "The document has been successfully issued to all recipients.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to issue document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async ({ docId, remarks }: { docId: string; remarks: string }) => {
      return apiRequest("POST", `/api/documents/${docId}/decline`, { declineRemarks: remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Document Declined",
        description: "The document has been sent back to the creator for revision.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to decline document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleIssue = (doc: Document) => {
    const fullDoc = approvedDocuments.find((d) => d.id === doc.id);
    if (fullDoc) {
      setSelectedDoc(fullDoc);
      setIssueDialogOpen(true);
    }
  };

  const handleDecline = (doc: Document) => {
    const fullDoc = approvedDocuments.find((d) => d.id === doc.id);
    if (fullDoc) {
      setSelectedDoc(fullDoc);
      setDeclineDialogOpen(true);
    }
  };

  const handleView = (doc: Document) => {
    setViewDoc(doc);
    setViewDialogOpen(true);
  };

  const handleIssueConfirm = (data: { remarks: string; approverName: string }) => {
    if (selectedDoc) {
      issueMutation.mutate({
        docId: selectedDoc.id,
        issuerName: data.approverName,
        remarks: data.remarks,
      });
      setIssueDialogOpen(false);
      setSelectedDoc(null);
    }
  };

  const handleDeclineConfirm = (remarks: string) => {
    if (selectedDoc) {
      declineMutation.mutate({
        docId: selectedDoc.id,
        remarks,
      });
      setDeclineDialogOpen(false);
      setSelectedDoc(null);
    }
  };

  const handleViewWord = (doc: Document) => {
    setWordViewDocId(doc.id);
    setWordViewerOpen(true);
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to download document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${doc.docNumber}_${doc.docName}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Successful",
        description: `${doc.docName} has been downloaded.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error.message || "Failed to download Word document. Please try again.",
      });
    }
  };

  const handleViewPDF = (doc: Document) => {
    setPdfDocId(doc.id);
    setPdfDocName(doc.docName);
    setPdfViewerOpen(true);
  };

  const transformedApprovedDocs = (docs: ApiDocument[]): Document[] => {
    return docs.map((doc) => ({
      id: doc.id,
      docName: doc.docName,
      docNumber: doc.docNumber,
      status: doc.status ? (doc.status.charAt(0).toUpperCase() + doc.status.slice(1)) as any : "Approved",
      dateOfIssue: doc.dateOfIssue ? new Date(doc.dateOfIssue).toISOString().split("T")[0] : "",
      revisionNo: doc.revisionNo,
      preparedBy: doc.preparerName || "Unknown",
      location: (doc as any).location,
      dateOfRev: (doc as any).dateOfRev && !isNaN(new Date((doc as any).dateOfRev).getTime())
        ? new Date((doc as any).dateOfRev).toISOString().split('T')[0]
        : null,
      departments: doc.departments
    }));
  };

  const transformedIssuedDocs = (docs: ApiDocument[]): Document[] => {
    return docs.map((doc) => ({
      id: doc.id,
      docName: doc.docName,
      docNumber: doc.docNumber,
      status: "Issued" as const,
      dateOfIssue: doc.dateOfIssue ? new Date(doc.dateOfIssue).toISOString().split("T")[0] : "",
      revisionNo: doc.revisionNo,
      preparedBy: doc.preparerName || "Unknown",
      location: (doc as any).location,
      dateOfRev: (doc as any).dateOfRev && !isNaN(new Date((doc as any).dateOfRev).getTime())
        ? new Date((doc as any).dateOfRev).toISOString().split('T')[0]
        : null,
      departments: doc.departments
    }));
  };

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;
  const issuedToday = issuedDocuments.filter((doc) => {
    const issuedDate = doc.dateOfIssue ? new Date(doc.dateOfIssue).toDateString() : "";
    return issuedDate === new Date().toDateString();
  }).length;

  return (
    <DashboardLayout
      userRole="Document Issuer (MR)"
      userName={issuerName}
      userId={userId}
      notificationCount={unreadNotifications}
      onLogout={onLogout}
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Document Issuance</h2>
          <p className="text-xs text-muted-foreground">
            Final review and issue approved documents
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <StatCard
            title="Pending Issue"
            value={approvedDocuments.length}
            icon={Clock}
            variant="amber"
            trend="Approved documents"
          />
          <StatCard
            title="Issued Today"
            value={issuedToday}
            icon={Send}
            variant="green"
            trend="Ready to distribute"
          />
          <StatCard
            title="Total Issued"
            value={issuedDocuments.length}
            icon={FileText}
            variant="blue"
            trend="All time issued"
          />
          <StatCard
            title="Master Copies"
            value={issuedDocuments.length}
            icon={Archive}
            variant="purple"
            trend="With version history"
          />
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">Approved - Ready to Issue</h3>
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold" data-testid="button-export">
              Export Log
            </Button>
          </div>

          {isLoading ? (
            <div className="border rounded-lg p-12 text-center">
              <p className="text-sm text-muted-foreground">Loading documents...</p>
            </div>
          ) : approvedDocuments.length > 0 ? (
            <DocumentTable
              documents={transformedApprovedDocs(approvedDocuments)}
              onView={handleView}
              onViewWord={handleViewWord}
              onDownload={handleDownload}
              onApprove={handleIssue}
              onDecline={handleDecline}
              showActions={true}
              showLocation={true}
            />
          ) : (
            <div className="border rounded-lg p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">No documents ready to issue</p>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-base font-semibold mb-3">
            {departmentName ? `Your Department (${departmentName}) - Issued Documents` : "Recently Issued Documents"}
          </h3>
          {issuedDocuments.length > 0 ? (
            <DocumentTable
              documents={transformedIssuedDocs(issuedDocuments.slice(0, 10))}
              onView={handleViewPDF}
              showActions={true}
              showLocation={true}
            />
          ) : (
            <div className="border rounded-lg p-12 text-center">
              <Send className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">No issued documents in your department yet</p>
            </div>
          )}
        </Card>

        {departmentId && otherDeptIssuedDocs.length > 0 && (
          <Card className="p-4">
            <h3 className="text-base font-semibold mb-3">Other Departments - Issued Documents</h3>
            <DocumentTable
              documents={transformedIssuedDocs(otherDeptIssuedDocs)}
              onView={handleViewPDF}
              showActions={true}
              showLocation={true}
            />
          </Card>
        )}

        <Card className="p-4">
          <h3 className="text-base font-semibold mb-3">Document Workflow</h3>
          <WorkflowProgress currentStep="Issuer" />
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Your Role:</strong> Perform final review, issue documents with controlled PDF
              conversion, assign control copy numbers, and manage version history access.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Note:</strong> Issued documents can be printed only once per system policy.
            </p>
          </div>
        </Card>
      </div>

      <ApprovalDialog
        open={issueDialogOpen}
        onClose={() => setIssueDialogOpen(false)}
        onApprove={handleIssueConfirm}
        type="approve"
        title={`Issue Document: ${selectedDoc?.docName}`}
        approverName={issuerName}
        nameFieldLabel="Issued By"
      />

      <ApprovalDialog
        open={declineDialogOpen}
        onClose={() => setDeclineDialogOpen(false)}
        onDecline={handleDeclineConfirm}
        type="decline"
        title={`Decline for Revision: ${selectedDoc?.docName}`}
      />

      <DocumentViewDialog
        document={viewDoc}
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        onDownload={viewDoc ? () => handleViewWord(viewDoc as any) : () => { }}
      />

      <PDFViewer
        documentId={pdfDocId}
        userId={userId}
        open={pdfViewerOpen}
        onClose={() => setPdfViewerOpen(false)}
        documentName={pdfDocName}
      />

      <WordDocumentViewer
        documentId={wordViewDocId}
        open={wordViewerOpen}
        onOpenChange={setWordViewerOpen}
      />
    </DashboardLayout>
  );
}
