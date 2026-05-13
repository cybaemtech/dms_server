import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Upload, FileText, X, Check } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const LOCATION_OPTIONS = [
  { label: "Unit 1", value: "Unit 1" },
  { label: "Unit 2", value: "Unit 2" },
  { label: "Unit 3", value: "Unit 3" },
  { label: "HO", value: "HO" },
];

const documentSchema = z.object({
  docName: z.string().min(1, "Document title is required"),
  docNumber: z.string()
    .min(1, "Document number is required")
    .regex(/^[A-Z0-9/]+$/, "Only uppercase letters, digits, and '/' are allowed (no spaces)"),
  dateOfIssue: z.string().min(1, "Date of issue is required"),
  revisionNumber: z.string().optional(), // Auto-calculated or manual for migration
  duePeriodYears: z.string().optional(),
  preparerName: z.string().min(1, "Preparer name is required"),
  location: z.string().min(1, "Location is required"),
  reasonForRevision: z.string().optional(),
  previousVersionId: z.string().optional(),
  dateOfRevision: z.string().optional(), // Optional for new documents
  reviewDueDate: z.string().min(1, "Review due date is required"),
  migrationMode: z.boolean().optional(), // For existing documents being added
});

type DocumentFormValues = z.infer<typeof documentSchema>;

interface DocumentUploadFormProps {
  onSubmit?: (data: DocumentFormValues & { file?: File }) => Promise<void> | void;
  onCancel?: () => void;
  defaultPreparerName?: string;
  defaultLocation?: string;
  initialData?: any;
  migrationMode?: boolean; // For adding existing documents
}

export default function DocumentUploadForm({ onSubmit, onCancel, defaultPreparerName, defaultLocation, initialData, migrationMode = false }: DocumentUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: settingData } = useQuery({
    queryKey: ["/api/settings/enable_manual_revision"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings/enable_manual_revision");
      return res.json();
    }
  });

  const isManualRevEnabled = settingData?.settingValue === 'true';

  const isRevision = !!initialData?.previousVersionId;
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      docName: initialData?.docName || "",
      docNumber: initialData?.docNumber || "",
      dateOfIssue: initialData?.dateOfIssue ? new Date(initialData.dateOfIssue).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      revisionNumber: isRevision ? (initialData?.revisionNo?.toString() || "") : (migrationMode ? "" : "00"),
      duePeriodYears: "3",
      preparerName: defaultPreparerName || "",
      location: initialData?.location || defaultLocation || "",
      reasonForRevision: "",
      previousVersionId: initialData?.previousVersionId || "",
      dateOfRevision: isRevision ? new Date().toISOString().split('T')[0] : "", // Empty for new documents
      reviewDueDate: "",
      migrationMode: migrationMode,
    },
  });

  // Watch for changes in docNumber to fetch next revision
  const watchedDocNumber = form.watch("docNumber");

  useEffect(() => {
    const fetchNextRevision = async () => {
      // If manual revision entry is enabled for NEW documents, don't automatically fetch or override
      if (!isRevision && (isManualRevEnabled || migrationMode)) {
        return;
      }

      if (watchedDocNumber && watchedDocNumber.length > 2) {
        try {
          // Use POST endpoint to handle document numbers with special characters
          const response = await fetch('/api/revision-number', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ docNumber: watchedDocNumber }),
          });
          if (response.ok) {
            const data = await response.json();
            form.setValue("revisionNumber", data.nextRevisionNo.toString());
          }
        } catch (error) {
          console.error("Error fetching next revision:", error);
        }
      }
    };

    const timer = setTimeout(fetchNextRevision, 500); // Debounce
    return () => clearTimeout(timer);
  }, [watchedDocNumber, form]);

  // Watch for changes in dateOfRevision to calculate reviewDueDate
  const watchedDateOfRevision = form.watch("dateOfRevision");
  const watchedDateOfIssue = form.watch("dateOfIssue");

  useEffect(() => {
    // Calculate due date: prioritize dateOfRevision, otherwise use dateOfIssue
    let baseDate: Date | null = null;

    if (watchedDateOfRevision && watchedDateOfRevision !== "" && watchedDateOfRevision !== "-" && watchedDateOfRevision !== "0" && watchedDateOfRevision !== "00") {
      // If date of revision is selected, use it
      baseDate = new Date(watchedDateOfRevision);
    } else if (watchedDateOfIssue) {
      // Otherwise use date of issue
      baseDate = new Date(watchedDateOfIssue);
    }

    if (baseDate && !isNaN(baseDate.getTime())) {
      const dueDate = new Date(baseDate);
      dueDate.setFullYear(dueDate.getFullYear() + 3);
      // Subtract 1 day to make it 3 years - 1 day
      dueDate.setDate(dueDate.getDate() - 1);
      form.setValue("reviewDueDate", dueDate.toISOString().split('T')[0]);
    }
  }, [watchedDateOfRevision, watchedDateOfIssue, isRevision, form]);

  useEffect(() => {
    if (defaultLocation && !initialData?.location) {
      // Use short delay to ensure form is fully ready
      const timer = setTimeout(() => {
        form.setValue("location", defaultLocation, { shouldValidate: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [defaultLocation, form, initialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setFileError("");
    }
  };

  const handleSubmit = async (data: DocumentFormValues) => {
    if (!selectedFile) {
      setFileError("Word document is required for document content.");
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Convert date strings for backend if needed
      await onSubmit?.({ ...data, file: selectedFile });
      console.log("Form submitted:", { ...data, file: selectedFile?.name });
    } finally {
      setIsSubmitting(false);
    }
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
                  <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">
                    Revision Number {(migrationMode || (!isRevision && isManualRevEnabled)) && "*"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type={(migrationMode || (!isRevision && isManualRevEnabled)) ? "number" : "text"}
                      placeholder={(migrationMode || (!isRevision && isManualRevEnabled)) ? "Enter rev no." : "Auto-calculated"}
                      {...field}
                      disabled={!migrationMode && !isManualRevEnabled}
                      data-testid="input-revision-number"
                      className={`h-7 text-xs font-mono ${(migrationMode || isManualRevEnabled) ? "bg-background border-primary/20" : "bg-muted/50 border-muted text-muted-foreground cursor-not-allowed"}`}
                      min={(migrationMode || (!isRevision && isManualRevEnabled)) ? 0 : undefined}
                      step={(migrationMode || (!isRevision && isManualRevEnabled)) ? 1 : undefined}
                    />
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
                  <FormLabel className="text-xs">Document Title *</FormLabel>
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
                    <Input
                      placeholder="e.g., NFDCL/F/EHS/02"
                      {...field}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9/]/g, '');
                        field.onChange(val);
                      }}
                      data-testid="input-doc-number"
                      className="h-8 text-sm"
                      disabled={isRevision}
                    />
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
                    <Input type="date" {...field} data-testid="input-date-issue" className="h-8 text-sm" disabled={isRevision} />
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
                    <MultiSelect
                      options={LOCATION_OPTIONS}
                      selected={field.value ? field.value.split(", ").filter(Boolean) : []}
                      onChange={(selectedValues) => {
                        field.onChange(selectedValues.join(", "));
                      }}
                      placeholder="Select locations..."
                      disabled={isRevision}
                    />
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
                  <FormLabel className="text-xs">
                    Date of Rev. {isRevision ? "*" : ""}
                  </FormLabel>
                  <FormControl>
                    {!isRevision && !migrationMode && !isManualRevEnabled ? (
                      <Input
                        type="text"
                        value="-"
                        disabled
                        className="h-8 text-sm bg-muted/50 text-center text-muted-foreground"
                      />
                    ) : (
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-date-revision"
                        className={`h-8 text-sm ${(isRevision || migrationMode || isManualRevEnabled) ? "bg-background border-primary/20" : ""}`}
                      />
                    )}
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
                    <Input type="date" {...field} data-testid="input-due-date-revision" className="h-8 text-sm border-primary/20 bg-primary/5" disabled />
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
                <FormLabel>Reason {isRevision && "*"}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={isRevision ? "Describe the reason..." : "Describe the reason..."}
                    className="resize-none min-h-[60px]"
                    rows={2}
                    {...field}
                    data-testid="input-revision-reason"
                    disabled={false}
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
          <Button type="button" variant="outline" size="sm" onClick={onCancel} data-testid="button-cancel" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" data-testid="button-submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit for Approval"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
