import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker to use local file
// This avoids the CDN loading issues and works offline
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const printMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/documents/${documentId}/print`, { userId });
      return response.blob();
    },
    onSuccess: (pdfBlob) => {
      const url = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
          URL.revokeObjectURL(url);
        });
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
      try {
        console.log(`Loading PDF for document ${documentId} and user ${userId}`);
        
        const response = await fetch(`/api/documents/${documentId}/pdf?userId=${userId}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('PDF fetch error:', response.status, errorText);
          throw new Error(`Failed to load PDF: ${response.status} - ${errorText}`);
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
        
        // Enhanced PDF.js loading with better error handling
        const loadingTask = pdfjsLib.getDocument({ 
          data: arrayBuffer,
          // Disable worker if it fails to load
          useWorkerFetch: false,
          isEvalSupported: false,
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
              disableWorker: true
            });
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

    const renderPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh]" data-testid="dialog-pdf-viewer">
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
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-[60vh]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading PDF...</span>
            </div>
          ) : (
            <div className="overflow-auto h-[60vh] bg-gray-100 dark:bg-gray-900 rounded-md p-4 flex justify-center">
              <canvas
                ref={canvasRef}
                className="shadow-lg bg-white"
                data-testid="canvas-pdf"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isLoading}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages || isLoading}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => printMutation.mutate()}
              disabled={printMutation.isPending || isLoading}
              data-testid="button-print-pdf"
            >
              {printMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} data-testid="button-close-pdf">
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
