import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import DocumentTable, { Document } from "@/components/DocumentTable";
import ApprovalDialog from "@/components/ApprovalDialog";
import DocumentViewDialog from "@/components/DocumentViewDialog";
import WorkflowProgress from "@/components/WorkflowProgress";
import { WordDocumentViewer } from "@/components/WordDocumentViewer";
import PDFViewer from "@/components/PDFViewer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Clock, CheckCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentStatus } from "@/components/StatusBadge";

interface ApproverDashboardProps {
  onLogout?: () => void;
  userId?: string;
  approverName?: string;
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
  approvedAt?: string;
  issuedAt?: string;
  createdAt?: string;
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

export default function ApproverDashboard({
  onLogout,
  userId = "approver-1",
  approverName = "",
  departmentId = null,
  departmentName = null
}: ApproverDashboardProps) {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [wordViewerOpen, setWordViewerOpen] = useState(false);
  const [wordViewDocId, setWordViewDocId] = useState<string>("");
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfDocId, setPdfDocId] = useState<string>("");
  const [pdfDocName, setPdfDocName] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<ApiDocument | null>(null);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingDocs = [], isLoading: isLoadingDocs } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", "pending", departmentId],
    queryFn: async () => {
      const url = departmentId
        ? `/api/documents/department/${departmentId}?status=pending`
        : "/api/documents?status=pending";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
    refetchInterval: 5000,
  });

  const { data: approvedDocs = [] } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", "approved", departmentId],
    queryFn: async () => {
      const url = departmentId
        ? `/api/documents/department/${departmentId}?status=approved`
        : "/api/documents?status=approved";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
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

  // "All Issued" tab = only docs issued to approver's own department
  const { data: allIssuedDocuments = [] } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", "all-issued-approver", departmentId],
    queryFn: async () => {
      // Only show documents issued to this approver's department
      const url = departmentId
        ? `/api/documents/department/${departmentId}?status=issued`
        : `/api/documents?status=issued`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch all issued documents");
      return response.json();
    },
    refetchInterval: 10000,
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

  const { data: departments = [] } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await fetch("/api/departments");
      if (!response.ok) throw new Error("Failed to fetch departments");
      return response.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (data: {
      documentId: string;
      approvalRemarks: string;
      departments: string[];
      approverName: string
    }) => {
      const response = await fetch(`/api/documents/${data.documentId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalRemarks: data.approvalRemarks,
          approvedBy: userId,
          approverName: data.approverName,
          departments: data.departments,
        }),
      });
      if (!response.ok) throw new Error("Failed to approve document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Document Approved",
        description: "The document has been successfully approved and sent to the issuer.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (data: { documentId: string; declineRemarks: string }) => {
      const response = await fetch(`/api/documents/${data.documentId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declineRemarks: data.declineRemarks }),
      });
      if (!response.ok) throw new Error("Failed to decline document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
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

  const handleView = (doc: Document) => {
    setViewDoc(doc);
    setViewDialogOpen(true);
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
      a.href = url;
      a.download = `${doc.docNumber}_${doc.docName}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: `Downloading ${doc.docName} as Word document...`,
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download Word document",
        variant: "destructive",
      });
    }
  };

  const handleApprove = (doc: Document) => {
    const fullDoc = pendingDocs.find(d => d.id === doc.id) || doc as unknown as ApiDocument;
    setSelectedDoc(fullDoc);
    setApproveDialogOpen(true);
  };

  const handleDecline = (doc: Document) => {
    const fullDoc = pendingDocs.find(d => d.id === doc.id) || doc as unknown as ApiDocument;
    setSelectedDoc(fullDoc);
    setDeclineDialogOpen(true);
  };

  const handleViewPDF = (doc: Document) => {
    setPdfDocId(doc.id);
    setPdfDocName(doc.docName);
    setPdfViewerOpen(true);
  };

  const todayApproved = approvedDocs.filter(doc => {
    const approvedDate = doc.approvedAt ? new Date(doc.approvedAt) : null;
    const today = new Date();
    return approvedDate &&
      approvedDate.getDate() === today.getDate() &&
      approvedDate.getMonth() === today.getMonth() &&
      approvedDate.getFullYear() === today.getFullYear();
  }).length;

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  const transformedDocs: Document[] = pendingDocs.map(doc => ({
    id: doc.id,
    docName: doc.docName,
    docNumber: doc.docNumber,
    status: (doc.status.charAt(0).toUpperCase() + doc.status.slice(1)) as DocumentStatus,
    dateOfIssue: doc.dateOfIssue ? new Date(doc.dateOfIssue).toISOString().split('T')[0] : '',
    revisionNo: doc.revisionNo,
    preparedBy: doc.preparerName || 'Unknown',
    location: doc.location,
    dateOfRev: doc.dateOfRev ? new Date(doc.dateOfRev).toISOString().split('T')[0] : null,
    departments: doc.departments
  }));

  const transformedIssuedDocs: Document[] = issuedDocuments.map(doc => ({
    id: doc.id,
    docName: doc.docName,
    docNumber: doc.docNumber,
    status: "Issued" as const,
    dateOfIssue: doc.dateOfIssue ? new Date(doc.dateOfIssue).toISOString().split('T')[0] : '',
    revisionNo: doc.revisionNo,
    preparedBy: doc.preparerName || 'Unknown',
    location: doc.location,
    dateOfRev: doc.dateOfRev ? new Date(doc.dateOfRev).toISOString().split('T')[0] : null,
    departments: doc.departments
  }));

  const transformedAllIssuedDocs: Document[] = allIssuedDocuments.map(doc => ({
    id: doc.id,
    docName: doc.docName,
    docNumber: doc.docNumber,
    status: "Issued" as const,
    dateOfIssue: doc.dateOfIssue ? new Date(doc.dateOfIssue).toISOString().split('T')[0] : '',
    revisionNo: doc.revisionNo,
    preparedBy: doc.preparerName || 'Unknown',
    location: doc.location,
    dateOfRev: doc.dateOfRev ? new Date(doc.dateOfRev).toISOString().split('T')[0] : null,
    departments: doc.departments
  }));

  return (
    <DashboardLayout
      userRole="Document Approver"
      userName={approverName}
      userId={userId}
      notificationCount={unreadNotifications}
      onLogout={onLogout}
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Pending Approvals</h2>
          <p className="text-xs text-muted-foreground">
            Review and approve documents for issuance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard
            title="Pending Approval"
            value={pendingDocs.length}
            icon={Clock}
            variant="amber"
            trend="Requires your review"
          />
          <StatCard
            title="Approved Today"
            value={todayApproved}
            icon={CheckCircle}
            variant="green"
            trend={`Total approved: ${approvedDocs.length}`}
          />
          <StatCard
            title="Total Reviewed"
            value={approvedDocs.length + pendingDocs.length}
            icon={FileText}
            variant="blue"
            trend="All time documents"
          />
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Documents Awaiting Review</h3>
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold" data-testid="button-export">
              Export Log
            </Button>
          </div>

          {isLoadingDocs ? (
            <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
          ) : transformedDocs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No pending documents</div>
          ) : (
            <DocumentTable
              documents={transformedDocs}
              onView={handleView}
              onViewWord={handleViewWord}
              onDownload={handleDownload}
              onApprove={handleApprove}
              onDecline={handleDecline}
              showLocation={true}
            />
          )}
        </Card>

        <Card className="p-4">
          <Tabs defaultValue="my-department" className="w-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Issued Documents</h3>
              <TabsList>
                <TabsTrigger value="my-department">My Department</TabsTrigger>
                <TabsTrigger value="all-issued">All Issued</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="my-department">
              {transformedIssuedDocs.length > 0 ? (
                <DocumentTable
                  documents={transformedIssuedDocs.slice(0, 10)}
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
            </TabsContent>

            <TabsContent value="all-issued">
              {transformedAllIssuedDocs.length > 0 ? (
                <DocumentTable
                  documents={transformedAllIssuedDocs.slice(0, 10)}
                  onView={handleViewPDF}
                  showActions={true}
                  showLocation={true}
                />
              ) : (
                <div className="border rounded-lg p-12 text-center">
                  <Send className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">No issued documents found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>



        <Card className="p-4">
          <h3 className="text-base font-semibold mb-3">Document Workflow</h3>
          <WorkflowProgress currentStep="Approver" />
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Your Role:</strong> Review documents with auto-generated headers/footers,
              approve or decline with remarks, and select departments for document sharing.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Note:</strong> Issued documents can be printed only once per system policy.
            </p>
          </div>
        </Card>
      </div>

      <ApprovalDialog
        open={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        onApprove={(data) => {
          if (selectedDoc) {
            approveMutation.mutate({
              documentId: selectedDoc.id,
              approvalRemarks: data.remarks,
              departments: data.departments,
              approverName: data.approverName,
            });
          }
          setApproveDialogOpen(false);
        }}
        type="approve"
        title={`Approve: ${selectedDoc?.docName}`}
        approverName={approverName}
        nameFieldLabel="Approved By"
      />

      <ApprovalDialog
        open={declineDialogOpen}
        onClose={() => setDeclineDialogOpen(false)}
        onDecline={(remarks) => {
          if (selectedDoc) {
            declineMutation.mutate({
              documentId: selectedDoc.id,
              declineRemarks: remarks,
            });
          }
          setDeclineDialogOpen(false);
        }}
        type="decline"
        title={`Decline: ${selectedDoc?.docName}`}
      />

      <DocumentViewDialog
        document={viewDoc}
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        onDownload={handleDownload}
      />

      <WordDocumentViewer
        documentId={wordViewDocId}
        open={wordViewerOpen}
        onOpenChange={setWordViewerOpen}
      />

      <PDFViewer
        documentId={pdfDocId}
        userId={userId}
        open={pdfViewerOpen}
        onClose={() => setPdfViewerOpen(false)}
        documentName={pdfDocName}
      />
    </DashboardLayout >
  );
}
