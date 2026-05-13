import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker to use local file
// This avoids the CDN loading issues and works offline
// Worker configuration is handled dynamically in useEffect

interface PDFViewerProps {
  documentId: string;
  userId: string;
  open: boolean;
  onClose: () => void;
  documentName?: string;
}

export default function PDFViewer({ documentId, userId, open, onClose, documentName }: PDFViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const { toast } = useToast();

  const printMutation = useMutation({
    mutationFn: async () => {
      console.log(`[Print] Initiating print for doc: ${documentId}, user: ${userId}`);
      if (!userId || userId.trim() === "") {
        throw new Error("User session is invalid. Please log out and log in again to print.");
      }
      const response = await apiRequest('POST', `/api/documents/${documentId}/print`, { userId });
      return response.blob();
    },
    onSuccess: (pdfBlob) => {
      const url = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        if (typeof printWindow.addEventListener === 'function') {
          printWindow.addEventListener('load', () => {
            printWindow.print();
            URL.revokeObjectURL(url);
          });
        } else {
          // Fallback for browsers with limited window object access
          printWindow.print();
          URL.revokeObjectURL(url);
        }
      }
      toast({
        title: "Print Initiated",
        description: "PDF generated with control copy number. Print action logged.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Print Failed",
        description: error.message || "Failed to generate print copy",
      });
    }
  });

  useEffect(() => {
    if (!open || !documentId || !userId) return;

    const loadPDF = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log(`Loading PDF for document ${documentId} and user ${userId}`);

        if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
          // Use absolute path for worker to ensure it loads correctly
          pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.js`;
          console.log('PDF Worker source set to:', pdfjsLib.GlobalWorkerOptions.workerSrc);
        }

        const response = await fetch(`/api/documents/${documentId}/pdf?userId=${userId}`);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = errorText;
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.message) {
              errorMessage = errorJson.message;
            }
          } catch (e) {
            // Not a JSON error, use raw text
          }
          console.error('PDF fetch error:', response.status, errorMessage);
          throw new Error(errorMessage || `Failed to load PDF (Status ${response.status})`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/pdf')) {
          console.error('Invalid content type:', contentType);
          throw new Error('Invalid response format - expected PDF');
        }

        const arrayBuffer = await response.arrayBuffer();

        if (arrayBuffer.byteLength === 0) {
          throw new Error('Empty PDF response');
        }

        console.log('PDF data loaded, size:', arrayBuffer.byteLength);

        // Simplified PDF.js loading
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          useSystemFonts: true
        });

        loadingTask.onProgress = (progress: any) => {
          console.log(`PDF loading progress: ${progress.loaded}/${progress.total}`);
        };

        const pdf = await loadingTask.promise;

        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);

        console.log('PDF loaded successfully, pages:', pdf.numPages);

      } catch (error: any) {
        console.error('PDF loading error:', error);

        // Check if it's a worker-related error
        if (error.message && error.message.includes('worker')) {
          console.warn('Worker error detected, trying without worker...');
          try {
            // Try to disable worker and reload
            pdfjsLib.GlobalWorkerOptions.workerSrc = '';
            const response = await fetch(`/api/documents/${documentId}/pdf?userId=${userId}`);
            const arrayBuffer = await response.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({
              data: arrayBuffer,
            } as any);
            const pdf = await loadingTask.promise;
            setPdfDoc(pdf);
            setTotalPages(pdf.numPages);
            setCurrentPage(1);
            console.log('PDF loaded successfully without worker, pages:', pdf.numPages);
            return;
          } catch (fallbackError: any) {
            console.error('Fallback PDF loading also failed:', fallbackError);
          }
        }

        setError(error.message || "Failed to load PDF document.");
        toast({
          variant: "destructive",
          title: "PDF Load Failed",
          description: error.message || "Failed to load PDF document. Try refreshing the page.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [open, documentId, userId, toast]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    const renderPage = async () => {
      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
      }

      try {
        const page = await pdfDoc.getPage(currentPage);

        // Use a default scale if it's missing or invalid
        const currentScale = scale || 1.2;
        const viewport = page.getViewport({ scale: currentScale });

        if (isCancelled) return;

        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        // Clear canvas before new render
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Standard PDF.js rendering with high-DPI support
        const dpr = window.devicePixelRatio || 1;
        canvas.height = viewport.height * dpr;
        canvas.width = viewport.width * dpr;

        // CSS display size
        canvas.style.height = `${viewport.height}px`;
        canvas.style.width = `${viewport.width}px`;

        // Scale context for DPR
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        console.log(`Page ${currentPage} rendered successfully at scale ${currentScale}`);
      } catch (error: any) {
        if (error.name === 'RenderingCancelledException') {
          console.log('Rendering cancelled for page', currentPage);
        } else {
          console.error('PDF render error:', error);
          toast({
            variant: "destructive",
            title: "Render Error",
            description: "Failed to render PDF page. Try zooming out.",
          });
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) { }
      }
    };
  }, [pdfDoc, currentPage, scale, toast]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  const downloadMutation = useMutation({
    mutationFn: async () => {
      console.log(`[Download] Starting Request v2.1 for doc: ${documentId}`);
      if (!userId || userId.trim() === "") {
        throw new Error("User session is invalid.");
      }
      const response = await apiRequest('POST', `/api/documents/${documentId}/download-pdf`, { userId });

      const blob = await response.blob();
      console.log(`[Download] Blob received: size=${blob.size}, type=${blob.type}`);

      if (blob.size < 100) {
        throw new Error("Received an invalid or empty PDF file from the server.");
      }

      return blob;
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Strict sanitization and trim
      const safeName = (documentName || 'document').trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+$/, '');
      a.download = `${safeName}.pdf`;

      console.log(`[Download] Triggering browser download for: ${a.download}`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Delay revocation to ensure browser captures the download
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast({
        title: "Download Successful",
        description: `File "${a.download}" saved to your computer.`,
      });
    },
    onError: (error: any) => {
      console.error("[Download] Error:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error.message || "Failed to download PDF. Please try again.",
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] pr-12" data-testid="dialog-pdf-viewer">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{documentName || "Document Viewer"}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                data-testid="button-zoom-out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 3}
                data-testid="button-zoom-in"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            PDF document viewer for {documentName || "document"}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-[60vh]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading PDF...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
              <div className="bg-destructive/10 text-destructive rounded-full p-4 mb-4">
                <FileText className="w-12 h-12" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Failed to load PDF</h3>
              <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          ) : (
            <div className="overflow-auto min-h-[60vh] max-h-[70vh] bg-slate-100 dark:bg-slate-900 rounded-md p-4 flex flex-col items-center">
              <div className="relative inline-block border shadow-2xl bg-white">
                <canvas
                  ref={canvasRef}
                  data-testid="canvas-pdf"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between border-t p-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isLoading}
              className="h-8"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <span className="text-xs font-medium text-muted-foreground bg-white px-3 py-1 border rounded-md min-w-[100px] text-center">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages || isLoading}
              className="h-8"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => downloadMutation.mutate()}
              disabled={downloadMutation.isPending || isLoading}
              className="h-9 px-4"
            >
              {downloadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>

            <Button
              variant="default"
              onClick={() => printMutation.mutate()}
              disabled={printMutation.isPending || isLoading}
              className="bg-primary hover:bg-primary/90 h-9 px-4"
            >
              {printMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Controlled Copy
                </>
              )}
            </Button>

            <Button variant="ghost" onClick={onClose} className="h-9 px-4">
              Close Viewer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
