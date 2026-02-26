import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import DocumentTable, { Document } from "@/components/DocumentTable";
import PDFViewer from "@/components/PDFViewer";
import { Card } from "@/components/ui/card";
import { FileText, Eye, Printer } from "lucide-react";

interface RecipientDashboardProps {
  onLogout?: () => void;
  userId?: string;
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
}

interface Notification {
  id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function RecipientDashboard({ onLogout, userId = "recipient-1" }: RecipientDashboardProps) {
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfDocId, setPdfDocId] = useState<string>("");
  const [pdfDocName, setPdfDocName] = useState<string>("");

  const { data: issuedDocuments = [], isLoading } = useQuery<ApiDocument[]>({
    queryKey: ["/api/documents", "issued"],
    queryFn: async () => {
      const response = await fetch("/api/documents?status=issued");
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

  const transformedDocs = (docs: ApiDocument[]): Document[] => {
    return docs.map((doc) => ({
      id: doc.id,
      docName: doc.docName,
      docNumber: doc.docNumber,
      status: "Issued" as const,
      dateOfIssue: doc.dateOfIssue ? new Date(doc.dateOfIssue).toISOString().split("T")[0] : "",
      revisionNo: doc.revisionNo,
      preparedBy: doc.preparerName || "Unknown",
    }));
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
      userName="Recipient User"
      userId={userId}
      notificationCount={unreadNotifications}
      onLogout={onLogout}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold text-foreground">Document Library</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and print issued documents in PDF format
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Issued Documents</h3>
            <div className="text-sm text-muted-foreground">
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
              showActions={true}
            />
          ) : (
            <div className="border rounded-lg p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">No issued documents available</p>
            </div>
          )}
        </Card>

        <Card className="p-6 bg-blue-50/30 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Document Access Information
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">View Only:</strong> Documents are available in PDF format and cannot be downloaded. This ensures document integrity and version control.
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
