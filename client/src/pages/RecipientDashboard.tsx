import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import DocumentTable, { Document } from "@/components/DocumentTable";
import PDFViewer from "@/components/PDFViewer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileText, Eye, Printer, Download, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentStatus } from "@/components/StatusBadge";

interface RecipientDashboardProps {
  onLogout?: () => void;
  userId?: string;
  recipientName?: string;
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
  location?: string;
  dateOfRev?: string;
  departments?: Array<{ id: string; name: string }>;
  issuedAt?: string;
  createdAt?: string;
}

interface Notification {
  id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function RecipientDashboard({ onLogout, userId = "recipient-1", recipientName = "" }: RecipientDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfDocId, setPdfDocId] = useState<string>("");
  const [pdfDocName, setPdfDocName] = useState<string>("");
  const { toast } = useToast();

  const { data: issuedDocuments = [], isLoading } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", "issued", userId],
    queryFn: async () => {
      const response = await fetch(`/api/documents?status=issued&recipientId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch issued documents");
      return response.json();
    },
    refetchInterval: 5000,
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

  const handleViewPDF = (doc: Document) => {
    setPdfDocId(doc.id);
    setPdfDocName(doc.docName);
    setPdfViewerOpen(true);
  };

  const handleDownload = (doc: Document) => {
    window.open(`/api/documents/${doc.id}/download`, "_blank");
    toast({
      title: "Download Started",
      description: `Downloading ${doc.docName} as Word document...`,
    });
  };

  const transformedDocs = (docs: ApiDocument[]): Document[] => {
    return (docs || [])
      .filter(doc =>
        (doc.docName || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
        (doc.docNumber || "").toLowerCase().includes((searchQuery || "").toLowerCase())
      )
      .sort((a, b) => new Date(a.issuedAt || a.createdAt || 0).getTime() - new Date(b.issuedAt || b.createdAt || 0).getTime())
      .map((doc) => {
      let dateOfIssue = "";
      try {
        if (doc.dateOfIssue) {
          const date = new Date(doc.dateOfIssue);
          if (!isNaN(date.getTime())) {
            dateOfIssue = date.toISOString().split("T")[0];
          }
        }
      } catch (e) {
        console.error("Error formatting dateOfIssue", e);
      }

      return {
        id: doc.id,
        docName: doc.docName || "Untitled",
        docNumber: doc.docNumber || "NO-NUMBER",
        status: "Issued" as DocumentStatus,
        dateOfIssue: dateOfIssue,
        revisionNo: doc.revisionNo || 0,
        preparedBy: doc.preparerName || "Unknown",
        location: doc.location || null,
        dateOfRev: doc.dateOfRev || null,
        departments: doc.departments || []
      };
    });
  };

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;
  const recentDocs = issuedDocuments.filter((doc) => {
    const issuedDate = doc.dateOfIssue ? new Date(doc.dateOfIssue) : new Date();
    const daysDiff = Math.floor((new Date().getTime() - issuedDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7;
  }).length;

  return (
    <DashboardLayout
      userRole="Document Recipient"
      userName={recipientName}
      userId={userId}
      notificationCount={unreadNotifications}
      onLogout={onLogout}
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Document Library</h2>
          <p className="text-xs text-muted-foreground">
            View and print issued documents in PDF format
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard
            title="Total Documents"
            value={issuedDocuments.length}
            icon={FileText}
            trend="Available documents"
          />
          <StatCard
            title="New This Week"
            value={recentDocs}
            icon={Eye}
            trend="Recently issued"
          />
          <StatCard
            title="Control Copies"
            value={issuedDocuments.length}
            icon={Printer}
            trend="With tracking"
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search documents by title or number..."
                className="pl-8 h-8 text-[11px] bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold">Issued Documents</h3>
                <div className="text-[11px] text-muted-foreground italic">
                  Click "View" to open PDF with control copy watermark
                </div>
              </div>

              {isLoading ? (
                <div className="border rounded-lg p-12 text-center">
                  <p className="text-sm text-muted-foreground">Loading documents...</p>
                </div>
              ) : issuedDocuments.length > 0 ? (
                <DocumentTable
                  documents={transformedDocs(issuedDocuments)}
                  onView={handleViewPDF}
                  onDownload={handleDownload}
                  showActions={true}
                />
              ) : (
                <div className="border rounded-lg p-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">No issued documents available</p>
                </div>
              )}
            </Card>
          </div>
        </div>

        <Card className="p-4 bg-blue-50/30 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 shadow-sm">
          <h3 className="text-base font-semibold mb-2.5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Document Access Information
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">View & Print:</strong> Documents are available for viewing in PDF format only. Printing is allowed through the system's controlled copy protocol to maintain document integrity. Word format downloads for issued documents are prohibited.
            </p>
            <p>
              <strong className="text-foreground">Print Tracking:</strong> When you print a document, a unique control copy number is assigned and logged for audit purposes.
            </p>
            <p>
              <strong className="text-foreground">Control Copy Footer:</strong> Each printed document includes your User ID, Control Copy Number, and Print Date in the footer.
            </p>
            <p>
              <strong className="text-foreground">Version Access:</strong> You automatically see the latest version of each document. Previous versions are maintained but restricted to master copy users.
            </p>
          </div>
        </Card>
      </div>

      <PDFViewer
        documentId={pdfDocId}
        userId={userId}
        open={pdfViewerOpen}
        onClose={() => setPdfViewerOpen(false)}
        documentName={pdfDocName}
      />
    </DashboardLayout>
  );
}
