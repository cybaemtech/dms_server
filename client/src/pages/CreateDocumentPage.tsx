import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import DocumentUploadForm from "@/components/DocumentUploadForm";
import WorkflowProgress from "@/components/WorkflowProgress";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface CreateDocumentPageProps {
  onBack?: () => void;
  onSubmit?: (data: any) => void;
  onLogout?: () => void;
  userName?: string;
  userFullName?: string;
  userLocation?: string;
  userRole?: string;
  initialData?: any;
}

export default function CreateDocumentPage({
  onBack,
  onSubmit,
  onLogout,
  userName = "User",
  userFullName,
  userLocation,
  userRole,
  initialData
}: CreateDocumentPageProps) {
  const [migrationMode, setMigrationMode] = useState(false);
  const isAdmin = userRole === "admin";
  const isRevision = !!initialData?.previousVersionId;

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
          <div className="flex-1">
            <h2 className="text-3xl font-semibold text-foreground">
              {initialData?.previousVersionId ? "Revise Document" : "Create New Document"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {initialData?.previousVersionId
                ? `Creating a new revision for ${initialData.docName}`
                : "Fill in document details and upload Word file"}
            </p>
          </div>
          {isAdmin && !isRevision && (
            <div className="flex items-center space-x-2 border rounded-lg px-3 py-2">
              <Switch
                id="migration-mode"
                checked={migrationMode}
                onCheckedChange={setMigrationMode}
              />
              <Label htmlFor="migration-mode" className="text-sm">
                Migration Mode
                <br />
                <span className="text-xs text-muted-foreground">
                  For existing documents
                </span>
              </Label>
            </div>
          )}
        </div>

        <Card className="p-6">
          <WorkflowProgress currentStep="Creator" />
        </Card>

        <DocumentUploadForm
          onSubmit={onSubmit}
          onCancel={onBack}
          defaultPreparerName={userFullName}
          defaultLocation={userLocation}
          initialData={initialData}
          migrationMode={migrationMode}
        />
      </div>
    </DashboardLayout>
  );
}
