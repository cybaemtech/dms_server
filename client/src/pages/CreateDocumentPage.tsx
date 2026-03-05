import DashboardLayout from "@/components/DashboardLayout";
import DocumentUploadForm from "@/components/DocumentUploadForm";
import WorkflowProgress from "@/components/WorkflowProgress";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreateDocumentPageProps {
  onBack?: () => void;
  onSubmit?: (data: any) => void;
  onLogout?: () => void;
  userName?: string;
  userFullName?: string;
  userLocation?: string;
  initialData?: any;
}

export default function CreateDocumentPage({
  onBack,
  onSubmit,
  onLogout,
  userName = "User",
  userFullName,
  userLocation,
  initialData
}: CreateDocumentPageProps) {
  return (
    <DashboardLayout
      userRole="Document Creator"
      userName={userName}
      notificationCount={0}
      onLogout={onLogout}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-semibold text-foreground">Create New Document</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Fill in document details and upload Word file
            </p>
          </div>
        </div>

        <Card className="p-6">
          <WorkflowProgress currentStep="Creator" />
        </Card>

        <DocumentUploadForm
          onSubmit={onSubmit}
          defaultPreparerName={userFullName}
          defaultLocation={userLocation}
          initialData={initialData}
        />
      </div>
    </DashboardLayout>
  );
}
