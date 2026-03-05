import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import DocumentTable, { Document } from "@/components/DocumentTable";
import ActivityFeed from "@/components/ActivityFeed";
import DocumentViewDialog from "@/components/DocumentViewDialog";
import DocumentEditDialog from "@/components/DocumentEditDialog";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import ReviewReminders from "@/components/ReviewReminders";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Clock, CheckCircle, Send, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentStatus } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";

interface CreatorDashboardProps {
  onCreateDocument?: (initialData?: any) => void;
  onLogout?: () => void;
  userId?: string;
  userName?: string;
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
  location?: string;
  departments?: Array<{ id: string; name: string }>;
  content?: string;
  headerInfo?: string;
  footerInfo?: string;
  approvalRemarks?: string;
  declineRemarks?: string;
  createdAt?: string;
  updatedAt?: string;
  dateOfRev?: string;
  reviewDueDate?: string;
  duePeriodYears?: number;
  reasonForRevision?: string;
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
  userName = "Creator User"
}: CreatorDashboardProps) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ApiDocument | null>(null);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  const { data: allIssuedDocuments = [], isLoading: allIssuedLoading } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", "all-issued"],
    queryFn: async () => {
      const response = await fetch(`/api/documents?status=issued`);
      if (!response.ok) throw new Error("Failed to fetch issued documents");
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
      queryClient.invalidateQueries({ queryKey: ["/api/documents", userId] });
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
      const response = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docName: data.docName,
          docNumber: data.docNumber,
          dateOfIssue: data.dateOfIssue,
          revisionNo: data.revisionNumber,
          preparerName: data.preparerName,
          location: data.location,
          duePeriodYears: data.duePeriodYears,
          reasonForRevision: data.reasonForRevision,
          dateOfRev: data.dateOfRev,
          reviewDueDate: data.reviewDueDate
        }),
      });
      if (!response.ok) throw new Error("Failed to update document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
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

  const pendingDocs = myDocuments.filter(doc => doc.status === "pending");
  const approvedDocs = myDocuments.filter(doc => doc.status === "approved");
  const declinedDocs = myDocuments.filter(doc => doc.status === "declined");
  const issuedDocs = myDocuments.filter(doc => doc.status === "issued");
  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  const handleView = (doc: Document) => {
    setViewDoc(doc);
    setViewDialogOpen(true);
  };

  const handleEdit = (doc: Document) => {
    const fullDoc = myDocuments.find(d => d.id === doc.id);
    if (fullDoc) {
      setSelectedDoc(fullDoc);
      setEditDialogOpen(true);
    }
  };

  const handleRevise = (doc: Document) => {
    const fullDoc = allIssuedDocuments.find(d => d.id === doc.id) || myDocuments.find(d => d.id === doc.id);
    if (fullDoc) {
      onCreateDocument?.({
        docName: fullDoc.docName,
        docNumber: fullDoc.docNumber,
        revisionNumber: (fullDoc.revisionNo + 1).toString(),
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

  const handleSaveEdit = (docId: string, data: any) => {
    updateMutation.mutate({ id: docId, data });
    setEditDialogOpen(false);
    setSelectedDoc(null);
  };

  const handleDownload = (doc: Document) => {
    if (doc.status === "Issued") {
      // Use the specific PDF endpoint for issued documents to get the header/footer
      window.open(`/api/documents/${doc.id}/pdf?userId=${userId}`, "_blank");
    } else {
      // For other statuses, just download the Word file if available
      window.open(`/api/documents/${doc.id}/download`, "_blank");
    }
    toast({
      title: "Download Started",
      description: `Downloading ${doc.docName}...`,
    });
  };

  const transformedDocs = (docs: ApiDocument[]): Document[] => {
    return docs
      .filter(doc =>
        doc.docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.docNumber.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map(doc => ({
        id: doc.id,
        docName: doc.docName,
        docNumber: doc.docNumber,
        status: (doc.status.charAt(0).toUpperCase() + doc.status.slice(1)) as DocumentStatus,
        dateOfIssue: doc.dateOfIssue ? new Date(doc.dateOfIssue).toISOString().split('T')[0] : '',
        revisionNo: doc.revisionNo,
        preparedBy: doc.preparerName || 'Unknown',
        location: doc.location,
        dateOfRev: doc.dateOfRev ? new Date(doc.dateOfRev).toISOString().split('T')[0] : null
      }));
  };

  const activities: Activity[] = myDocuments.slice(0, 8).map(doc => ({
    id: doc.id,
    type: doc.status === "pending" ? "pending" :
      doc.status === "approved" ? "approved" :
        doc.status === "declined" ? "declined" :
          doc.status === "issued" ? "issued" : "created",
    docName: doc.docName,
    userName: doc.preparerName || userName,
    timestamp: doc.createdAt ? new Date(doc.createdAt).toLocaleString() : "Recently",
    remarks: doc.approvalRemarks || doc.declineRemarks
  }));

  return (
    <DashboardLayout
      userRole="Document Creator"
      userName={userName}
      userId={userId}
      notificationCount={unreadNotifications}
      onLogout={onLogout}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Creator Dashboard</h2>
            <p className="text-xs text-muted-foreground">
              Manage your document lifecycle and view issued documents
            </p>
          </div>
          <Button size="sm" onClick={() => onCreateDocument?.()} data-testid="button-create-document">
            <Plus className="w-4 h-4 mr-1.5" />
            New Document
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title="Total"
            value={myDocuments.length}
            icon={FileText}
            variant="blue"
          />
          <StatCard
            title="Pending"
            value={pendingDocs.length}
            icon={Clock}
            variant="amber"
          />
          <StatCard
            title="Ready"
            value={approvedDocs.length}
            icon={CheckCircle}
            variant="green"
          />
          <StatCard
            title="Issued"
            value={issuedDocs.length}
            icon={Send}
            variant="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents by name or number..."
                className="pl-8 h-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="h-9 p-1">
                <TabsTrigger value="pending" className="text-xs px-3">
                  Pending ({pendingDocs.length})
                </TabsTrigger>
                <TabsTrigger value="approved" className="text-xs px-3">
                  Approved ({approvedDocs.length})
                </TabsTrigger>
                <TabsTrigger value="issued" className="text-xs px-3">
                  Active (All)
                </TabsTrigger>
                <TabsTrigger value="declined" className="text-xs px-3">
                  Declined
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-2">
                {myDocsLoading ? (
                  <div className="h-48 flex items-center justify-center border rounded-md border-dashed">
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <DocumentTable
                    documents={transformedDocs(pendingDocs)}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDownload={handleDownload}
                    canEdit={true}
                    canDelete={true}
                    showLocation={true}
                  />
                )}
              </TabsContent>

              <TabsContent value="approved" className="mt-2">
                <DocumentTable
                  documents={transformedDocs(approvedDocs)}
                  onView={handleView}
                  onDownload={handleDownload}
                  showLocation={true}
                />
              </TabsContent>

              <TabsContent value="issued" className="mt-2">
                <DocumentTable
                  documents={transformedDocs(allIssuedDocuments)}
                  onView={handleView}
                  onDownload={handleDownload}
                  onRevise={handleRevise}
                  showLocation={true}
                />
              </TabsContent>

              <TabsContent value="declined" className="mt-2">
                <DocumentTable
                  documents={transformedDocs(declinedDocs)}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                  canEdit={true}
                  canDelete={true}
                  showLocation={true}
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
        currentUserId={userId}
      />

      <DocumentEditDialog
        document={selectedDoc ? {
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
          reasonForRevision: selectedDoc.reasonForRevision
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
    </DashboardLayout>
  );
}
