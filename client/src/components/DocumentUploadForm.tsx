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
  revisionNumber: z.string().optional(),
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
  defaultLocation?: string;
  initialData?: any;
}

export default function DocumentUploadForm({ onSubmit, defaultPreparerName, defaultLocation, initialData }: DocumentUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");
  const [revNo, setRevNo] = useState<string>("0");

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      docName: initialData?.docName || "",
      docNumber: initialData?.docNumber || "",
      dateOfIssue: initialData?.dateOfIssue || new Date().toISOString().split('T')[0],
      revisionNumber: "0",
      duePeriodYears: "3",
      preparerName: defaultPreparerName || "",
      location: initialData?.location || defaultLocation || "",
      reasonForRevision: "",
      previousVersionId: initialData?.previousVersionId || "",
      dateOfRevision: new Date().toISOString().split('T')[0],
      reviewDueDate: "",
    },
  });

  // Most reliable fetch pattern: State + Sync
  useEffect(() => {
    let isMounted = true;
    const fetchRev = async () => {
      try {
        const response = await fetch(`/api/next-revision-series?nocache=${new Date().getTime()}`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            const val = data.nextRevisionNo?.toString() || "0";
            setRevNo(val);
            form.setValue("revisionNumber", val);
          }
        }
      } catch (err) {
        console.error("Fetch failed", err);
      }
    };

    fetchRev();
    const timer = setInterval(fetchRev, 5000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [form]);

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...form.getValues(),
        docName: initialData.docName || "",
        docNumber: initialData.docNumber || "",
        dateOfIssue: initialData.dateOfIssue || new Date().toISOString().split('T')[0],
        location: initialData.location || defaultLocation || "",
        revisionNumber: initialData.revisionNo?.toString() || initialData.revisionNumber?.toString() || "0",
        previousVersionId: initialData.id || initialData.previousVersionId || "",
      });
      // also update revNo state if coming from initialData
      if (initialData.revisionNo !== undefined) {
        setRevNo(initialData.revisionNo.toString());
      }
    }
  }, [initialData, form, defaultLocation]);

  const watchedDateOfRevision = form.watch("dateOfRevision");
  useEffect(() => {
    if (watchedDateOfRevision) {
      const revisionDate = new Date(watchedDateOfRevision);
      if (!isNaN(revisionDate.getTime())) {
        const dueDate = new Date(revisionDate);
        dueDate.setFullYear(dueDate.getFullYear() + 3);
        dueDate.setDate(dueDate.getDate() + 1); // Add 1 day to make it +3yr +1day
        form.setValue("reviewDueDate", dueDate.toISOString().split('T')[0]);
      }
    }
  }, [watchedDateOfRevision, form]);

  useEffect(() => {
    if (defaultLocation && !form.getValues("location")) {
      form.setValue("location", defaultLocation);
    }
  }, [defaultLocation, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setFileError("");
    }
  };

  const handleSubmit = (data: DocumentFormValues) => {
    if (!selectedFile) {
      setFileError("Word document is required for submission.");
      return;
    }
    onSubmit?.({ ...data, file: selectedFile });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <Card className="p-3 shadow-none border-primary/10">
          <div className="flex items-center justify-between mb-3 border-b pb-1.5">
            <h3 className="text-base font-bold text-primary">Document Details</h3>
            <div className="flex items-center gap-2 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/20">
              <span className="text-[9px] font-bold text-primary/70 uppercase tracking-wider">Next Global Revision:</span>
              <span className="text-xs font-black text-primary">{revNo}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            <FormField
              control={form.control}
              name="revisionNumber"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Revision Tracking</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={revNo} 
                      readOnly
                      className="h-8 text-base bg-primary/20 border-primary/40 font-black text-primary text-center"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duePeriodYears"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Due Period (Years)</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-8 text-xs bg-muted/60" disabled />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preparerName"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Preparer Name *</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-8 text-xs bg-muted/60" disabled />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="docName"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-[10px] font-semibold">Document Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Name..." {...field} className="h-8 text-xs" disabled={!!initialData} />
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
                  <FormLabel className="text-[10px] font-semibold">Document Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Number..." {...field} className="h-8 text-xs" disabled={!!initialData} />
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
                  <FormLabel className="text-[10px] font-semibold">Date of Creation *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="h-8 text-xs" disabled={!!initialData} />
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
                  <FormLabel className="text-[10px] font-semibold">Department Location *</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-8 text-xs bg-muted/20" readOnly />
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
                  <FormLabel className="text-[10px] font-semibold">Date of Rev. *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="h-8 text-xs" />
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
                  <FormLabel className="text-[10px] font-bold text-primary">Due Date of Rev. *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="h-8 text-xs border-primary/30 bg-muted/30 font-bold" disabled />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          <Card className="p-2.5">
            <FormField
              control={form.control}
              name="reasonForRevision"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Reason for Changes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Type reason here..." 
                      className="resize-none min-h-[60px] text-xs bg-muted/20" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          </Card>

          <Card className="p-2.5 border-2 border-dashed border-primary/20 bg-primary/5 rounded-lg flex flex-col justify-center">
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm border">
                 <Upload className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-center">
                <h4 className="text-[10px] font-bold text-primary">Upload Official Word File</h4>
                <p className="text-[8px] text-muted-foreground leading-tight">Only .doc, .docx accepted</p>
              </div>
              
              <input type="file" id="file-upload" className="hidden" accept=".doc,.docx" onChange={handleFileChange} />
              <label htmlFor="file-upload" className="cursor-pointer group">
                {selectedFile ? (
                  <div className="bg-white p-1.5 rounded-lg border flex items-center gap-1.5 shadow-sm">
                    <FileText className="w-4 h-4 text-primary" />
                    <div className="text-left">
                      <p className="text-[9px] font-bold truncate max-w-[100px]">{selectedFile.name}</p>
                      <p className="text-[7px] text-muted-foreground">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <X className="w-2.5 h-2.5 text-red-100 group-hover:text-red-400 transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); setSelectedFile(null); }} />
                  </div>
                ) : (
                  <div className="bg-primary text-white px-3 py-1 rounded-lg font-bold hover:bg-primary/90 transition-all text-[10px]">
                    Choose File
                  </div>
                )}
              </label>
            </div>
            {fileError && <p className="text-[9px] text-red-600 mt-0.5 text-center font-bold">{fileError}</p>}
          </Card>
        </div>

        <div className="flex justify-center pt-3">
          <Button type="submit" className="w-full max-w-[200px] h-10 text-base font-black shadow-lg uppercase tracking-widest" size="default">
            SUBMIT
          </Button>
        </div>
      </form>
    </Form>
  );
}
