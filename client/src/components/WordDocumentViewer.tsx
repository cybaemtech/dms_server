import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WordDocumentViewerProps {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WordDocumentViewer({ documentId, open, onOpenChange }: WordDocumentViewerProps) {
  const { data, isLoading, error } = useQuery<{
    html: string;
    docName: string;
    docNumber: string;
    revisionNo: number;
  }>({
    queryKey: ["/api/documents", documentId, "view-word"],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documentId}/view-word`);
      if (!response.ok) {
        throw new Error("Failed to load Word document");
      }
      return response.json();
    },
    enabled: open && !!documentId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-word-viewer">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {data ? (
              <span>
                {data.docName} - {data.docNumber} (Rev {data.revisionNo})
              </span>
            ) : (
              <span>Document Viewer</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-12" data-testid="loading-word-viewer">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600">Loading document...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive" data-testid="error-word-viewer">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load document. The file may not be available.
              </AlertDescription>
            </Alert>
          )}

          {data && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="p-8 prose prose-sm max-w-none dark:prose-invert">
                <div 
                  dangerouslySetInnerHTML={{ __html: data.html }}
                  data-testid="content-word-viewer"
                  className="word-document-content"
                />
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          View-only mode • No download available
        </div>
      </DialogContent>
    </Dialog>
  );
}
