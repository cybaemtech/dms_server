import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import DocumentTable, { Document } from "@/components/DocumentTable";
import WorkflowProgress from "@/components/WorkflowProgress";
import ApprovalDialog from "@/components/ApprovalDialog";
import DocumentViewDialog from "@/components/DocumentViewDialog";
import PDFViewer from "@/components/PDFViewer";
import { WordDocumentViewer } from "@/components/WordDocumentViewer";
import { FileText, Send, Clock, Archive, Search, Building2, Eye, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import ReviewReminders from "@/components/ReviewReminders";
import ActivityFeed from "@/components/ActivityFeed";

interface IssuerDashboardProps {
  onLogout?: () => void;
  userId?: string;
  issuerName?: string;
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
  departments?: Array<{ id: string; name: string; code: string }>;
  content?: string;
  headerInfo?: string;
  footerInfo?: string;
  approvalRemarks?: string;
  declineRemarks?: string;
  issueRemarks?: string;
  previousVersionId?: string;
  previousVersion?: ApiDocument;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  issuedAt?: string;
  location?: string;
  dateOfRev?: string;
  reviewDueDate?: string;
}

interface Notification {
  id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface AdminDocuments {
  documents: ApiDocument[];
  stats: {
    total: number;
    pending: number;
    approved: number;
    issued: number;
    declined: number;
    obsolete: number;
  };
}

export default function IssuerDashboard({ onLogout, userId = "issuer-1", issuerName = "", departmentId = null,
  departmentName = null,
  departmentCode = null,
  masterCopyAccess = false
}: IssuerDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
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
    queryKey: ["/api/documents", "all-issued-issuer", userId],
    queryFn: async () => {
      const response = await fetch(`/api/documents?status=issued&recipientId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch all issued documents");
      return response.json();
    },
    refetchInterval: 10000,
  });

  // BASE data for tabs: docs owned by or shared with my department
  const filteredIssuedDocs = issuedDocuments;

  // My department = Issued documents where the creator belongs to my department (Owned or functionally related)
  const myDeptIssuedDocs = filteredIssuedDocs.filter(doc =>
    (departmentCode && doc.creatorDepartmentCode === departmentCode) ||
    (doc.creatorDepartmentId === departmentId)
  );

  // Other department docs: all issued docs shared with but NOT owned by my department
  const otherDeptDocs = filteredIssuedDocs.filter(doc =>
    !((departmentCode && doc.creatorDepartmentCode === departmentCode) ||
      (doc.creatorDepartmentId === departmentId))
  );

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
    refetchInterval: 5000,
  });

  const { data: adminDocsData } = useQuery<AdminDocuments>({
    queryKey: ["/api/admin/documents"],
    refetchInterval: 10000,
  });

  const allAdminDocs = adminDocsData?.documents || [];

  const activeDocs = allAdminDocs.filter(d =>
    d.status?.toLowerCase() === 'issued'
  );
  const obsoleteDocs = allAdminDocs.filter(d =>
    d.status?.toLowerCase() === 'obsolete'
  );

  const groupDocsByDepartment = (docs: ApiDocument[]) => {
    const groups: Record<string, { name: string, docs: ApiDocument[] }> = {};
    docs.forEach(doc => {
      // Use document's assigned departments primarily for "department-wise" view
      if (doc.departments && doc.departments.length > 0) {
        doc.departments.forEach(dept => {
          if (!groups[dept.id]) {
            groups[dept.id] = { name: dept.name, docs: [] };
          }
          // Avoid duplicate entries (in case of data anomalies)
          if (!groups[dept.id].docs.find(d => d.id === doc.id)) {
            groups[dept.id].docs.push(doc);
          }
        });
      } else {
        // Ultimate fallback for documents with no department data at all
        const deptId = doc.creatorDepartmentId || 'unassigned';
        const groupName = doc.creatorDepartmentName || 'Other/General';

        if (!groups[deptId]) {
          groups[deptId] = { name: groupName, docs: [] };
        }
        if (!groups[deptId].docs.find(d => d.id === doc.id)) {
          groups[deptId].docs.push(doc);
        }
      }
    });
    return Object.entries(groups).sort((a, b) => a[1].name.localeCompare(b[1].name));
  };

  const activeDocsByDept = groupDocsByDepartment(activeDocs);
  const obsoleteDocsByDept = groupDocsByDepartment(obsoleteDocs);

  const issueMutation = useMutation({
    mutationFn: async ({ docId, issuerName, remarks, departments, docNumber }: { docId: string; issuerName: string; remarks: string; departments: string[]; docNumber?: string }) => {
      return apiRequest("POST", `/api/documents/${docId}/issue`, { issuedBy: userId, issuerName, remarks, departments, docNumber });
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", "approved", departmentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", "issued", departmentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      // Force immediate refetch of approved docs
      queryClient.refetchQueries({ queryKey: ["/api/documents", "approved", departmentId] });
      queryClient.refetchQueries({ queryKey: ["/api/documents", "issued", departmentId] });
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
      return apiRequest("POST", `/api/documents/${docId}/decline`, { 
        declineRemarks: remarks,
        declinedBy: userId,
        declinerName: issuerName
      });
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", "approved", departmentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", "issued", departmentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      // Force immediate refetch of approved docs
      queryClient.refetchQueries({ queryKey: ["/api/documents", "approved", departmentId] });
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

  const handleIssueConfirm = (data: { remarks: string; approverName: string; departments: string[]; docNumber?: string }) => {
    if (selectedDoc) {
      issueMutation.mutate({
        docId: selectedDoc.id,
        issuerName: data.approverName,
        remarks: data.remarks,
        departments: data.departments,
        docNumber: data.docNumber,
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

  const allPrevVersionIds = useMemo(() => {
    return new Set(
      [...(approvedDocuments || []), ...(issuedDocuments || []), ...(allIssuedDocuments || [])]
        .map(doc => doc.previousVersionId)
        .filter(Boolean)
    );
  }, [approvedDocuments, issuedDocuments, allIssuedDocuments]);

  const transformedApprovedDocs = (docs: ApiDocument[]): Document[] => {
    return [...docs]
      .filter(doc =>
        (doc.docName || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
        (doc.docNumber || "").toLowerCase().includes((searchQuery || "").toLowerCase())
      )
      .sort((a, b) => {
        const dateA = new Date(a.approvedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.approvedAt || b.createdAt || 0).getTime();
        
        if (sortBy === "newest") return dateB - dateA;
        if (sortBy === "oldest") return dateA - dateB;
        if (sortBy === "doc-asc") return (a.docNumber || "").localeCompare(b.docNumber || "");
        if (sortBy === "doc-desc") return (b.docNumber || "").localeCompare(a.docNumber || "");
        
        return 0;
      })
      .map((doc) => ({
        id: doc.id,
        docName: doc.docName,
        docNumber: doc.docNumber,
        status: doc.status ? (doc.status.charAt(0).toUpperCase() + doc.status.slice(1)) as any : "Approved",
        dateOfIssue: doc.dateOfIssue && !isNaN(new Date(doc.dateOfIssue).getTime())
          ? new Date(doc.dateOfIssue).toISOString().split("T")[0]
          : "",
        revisionNo: doc.revisionNo,
        preparedBy: doc.preparerName || "Unknown",
        location: (doc as any).location,
        dateOfRev: (doc as any).dateOfRev && !isNaN(new Date((doc as any).dateOfRev).getTime())
          ? new Date((doc as any).dateOfRev).toISOString().split('T')[0]
          : null,
        departments: doc.departments,
        previousVersionId: doc.previousVersionId,
        hasRevision: allPrevVersionIds.has(doc.id),
        reviewDueDate: doc.reviewDueDate
      }));
  };

  const transformedIssuedDocs = (docs: ApiDocument[]): Document[] => {
    return [...docs]
      .filter(doc =>
        (doc.docName || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
        (doc.docNumber || "").toLowerCase().includes((searchQuery || "").toLowerCase())
      )
      .sort((a, b) => {
        const dateA = new Date(a.issuedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.issuedAt || b.createdAt || 0).getTime();
        
        if (sortBy === "newest") return dateB - dateA;
        if (sortBy === "oldest") return dateA - dateB;
        if (sortBy === "doc-asc") return (a.docNumber || "").localeCompare(b.docNumber || "");
        if (sortBy === "doc-desc") return (b.docNumber || "").localeCompare(a.docNumber || "");
        
        return 0;
      })
      .map((doc) => ({
        id: doc.id,
        docName: doc.docName,
        docNumber: doc.docNumber,
        status: "Issued" as const,
        dateOfIssue: doc.dateOfIssue && !isNaN(new Date(doc.dateOfIssue).getTime())
          ? new Date(doc.dateOfIssue).toISOString().split("T")[0]
          : "",
        revisionNo: doc.revisionNo,
        preparedBy: doc.preparerName || "Unknown",
        location: (doc as any).location,
        dateOfRev: (doc as any).dateOfRev && !isNaN(new Date((doc as any).dateOfRev).getTime())
          ? new Date((doc as any).dateOfRev).toISOString().split('T')[0]
          : null,
        departments: doc.departments,
        previousVersionId: doc.previousVersionId,
        hasRevision: allPrevVersionIds.has(doc.id),
        reviewDueDate: doc.reviewDueDate
      }));
  };

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  const activities: { id: string; type: "created" | "approved" | "declined" | "issued" | "pending"; docName: string; userName: string; timestamp: string; remarks?: string }[] =
    [...approvedDocuments, ...issuedDocuments]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 8).map(doc => ({
        id: doc.id,
        type: doc.status === "pending" ? "pending" :
          doc.status === "approved" ? "approved" :
            doc.status === "declined" ? "declined" :
              doc.status === "issued" ? "issued" : "created",
        docName: doc.docName,
        userName: doc.preparerName || "Unknown",
        timestamp: doc.createdAt || new Date().toISOString(),
        remarks: doc.approvalRemarks || doc.declineRemarks || doc.issueRemarks
      }));

  const issuedToday = issuedDocuments.filter((doc) => {
    const issuedDate = doc.dateOfIssue ? new Date(doc.dateOfIssue).toDateString() : "";
    return issuedDate === new Date().toDateString();
  }).length;

  const initialSelectedDepartments = useMemo(() =>
    selectedDoc?.departments?.map(d => d.id) || [],
    [selectedDoc]
  );

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
          <h2 className="text-lg font-bold text-foreground">
            Issuer Dashboard ({issuerName || "User"} - {departmentName || "No Department"})
          </h2>
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-3 space-y-4">
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
                  showReviewDue={false}
                />
              ) : (
                <div className="border rounded-lg p-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">No documents ready to issue</p>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <Tabs defaultValue="active" className="w-full">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                  <TabsList className="grid w-full sm:w-[700px] grid-cols-4 bg-slate-100 p-1">
                    <TabsTrigger value="my-dept" className="text-[11px] h-8 px-2">
                      My Dept Document
                    </TabsTrigger>
                    {masterCopyAccess && (
                      <TabsTrigger value="other-dept" className="text-[11px] h-8 px-2">
                        Other Dept Document
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="active" className="text-[11px] h-8 px-2 font-semibold">
                      Active Documents
                    </TabsTrigger>
                    <TabsTrigger value="obsolete" className="text-[11px] h-8 px-2 text-red-600">
                      Obsolete Documents
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="my-dept" className="mt-2">
                  <h4 className="text-sm font-semibold text-foreground mb-2">My Department Issued Documents (Owned)</h4>
                  <DocumentTable
                    documents={transformedIssuedDocs(myDeptIssuedDocs)}
                    onView={handleViewPDF}
                    showActions={true}
                    showLocation={true}
                    showReviewDue={false}
                  />
                </TabsContent>

                <TabsContent value="other-dept" className="mt-2">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Other Department Issued Documents (Shared)</h4>
                  <DocumentTable
                    documents={transformedIssuedDocs(otherDeptDocs)}
                    onView={handleViewPDF}
                    showActions={true}
                    showLocation={true}
                    showReviewDue={false}
                  />
                </TabsContent>

                <TabsContent value="active" className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800">Active Documents by Department</span>
                  </div>

                  {activeDocsByDept.length > 0 ? (
                    <Accordion type="multiple" className="space-y-2">
                      {activeDocsByDept.map(([deptId, { name, docs }]) => (
                        <AccordionItem key={deptId} value={deptId} className="border rounded-lg px-2 overflow-hidden bg-white shadow-sm">
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-sm">{name}</span>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 h-5 px-1.5 min-w-5 justify-center">
                                {docs.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pt-2">
                              <DocumentTable
                                documents={transformedIssuedDocs(docs)}
                                onView={handleViewPDF}
                                showActions={true}
                                showLocation={true}
                                showReviewDue={false}
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="border border-dashed rounded-lg p-12 text-center bg-slate-50">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                      <p className="text-sm text-muted-foreground">No active documents found</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="obsolete" className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <Archive className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-800">Obsolete Documents by Department</span>
                  </div>

                  {obsoleteDocsByDept.length > 0 ? (
                    <Accordion type="multiple" className="space-y-2">
                      {obsoleteDocsByDept.map(([deptId, { name, docs }]) => (
                        <AccordionItem key={deptId} value={deptId} className="border rounded-lg px-2 overflow-hidden bg-white shadow-sm border-red-100">
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-sm text-red-700">{name}</span>
                              <Badge variant="outline" className="text-red-600 border-red-200 h-5 px-1.5 min-w-5 justify-center">
                                {docs.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pt-2">
                              <DocumentTable
                                documents={docs.map(doc => ({
                                  id: doc.id,
                                  docName: doc.docName,
                                  docNumber: doc.docNumber,
                                  status: "Obsolete" as any,
                                  dateOfIssue: doc.dateOfIssue && !isNaN(new Date(doc.dateOfIssue).getTime())
                                    ? new Date(doc.dateOfIssue).toISOString().split("T")[0]
                                    : "",
                                  revisionNo: doc.revisionNo,
                                  preparedBy: doc.preparerName || "Unknown",
                                  location: (doc as any).location,
                                  dateOfRev: (doc as any).dateOfRev && !isNaN(new Date((doc as any).dateOfRev).getTime())
                                    ? new Date((doc as any).dateOfRev).toISOString().split('T')[0]
                                    : null,
                                  departments: doc.departments
                                }))}
                                onView={handleViewPDF}
                                showActions={true}
                                showLocation={true}
                                showReviewDue={false}
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="border border-dashed rounded-lg p-12 text-center bg-slate-50">
                      <Archive className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                      <p className="text-sm text-muted-foreground">No obsolete documents found</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>

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

          <div className="space-y-4">
            <ActivityFeed activities={activities} maxItems={8} />
            <ReviewReminders daysAhead={60} />
          </div>
        </div>
      </div>

      <ApprovalDialog
        open={issueDialogOpen}
        onClose={() => setIssueDialogOpen(false)}
        onApprove={handleIssueConfirm}
        type="approve"
        title={`Issue Document: ${selectedDoc?.docName}`}
        approverName={issuerName}
        nameFieldLabel="Issued By"
        initialSelectedDepartments={initialSelectedDepartments}
        initialDocNumber={selectedDoc?.docNumber || ""}
        isRevision={!!selectedDoc?.previousVersionId}
        submitButtonLabel="Issued"
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
        onDownload={handleDownload}
        onViewWord={handleViewWord}
        onViewPdf={handleViewPDF}
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
