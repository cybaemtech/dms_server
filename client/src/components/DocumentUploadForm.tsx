import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Upload, FileText, X } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const documentSchema = z.object({
  docName: z.string().min(1, "Document name is required"),
  docNumber: z.string().min(1, "Document number is required"),
  dateOfIssue: z.string().min(1, "Date of issue is required"),
  revisionNumber: z.string().min(1, "Revision number is required"),
  duePeriodYears: z.string().optional(),
  preparerName: z.string().min(1, "Preparer name is required"),
  location: z.string().min(1, "Location is required"),
  reasonForRevision: z.string().optional(),
  previousVersionId: z.string().optional(),
  dateOfRevision: z.string().min(1, "Date of revision is required"),
  reviewDueDate: z.string().min(1, "Review due date is required"),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

interface DocumentUploadFormProps {
  onSubmit?: (data: DocumentFormValues & { file?: File }) => void;
  defaultPreparerName?: string;
  initialData?: any;
}

export default function DocumentUploadForm({ onSubmit, defaultPreparerName, initialData }: DocumentUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      docName: initialData?.docName || "",
      docNumber: initialData?.docNumber || "",
      dateOfIssue: new Date().toISOString().split('T')[0],
      revisionNumber: initialData?.revisionNumber || "0",
      duePeriodYears: "3",
      preparerName: defaultPreparerName || "",
      location: initialData?.location || "",
      reasonForRevision: "",
      previousVersionId: initialData?.previousVersionId || "",
      dateOfRevision: new Date().toISOString().split('T')[0],
      reviewDueDate: "",
    },
  });

  // Watch for changes in dateOfRevision to calculate reviewDueDate
  const watchedDateOfRevision = form.watch("dateOfRevision");

  // Watch for changes in docNumber to auto-increment revisionNumber
  const watchedDocNumber = form.watch("docNumber");

  useEffect(() => {
    const fetchNextRevision = async () => {
      const trimmedDocNumber = watchedDocNumber?.trim();
      if (trimmedDocNumber && trimmedDocNumber.length >= 1) {
        try {
          const response = await fetch(`/api/documents/${encodeURIComponent(trimmedDocNumber)}/versions`);
          if (response.ok) {
            const versions = await response.json();
            if (Array.isArray(versions) && versions.length > 0) {
              const revisionNumbers = versions
                .map((v: any) => typeof v.revisionNo === 'number' ? v.revisionNo : parseInt(v.revisionNo))
                .filter((rev: any) => !isNaN(rev));

              if (revisionNumbers.length > 0) {
                const latestRev = Math.max(...revisionNumbers);
                form.setValue("revisionNumber", (latestRev + 1).toString());
              } else {
                form.setValue("revisionNumber", "0");
              }
            } else {
              form.setValue("revisionNumber", "0");
            }
          }
        } catch (error) {
          console.error("Error fetching versions:", error);
        }
      } else {
        form.setValue("revisionNumber", "0");
      }
    };

    const timer = setTimeout(fetchNextRevision, 500);
    return () => clearTimeout(timer);
  }, [watchedDocNumber, form]);

  useEffect(() => {
    if (watchedDateOfRevision) {
      const revisionDate = new Date(watchedDateOfRevision);
      if (!isNaN(revisionDate.getTime())) {
        const dueDate = new Date(revisionDate);
        dueDate.setFullYear(dueDate.getFullYear() + 3);
        form.setValue("reviewDueDate", dueDate.toISOString().split('T')[0]);
      }
    }
  }, [watchedDateOfRevision, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setFileError("");
    }
  };

  const handleSubmit = (data: DocumentFormValues) => {
    if (!selectedFile) {
      setFileError("Word document is required for document content.");
      return;
    }
    onSubmit?.({ ...data, file: selectedFile });
    console.log("Form submitted:", { ...data, file: selectedFile?.name });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3">Document Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 p-2 bg-muted/40 rounded border border-border/50">
            <FormField
              control={form.control}
              name="revisionNumber"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Revision Number *</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="0" {...field} data-testid="input-revision-number" className="h-7 text-xs bg-primary/5 border-primary/20 font-mono font-bold text-primary" />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duePeriodYears"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Due Period (Years)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="3" {...field} data-testid="input-due-period" className="h-7 text-xs bg-muted font-mono" disabled />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preparerName"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Preparer Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} data-testid="input-preparer-name" className="h-7 text-xs bg-muted font-mono" disabled />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-2">
            <FormField
              control={form.control}
              name="docName"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-xs">Document Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., SOP Name" {...field} data-testid="input-doc-name" className="h-8 text-sm" />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="docNumber"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-xs">Document Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., QC-SOP-001" {...field} data-testid="input-doc-number" className="h-8 text-sm" />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateOfIssue"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-xs">Date of Issue *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-date-issue" className="h-8 text-sm" />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-xs">Location *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Factory A" {...field} data-testid="input-location" className="h-8 text-sm" />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateOfRevision"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-xs">Date of Rev. *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-date-revision" className="h-8 text-sm" />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reviewDueDate"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-xs font-semibold text-primary/80">Due Date of Rev. *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-due-date-revision" className="h-8 text-sm border-primary/20 bg-primary/5" />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="reasonForRevision"
            render={({ field }) => (
              <FormItem className="mt-3">
                <FormLabel>Reason for Revision</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the reason..."
                    className="resize-none min-h-[60px]"
                    rows={2}
                    {...field}
                    data-testid="input-revision-reason"
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        </Card>

        <Card className="p-4 border-blue-200 dark:border-blue-900">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Upload Word Document *
          </h3>
          <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".doc,.docx"
              onChange={handleFileChange}
              data-testid="input-file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedFile(null);
                      setFileError("");
                    }}
                    data-testid="button-remove-file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Click to upload Word document</p>
                  <p className="text-xs text-muted-foreground">
                    Word documents only (.doc, .docx)
                  </p>
                </div>
              )}
            </label>
          </div>
          {fileError && (
            <p className="text-xs text-red-500 mt-1" data-testid="text-file-error">{fileError}</p>
          )}
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" size="sm" data-testid="button-cancel">
            Cancel
          </Button>
          <Button type="submit" size="sm" data-testid="button-submit">
            Submit for Approval
          </Button>
        </div>
      </form>
    </Form>
  );
}
