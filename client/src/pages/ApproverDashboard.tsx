import { useState, useEffect, useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { DocumentStatus } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown, Filter, XCircle, Clock, CheckCircle, FileText, Download, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApproverDashboardProps {
  onLogout?: () => void;
  userId?: string;
  approverName?: string;
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
  departments?: Array<{ id: string; name: string; code?: string }>;
  approvedAt?: string;
  issuedAt?: string;
  createdAt?: string;
  location?: string;
  dateOfRev?: string;
  creatorDepartmentId?: string | null;
  creatorDepartmentCode?: string | null;
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
  departmentName = null,
  departmentCode = null,
  masterCopyAccess = false
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
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

  const { data: allIssuedDocuments = [], isLoading: allIssuedLoading } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", "all-issued-approver", userId],
    queryFn: async () => {
      const response = await fetch(`/api/documents?status=issued&recipientId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch all issued documents");
      return response.json();
    },
    refetchInterval: 10000,
  });

  const { data: declinedDocs = [] } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", "declined", departmentId],
    queryFn: async () => {
      const url = departmentId
        ? `/api/documents/department/${departmentId}?status=declined`
        : "/api/documents?status=declined";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch declined documents");
      return response.json();
    },
    refetchInterval: 10000,
  });

  const { data: obsoleteDocs = [] } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", "obsolete", departmentId],
    queryFn: async () => {
      const url = departmentId
        ? `/api/documents/department/${departmentId}?status=obsolete`
        : "/api/documents?status=obsolete";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch obsolete documents");
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
        body: JSON.stringify({
          declineRemarks: data.declineRemarks,
          declinedBy: userId,
          declinerName: approverName
        }),
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

  const handleViewPDF = (doc: Document) => {
    setPdfDocId(doc.id);
    setPdfDocName(doc.docName);
    setPdfViewerOpen(true);
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


  const todayApproved = approvedDocs.filter(doc => {
    const approvedDate = doc.approvedAt ? new Date(doc.approvedAt) : null;
    const today = new Date();
    return approvedDate &&
      approvedDate.getDate() === today.getDate() &&
      approvedDate.getMonth() === today.getMonth() &&
      approvedDate.getFullYear() === today.getFullYear();
  }).length;

  const allRelevantIssuedDocs = useMemo(() => {
    // Combine all sources of issued documents and de-duplicate
    const combined = [...issuedDocuments, ...allIssuedDocuments];
    const unique = new Map<string, ApiDocument>();
    combined.forEach(doc => {
      if (doc && doc.id) unique.set(doc.id, doc);
    });
    return Array.from(unique.values());
  }, [issuedDocuments, allIssuedDocuments]);

  const myDeptDocs = useMemo(() => {
    return allRelevantIssuedDocs.filter(doc => {
      return (departmentId && doc.creatorDepartmentId === departmentId) ||
             (departmentCode && doc.creatorDepartmentCode === departmentCode);
    });
  }, [allRelevantIssuedDocs, departmentId, departmentCode]);

  const otherDeptDocs = useMemo(() => {
    return allRelevantIssuedDocs.filter(doc => {
      return !(
        (departmentId && doc.creatorDepartmentId === departmentId) ||
        (departmentCode && doc.creatorDepartmentCode === departmentCode)
      );
    });
  }, [allRelevantIssuedDocs, departmentId, departmentCode]);

  const sortDocs = (docs: ApiDocument[]) => {
    return [...docs].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();

      if (sortBy === "newest") return dateB - dateA;
      if (sortBy === "oldest") return dateA - dateB;
      if (sortBy === "doc-asc") return (a.docNumber || "").localeCompare(b.docNumber || "");
      if (sortBy === "doc-desc") return (b.docNumber || "").localeCompare(a.docNumber || "");
      return 0;
    });
  };

  const transformAndFilter = (docs: ApiDocument[]): Document[] => {
    const sorted = sortDocs(docs);
    const filtered = !searchQuery ? sorted : sorted.filter(d =>
      (d.docName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.docNumber || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.map(doc => ({
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
  };

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

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
          <h2 className="text-lg font-bold text-foreground">
            Approver Dashboard ({approverName || "User"} - {departmentName || "No Department"})
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Complete document oversight and approval workflow
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <StatCard
            title="Pending Approval"
            value={pendingDocs.length}
            icon={Clock}
            variant="amber"
          />
          <StatCard
            title="Approved Today"
            value={todayApproved}
            icon={CheckCircle}
            variant="green"
          />
          <StatCard
            title="Declined"
            value={declinedDocs.length}
            icon={XCircle}
            variant="red"
          />
          <StatCard
            title="Total Reviewed"
            value={approvedDocs.length + pendingDocs.length + declinedDocs.length}
            icon={FileText}
            variant="blue"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-end md:items-center justify-between mb-4 mt-6">
          <div className="relative flex-1 max-w-sm w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              className="pl-9 h-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">Sort By:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 w-[140px] text-[11px]">
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="doc-asc">Document No. (A-Z)</SelectItem>
                <SelectItem value="doc-desc">Document No. (Z-A)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 font-bold">
              <Download className="w-3.5 h-3.5" />
              <span className="text-xs">Export Log</span>
            </Button>
          </div>
        </div>

        <Card className="p-3.5 border-slate-200">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="bg-slate-100 p-0.5 h-9 mb-4">
              <TabsTrigger value="my-department" className="text-xs h-8 px-4">My Department Document</TabsTrigger>
              {(masterCopyAccess || otherDeptDocs.length > 0) && (
                <TabsTrigger value="other-department" className="text-xs h-8 px-4">Other Department Document</TabsTrigger>
              )}
              <TabsTrigger value="pending" className="text-xs h-8 px-4 font-bold">Pending ({pendingDocs.length})</TabsTrigger>
              <TabsTrigger value="declined" className="text-xs h-8 px-4 text-red-600">Decline ({declinedDocs.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="my-department">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[13px] font-bold text-foreground">My Department Issued Documents</h4>
                <Badge variant="outline" className="text-[10px] bg-green-50">{myDeptDocs.length} Active</Badge>
              </div>
              <DocumentTable
                documents={transformAndFilter(myDeptDocs)}
                onView={handleViewPDF}
                showActions={true}
                showLocation={true}
              />
            </TabsContent>

            <TabsContent value="other-department">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[13px] font-bold text-foreground">Other Department Issued Documents</h4>
                <Badge variant="outline" className="text-[10px] bg-blue-50">{otherDeptDocs.length} Shared</Badge>
              </div>
              <DocumentTable
                documents={transformAndFilter(otherDeptDocs)}
                onView={handleViewPDF}
                showActions={true}
                showLocation={true}
              />
            </TabsContent>

            <TabsContent value="pending">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[13px] font-bold text-foreground">Documents Awaiting Your Review</h4>
                <Badge variant="outline" className="text-[10px] bg-amber-50">{pendingDocs.length} Pending</Badge>
              </div>
              {isLoadingDocs ? (
                <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
              ) : pendingDocs.length === 0 ? (
                <div className="border rounded-lg p-12 text-center bg-slate-50/50">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                  <p className="text-sm text-muted-foreground">No pending documents</p>
                </div>
              ) : (
                <DocumentTable
                  documents={transformAndFilter(pendingDocs)}
                  onView={handleView}
                  onViewWord={handleViewWord}
                  onDownload={handleDownload}
                  onApprove={handleApprove}
                  onDecline={handleDecline}
                  showLocation={true}
                />
              )}
            </TabsContent>

            <TabsContent value="declined">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[13px] font-bold text-red-700">Declined Documents</h4>
                <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">{declinedDocs.length} Declined</Badge>
              </div>
              {declinedDocs.length === 0 ? (
                <div className="border rounded-lg p-12 text-center bg-slate-50/50">
                  <XCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                  <p className="text-sm text-muted-foreground">No declined documents</p>
                </div>
              ) : (
                <DocumentTable
                  documents={transformAndFilter(declinedDocs)}
                  onView={handleView}
                  onViewWord={handleViewWord}
                  onDownload={handleDownload}
                  showLocation={true}
                />
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
        initialDocNumber={selectedDoc?.docNumber || ""}
        initialSelectedDepartments={selectedDoc?.departments?.map(d => d.id) || []}
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
        onViewPdf={handleViewPDF}
        onViewWord={handleViewWord}
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
