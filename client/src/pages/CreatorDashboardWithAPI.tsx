import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import DocumentTable, { Document } from "@/components/DocumentTable";
import PDFViewer from "@/components/PDFViewer";
import ActivityFeed from "@/components/ActivityFeed";
import DocumentViewDialog from "@/components/DocumentViewDialog";
import DocumentEditDialog from "@/components/DocumentEditDialog";
import { WordDocumentViewer } from "@/components/WordDocumentViewer";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import ReviewReminders from "@/components/ReviewReminders";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Clock, CheckCircle, Send, Plus, Search, RefreshCw, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentStatus } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";

interface CreatorDashboardProps {
  onCreateDocument?: (initialData?: any) => void;
  onLogout?: () => void;
  userId?: string;
  userName?: string;
  departmentId?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  masterCopyAccess?: boolean;
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
  creatorDepartmentId?: string | null;
  creatorDepartmentName?: string | null;
  creatorDepartmentCode?: string | null;
  location?: string;
  departments?: Array<{ id: string; name: string; code: string }>;
  content?: string;
  headerInfo?: string;
  footerInfo?: string;
  approvalRemarks?: string;
  declineRemarks?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  issuedAt?: string;
  dateOfRev?: string;
  reviewDueDate?: string;
  duePeriodYears?: number;
  reasonForRevision?: string;
  previousVersionId?: string | null;
}

interface Activity {
  id: string;
  type: "created" | "approved" | "declined" | "issued" | "pending";
  docName: string;
  userName: string;
  timestamp: string;
  remarks?: string;
}

interface Notification {
  id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function CreatorDashboardWithAPI({
  onCreateDocument,
  onLogout,
  userId = "creator-1",
  userName = "Creator User",
  departmentId = null,
  departmentName = null,
  departmentCode = null,
  masterCopyAccess = false
}: CreatorDashboardProps) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ApiDocument | null>(null);
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [wordViewDocId, setWordViewDocId] = useState<string>("");
  const [wordViewerOpen, setWordViewerOpen] = useState(false);
  const [pdfDocId, setPdfDocId] = useState<string>("");
  const [pdfDocName, setPdfDocName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [reviseSearch, setReviseSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myDocuments = [], isLoading: myDocsLoading } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", userId],
    queryFn: async () => {
      const response = await fetch(`/api/documents?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
    refetchInterval: 5000,
  });

  // "My Department" = docs issued to this user's department
  const { data: myDeptIssuedDocuments = [], isLoading: myDeptLoading } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", "my-dept-issued", departmentId],
    queryFn: async () => {
      const url = departmentId
        ? `/api/documents/department/${departmentId}?status=issued`
        : `/api/documents?status=issued`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch department issued documents");
      return response.json();
    },
    refetchInterval: 10000,
  });

  const { data: allIssuedDocuments = [], isLoading: allIssuedLoading } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", "all-issued", userId],
    queryFn: async () => {
      const response = await fetch(`/api/documents?status=issued&recipientId=${userId}`);
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

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Document Deleted",
        description: "The document has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    },
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const formData = new FormData();
      if (data.docName !== undefined) formData.append('docName', data.docName);
      if (data.docNumber !== undefined) formData.append('docNumber', data.docNumber);
      if (data.dateOfIssue !== undefined) formData.append('dateOfIssue', data.dateOfIssue);
      // Handle both names for revision number
      const rev = data.revisionNo !== undefined ? data.revisionNo : data.revisionNumber;
      if (rev !== undefined) formData.append('revisionNo', rev.toString());

      if (data.preparerName !== undefined) formData.append('preparerName', data.preparerName);
      if (data.location !== undefined) formData.append('location', data.location);
      if (data.duePeriodYears !== undefined) formData.append('duePeriodYears', data.duePeriodYears.toString());
      if (data.reasonForRevision !== undefined) formData.append('reasonForRevision', data.reasonForRevision);
      if (data.dateOfRev !== undefined) formData.append('dateOfRev', data.dateOfRev);
      if (data.reviewDueDate !== undefined) formData.append('reviewDueDate', data.reviewDueDate);

      if (data.file) {
        formData.append('file', data.file);
      }

      if (data.departments !== undefined && Array.isArray(data.departments)) {
        formData.append('departments', JSON.stringify(data.departments));
      }

      const response = await fetch(`/api/documents/${id}`, {
        method: "PUT", // Reverted to PUT since we're often doing a full replacement or significant update with file
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to update document");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", "my-dept-issued", departmentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", "all-issued"] });
      // Force immediate refetch of data
      queryClient.refetchQueries({ queryKey: ["/api/documents", userId] });
      toast({
        title: "Document Updated",
        description: "The document has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update document.",
        variant: "destructive",
      });
    },
  });

  const pendingDocs = myDocuments.filter(doc => (doc.status || "").toLowerCase() === "pending");
  const declinedDocs = myDocuments.filter(doc => (doc.status || "").toLowerCase() === "declined");
  const issuedDocs = myDocuments.filter(doc => (doc.status || "").toLowerCase() === "issued");
  const obsoleteDocs = myDocuments.filter(doc => (doc.status || "").toLowerCase() === "obsolete");

  // Revised documents: docs that have a previousVersionId (auto-calculated from document info)
  const revisedDocs = myDocuments.filter(doc => doc.previousVersionId);

  // Combined data for Issued Documents tabs to ensure consistent filtering and no overlap
  const allRelevantIssuedDocs = useMemo(() => {
    const combined = [...allIssuedDocuments, ...myDeptIssuedDocuments];
    const unique = new Map<string, ApiDocument>();
    combined.forEach(doc => {
      if (doc && doc.id) unique.set(doc.id, doc);
    });
    return Array.from(unique.values());
  }, [allIssuedDocuments, myDeptIssuedDocuments]);

  // My Department documents: Only documents prepared by our department
  const myDeptDocuments = allRelevantIssuedDocs.filter(doc => {
    return (departmentId && doc.creatorDepartmentId === departmentId) ||
           (departmentCode && doc.creatorDepartmentCode === departmentCode);
  });

  // Other Department documents: Documents prepared by other departments
  const otherDeptDocs = allRelevantIssuedDocs.filter(doc => {
    return !(
      (departmentId && doc.creatorDepartmentId === departmentId) ||
      (departmentCode && doc.creatorDepartmentCode === departmentCode)
    );
  });

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  const allPrevVersionIds = useMemo(() => {
    return new Set(
      [...(myDocuments || []), ...(allIssuedDocuments || [])]
        .map(doc => doc.previousVersionId)
        .filter(Boolean)
    );
  }, [myDocuments, allIssuedDocuments]);

  const transformedDocs = (docs: ApiDocument[], dateField: keyof ApiDocument = 'createdAt'): Document[] => {
    return (docs || [])
      .filter(doc =>
        (doc.docName || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
        (doc.docNumber || "").toLowerCase().includes((searchQuery || "").toLowerCase())
      )
      .sort((a, b) => {
        const dateA = new Date((a[dateField] as string) || (a.createdAt as string) || 0).getTime();
        const dateB = new Date((b[dateField] as string) || (b.createdAt as string) || 0).getTime();
        
        if (sortBy === "newest") return dateB - dateA;
        if (sortBy === "oldest") return dateA - dateB;
        if (sortBy === "doc-asc") return (a.docNumber || "").localeCompare(b.docNumber || "");
        if (sortBy === "doc-desc") return (b.docNumber || "").localeCompare(a.docNumber || "");
        
        return 0;
      })
      .map(doc => {
        let statusDisplay: DocumentStatus = "Pending";
        if (doc.status) {
          statusDisplay = (doc.status.charAt(0).toUpperCase() + doc.status.slice(1)) as DocumentStatus;
        }

        let dateOfIssue = "";
        try {
          if (doc.dateOfIssue) {
            const date = new Date(doc.dateOfIssue);
            if (!isNaN(date.getTime())) {
              dateOfIssue = date.toISOString().split('T')[0];
            }
          }
        } catch (e) {
          console.error("Error formatting dateOfIssue", e);
        }

        let dateOfRev = null;
        try {
          if (doc.dateOfRev) {
            const date = new Date(doc.dateOfRev);
            if (!isNaN(date.getTime())) {
              dateOfRev = date.toISOString().split('T')[0];
            }
          }
        } catch (e) {
          console.error("Error formatting dateOfRev", e);
        }

        return {
          id: doc.id,
          docName: doc.docName || 'Untitled',
          docNumber: doc.docNumber || 'NO-NUMBER',
          status: statusDisplay,
          dateOfIssue: dateOfIssue,
          revisionNo: doc.revisionNo || 0,
          preparedBy: doc.preparerName || 'Unknown',
          location: doc.location || null,
          dateOfRev: dateOfRev,
          departments: doc.departments || [],
          previousVersionId: doc.previousVersionId,
          hasRevision: allPrevVersionIds.has(doc.id),
          reviewDueDate: doc.reviewDueDate
        };
      });
  };

  const activities: Activity[] = [...myDocuments]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 8)
    .map(doc => ({
      id: doc.id,
      type: doc.status === "pending" ? "pending" :
        doc.status === "approved" ? "approved" :
          doc.status === "declined" ? "declined" :
            doc.status === "issued" ? "issued" : "created",
      docName: doc.docName,
      userName: doc.preparerName || "Unknown",
      timestamp: doc.createdAt || new Date().toISOString(),
      remarks: doc.approvalRemarks || doc.declineRemarks
    }));

  const handleView = (doc: Document) => {
    setViewDoc(doc);
    setViewDialogOpen(true);
  };

  const handleViewWord = (doc: Document) => {
    setWordViewDocId(doc.id);
    setWordViewerOpen(true);
  };

  const handleEdit = (doc: Document) => {
    const fullDoc = myDocuments.find(d => d.id === doc.id);
    if (fullDoc) {
      setSelectedDoc(fullDoc);
      setEditDialogOpen(true);
    }
  };

  const handleRevise = (doc: Document) => {
    const fullDoc = allIssuedDocuments.find(d => d.id === doc.id) || myDeptIssuedDocuments.find(d => d.id === doc.id) || myDocuments.find(d => d.id === doc.id);
    if (fullDoc) {
      onCreateDocument?.({
        docName: fullDoc.docName,
        docNumber: fullDoc.docNumber,
        dateOfIssue: fullDoc.dateOfIssue,
        location: fullDoc.location || "",
        previousVersionId: fullDoc.id
      });
    }
  };

  const handleDelete = (doc: Document) => {
    const fullDoc = myDocuments.find(d => d.id === doc.id);
    if (fullDoc) {
      setSelectedDoc(fullDoc);
      setDeleteDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (selectedDoc) {
      deleteMutation.mutate(selectedDoc.id);
      setDeleteDialogOpen(false);
      setSelectedDoc(null);
    }
  };

  const handleViewPDF = (doc: Document) => {
    setPdfDocId(doc.id);
    setPdfDocName(doc.docName);
    setPdfViewerOpen(true);
  };

  const handleSaveEdit = async (id: string, data: any) => {
    console.log(`[Dashboard] Mutualting document update for ID: ${id}`, data);
    try {
      await updateMutation.mutateAsync({ id, data });
      setEditDialogOpen(false);
      setSelectedDoc(null);
    } catch (e) {
      console.error("Error updating document", e);
    }
  };

  const handleDownload = (doc: Document) => {
    // For all statuses, download the Word file
    window.open(`/api/documents/${doc.id}/download`, "_blank");
    toast({
      title: "Download Started",
      description: `Downloading ${doc.docName} as Word document...`,
    });
  };


  return (
    <DashboardLayout
      userRole="Document Creator"
      userName={userName}
      userId={userId}
      notificationCount={unreadNotifications}
      onLogout={onLogout}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Creator Dashboard ({userName || "User"} - {departmentName || "No Department"})
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Manage your document lifecycle and view issued documents.
              <span className="block mt-0.5 font-semibold">Note: Issued documents can be printed only once per system policy.</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs px-3" onClick={() => onCreateDocument?.()} data-testid="button-create-document">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Document
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs px-3 border-primary text-primary hover:bg-primary/5" onClick={() => setReviseDialogOpen(true)} data-testid="button-revise-document">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Revise Document
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          <StatCard
            title="Total"
            value={myDocuments.length}
            icon={FileText}
            variant="blue"
          />
          <StatCard
            title="Revised"
            value={revisedDocs.length}
            icon={RefreshCw}
            variant="green"
          />
          <StatCard
            title="Pending"
            value={pendingDocs.length}
            icon={Clock}
            variant="amber"
          />
          <StatCard
            title="Reject"
            value={declinedDocs.length}
            icon={XCircle}
            variant="red"
          />
          <StatCard
            title="Issued"
            value={issuedDocs.length}
            icon={Send}
            variant="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search documents by title or number..."
                  className="pl-8 h-8 text-[11px] bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-md">
                <span className="text-[10px] font-medium text-muted-foreground pl-1">Sort:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-6 w-[110px] text-[10px] bg-white border-0 shadow-none">
                    <SelectValue placeholder="Sort order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="doc-asc">Document No. (A-Z)</SelectItem>
                    <SelectItem value="doc-desc">Document No. (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="my-department" className="w-full">
              <TabsList className="h-8 p-0.5 bg-slate-100">
                <TabsTrigger value="my-department" className="text-[11px] h-7 px-2">
                  My Department Document
                </TabsTrigger>
                {(masterCopyAccess || otherDeptDocs.length > 0) && (
                   <TabsTrigger value="other-department" className="text-[11px] h-7 px-2">
                     Other Department Document
                   </TabsTrigger>
                 )}
                <TabsTrigger value="pending" className="text-[11px] h-7 px-2">
                  Pending ({pendingDocs.length})
                </TabsTrigger>
                <TabsTrigger value="declined" className="text-[11px] h-7 px-2">
                  Decline ({declinedDocs.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my-department" className="mt-2">
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  {departmentName ? `My Department (${departmentName}) — Issued Documents` : "My Department — Issued Documents"}
                </h4>
                {myDeptLoading ? (
                  <div className="h-48 flex items-center justify-center border rounded-md border-dashed">
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <DocumentTable
                    documents={transformedDocs(myDeptDocuments, 'issuedAt')}
                    onView={handleViewPDF}
                    onViewWord={handleViewWord}
                    onDownload={handleDownload}
                    onRevise={handleRevise}
                    showActions={true}
                    showLocation={true}
                    showReviewDue={false}
                  />
                )}
              </TabsContent>

              <TabsContent value="other-department" className="mt-2">
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Other Department Documents
                </h4>
                {allIssuedLoading ? (
                  <div className="h-48 flex items-center justify-center border rounded-md border-dashed">
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <DocumentTable
                    documents={transformedDocs(otherDeptDocs, 'issuedAt')}
                    onView={handleViewPDF}
                    onViewWord={handleViewWord}
                    onDownload={handleDownload}
                    showActions={true}
                    showLocation={true}
                    showReviewDue={false}
                  />
                )}
              </TabsContent>

              <TabsContent value="pending" className="mt-2">
                {myDocsLoading ? (
                  <div className="h-48 flex items-center justify-center border rounded-md border-dashed">
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <DocumentTable
                    documents={transformedDocs(pendingDocs, 'createdAt')}
                    onView={handleView}
                    onViewWord={handleViewWord}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDownload={handleDownload}
                    canEdit={true}
                    canDelete={true}
                    showLocation={true}
                    showReviewDue={false}
                  />
                )}
              </TabsContent>

              <TabsContent value="declined" className="mt-2">
                <DocumentTable
                  documents={transformedDocs(declinedDocs, 'updatedAt')}
                  onView={handleView}
                  onViewWord={handleViewWord}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                  canEdit={true}
                  canDelete={true}
                  showLocation={true}
                  showReviewDue={false}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <ActivityFeed activities={activities} maxItems={8} />
            <ReviewReminders daysAhead={60} />
          </div>
        </div>
      </div>

      <DocumentViewDialog
        document={viewDoc}
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        onDownload={handleDownload}
        onViewWord={handleViewWord}
        onViewPdf={handleViewPDF}
      />

      <DocumentEditDialog
        doc={selectedDoc ? {
          id: selectedDoc.id,
          docName: selectedDoc.docName,
          docNumber: selectedDoc.docNumber,
          status: (selectedDoc.status.charAt(0).toUpperCase() + selectedDoc.status.slice(1)) as DocumentStatus,
          dateOfIssue: selectedDoc.dateOfIssue ? new Date(selectedDoc.dateOfIssue).toISOString().split('T')[0] : '',
          revisionNo: selectedDoc.revisionNo,
          preparedBy: selectedDoc.preparerName || 'Unknown',
          location: selectedDoc.location,
          dateOfRev: selectedDoc.dateOfRev,
          reviewDueDate: selectedDoc.reviewDueDate,
          duePeriodYears: selectedDoc.duePeriodYears,
          reasonForRevision: selectedDoc.reasonForRevision,
          departments: selectedDoc.departments
        } : null}
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleSaveEdit}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Document"
        description={`Delete "${selectedDoc?.docName}"? This cannot be undone.`}
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
        onOpenChange={(open) => setWordViewerOpen(open)}
      />

      <Dialog open={reviseDialogOpen} onOpenChange={setReviseDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-revise-document">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Revise Document
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Select an issued document to create a new revision.</p>
              <div className="relative mt-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Document Title or Number..."
                  className="pl-8 h-9 text-xs"
                  value={reviseSearch}
                  onChange={(e) => setReviseSearch(e.target.value)}
                  data-testid="input-revise-search"
                />
              </div>
            </div>
            <div className="border border-slate-200 rounded-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-bold text-slate-700 uppercase tracking-wider">Document Title</th>
                    <th className="px-4 py-2.5 text-left font-bold text-slate-700 uppercase tracking-wider">Doc No.</th>
                    <th className="px-4 py-2.5 text-left font-bold text-slate-700 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-2.5 text-left font-bold text-slate-700 uppercase tracking-wider text-center">Rev No</th>
                    <th className="px-4 py-2.5 text-left font-bold text-slate-700 uppercase tracking-wider">Revision Date</th>
                    <th className="px-4 py-2.5 text-right font-bold text-slate-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myDeptIssuedDocuments.filter(doc =>
                    doc.creatorDepartmentId === departmentId && (
                      (doc.docName || "").toLowerCase().includes(reviseSearch.toLowerCase()) ||
                      (doc.docNumber || "").toLowerCase().includes(reviseSearch.toLowerCase())
                    )
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                        {myDeptIssuedDocuments.filter(d => d.creatorDepartmentId === departmentId).length === 0
                          ? "No issued documents from your department available for revision."
                          : "No documents match your search."}
                      </td>
                    </tr>
                  ) : (
                    myDeptIssuedDocuments
                      .filter(doc =>
                        doc.creatorDepartmentId === departmentId && (
                          (doc.docName || "").toLowerCase().includes(reviseSearch.toLowerCase()) ||
                          (doc.docNumber || "").toLowerCase().includes(reviseSearch.toLowerCase())
                        )
                      )
                      .map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">{doc.docName}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{doc.docNumber}</td>
                          <td className="px-4 py-3 text-slate-600">{doc.location || 'Common'}</td>
                          <td className="px-4 py-3 text-center font-mono text-slate-600">{doc.revisionNo}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {doc.dateOfRev ? new Date(doc.dateOfRev).toLocaleDateString('en-GB') :
                              (doc.dateOfIssue ? new Date(doc.dateOfIssue).toLocaleDateString('en-GB') : '-')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              className="h-7 text-[10px] px-3 font-medium"
                              onClick={() => {
                                handleRevise({
                                  id: doc.id,
                                  docName: doc.docName,
                                  docNumber: doc.docNumber,
                                  status: "Issued",
                                  dateOfIssue: doc.dateOfIssue,
                                  revisionNo: doc.revisionNo,
                                  preparedBy: doc.preparerName || 'Unknown',
                                  location: doc.location
                                });
                                setReviseDialogOpen(false);
                              }}
                            >
                              Revise
                            </Button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
