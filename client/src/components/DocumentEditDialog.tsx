import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Document } from "./DocumentTable";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, ChevronDown, ChevronRight, Search, X, Check } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";

const LOCATION_OPTIONS = [
  { label: "Unit 1", value: "Unit 1" },
  { label: "Unit 2", value: "Unit 2" },
  { label: "Unit 3", value: "Unit 3" },
  { label: "HO", value: "HO" },
];

interface DepartmentItem {
  id: string;
  name: string;
}

interface DepartmentCategory {
  id: string;
  name: string;
  departments: DepartmentItem[];
}

const documentSchema = z.object({
  docName: z.string().min(1, "Document title is required"),
  docNumber: z.string()
    .min(1, "Document number is required")
    .regex(/^[A-Z0-9/]+$/, "Only uppercase letters, digits, and '/' are allowed (no spaces)"),
  dateOfIssue: z.string().min(1, "Date of issue is required"),
  revisionNumber: z.string().min(1, "Revision number is required"),
  duePeriodYears: z.string().optional(),
  preparerName: z.string().min(1, "Preparer name is required"),
  location: z.string().optional(),
  dateOfRev: z.string().optional(),
  reviewDueDate: z.string().optional(),
  reasonForRevision: z.string().optional(),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

interface DocumentEditDialogProps {
  doc: Document | null;
  open: boolean;
  onClose: () => void;
  onSave?: (docId: string, data: any) => Promise<void> | void;
}

export default function DocumentEditDialog({
  doc,
  open,
  onClose,
  onSave,
}: DocumentEditDialogProps) {
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      docName: "",
      docNumber: "",
      dateOfIssue: "",
      revisionNumber: "0",
      duePeriodYears: "",
      preparerName: "",
      location: "",
      dateOfRev: "",
      reviewDueDate: "",
      reasonForRevision: "",
    },
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: departmentData } = useQuery<{ categories: DepartmentCategory[] }>({
    queryKey: ["/api/departments/categorized"],
    enabled: open,
  });

  const { data: settingData } = useQuery({
    queryKey: ["/api/settings/enable_manual_revision"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings/enable_manual_revision");
      return res.json();
    },
    enabled: open,
  });

  const isManualRevEnabled = settingData?.settingValue === 'true';
  const isEditableStatus = doc && (doc.status.toLowerCase() !== 'approved' && doc.status.toLowerCase() !== 'issued');
  const canEditRevision = isEditableStatus && isManualRevEnabled;

  const categories: DepartmentCategory[] = departmentData?.categories || [];

  useEffect(() => {
    if (categories.length > 0 && expandedCategories.length === 0) {
      setExpandedCategories(categories.map((cat) => cat.id));
    }
  }, [categories, expandedCategories.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (typeof globalThis.document !== "undefined") {
      globalThis.document.addEventListener("mousedown", handleClickOutside);
      return () => globalThis.document.removeEventListener("mousedown", handleClickOutside);
    }
  }, []);

  useEffect(() => {
    if (doc && open) {
      form.reset({
        docName: doc.docName,
        docNumber: doc.docNumber,
        dateOfIssue: doc.dateOfIssue,
        revisionNumber: doc.revisionNo.toString(),
        duePeriodYears: (doc as any).duePeriodYears?.toString() || "",
        preparerName: doc.preparedBy,
        location: doc.location || "",
        dateOfRev: (doc as any).dateOfRev ? new Date((doc as any).dateOfRev).toISOString().split('T')[0] : "",
        reviewDueDate: (doc as any).reviewDueDate ? new Date((doc as any).reviewDueDate).toISOString().split('T')[0] : "",
        reasonForRevision: (doc as any).reasonForRevision || "",
      });
      setSelectedFile(null);
      setSelectedDepartments(doc.departments?.map(d => d.id) || []);
    }
  }, [doc, open, form]);

  // Watch for changes in dateOfRev and dateOfIssue to calculate reviewDueDate
  const watchedDateOfRev = form.watch("dateOfRev");
  const watchedDateOfIssue = form.watch("dateOfIssue");

  useEffect(() => {
    // Calculate due date: prioritize dateOfRev, otherwise use dateOfIssue
    let baseDate: Date | null = null;

    if (watchedDateOfRev && watchedDateOfRev !== "" && watchedDateOfRev !== "-" && watchedDateOfRev !== "0" && watchedDateOfRev !== "00") {
      baseDate = new Date(watchedDateOfRev);
    } else if (watchedDateOfIssue) {
      baseDate = new Date(watchedDateOfIssue);
    }

    if (baseDate && !isNaN(baseDate.getTime())) {
      const dueDate = new Date(baseDate);
      dueDate.setFullYear(dueDate.getFullYear() + 3);
      // Subtract 1 day to make it 3 years - 1 day
      dueDate.setDate(dueDate.getDate() - 1);
      form.setValue("reviewDueDate", dueDate.toISOString().split('T')[0]);
    }
  }, [watchedDateOfRev, watchedDateOfIssue, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleDepartmentToggle = (deptId: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleSelectAllCategory = (category: DepartmentCategory) => {
    const categoryDeptIds = category.departments.map((d) => d.id);
    const allSelected = categoryDeptIds.every((id) => selectedDepartments.includes(id));

    if (allSelected) {
      setSelectedDepartments((prev) => prev.filter((id) => !categoryDeptIds.includes(id)));
    } else {
      setSelectedDepartments((prev) => Array.from(new Set([...prev, ...categoryDeptIds])));
    }
  };

  const getDepartmentName = (deptId: string): string => {
    for (const category of categories) {
      const dept = category.departments.find((d) => d.id === deptId);
      if (dept) return dept.name;
    }
    return deptId;
  };

  const getFilteredCategories = (): DepartmentCategory[] => {
    if (!searchQuery.trim()) return categories;

    return categories
      .map((category) => ({
        ...category,
        departments: category.departments.filter((dept) =>
          dept.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((category) => category.departments.length > 0);
  };

  const handleSubmit = async (data: DocumentFormValues) => {
    if (doc) {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        const submissionData = {
          ...data,
          file: selectedFile || undefined,
          departments: selectedDepartments,
        };
        await onSave?.(doc.id, submissionData);
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-document">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="docName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Title *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-doc-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="docNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Number *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9/]/g, '');
                          field.onChange(val);
                        }}
                        data-testid="input-edit-doc-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfIssue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Issue *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-edit-date-issue" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="revisionNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revision Number *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        {...field}
                        disabled={!canEditRevision}
                        data-testid="input-edit-revision-number"
                        className={!canEditRevision ? "bg-muted cursor-not-allowed" : "bg-background border-primary/20"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duePeriodYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Period (Years)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled data-testid="input-edit-due-period" className="bg-muted cursor-not-allowed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preparerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preparer Name *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled data-testid="input-edit-preparer-name" className="bg-muted cursor-not-allowed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfRev"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Rev.</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-edit-date-revision"
                        disabled={!canEditRevision}
                        className={!canEditRevision ? "bg-muted cursor-not-allowed opacity-70" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reviewDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Review Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled data-testid="input-edit-review-due-date" className="bg-muted cursor-not-allowed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={LOCATION_OPTIONS}
                        selected={field.value ? field.value.split(", ").filter(Boolean) : []}
                        onChange={(selectedValues) => {
                          field.onChange(selectedValues.join(", "));
                        }}
                        placeholder="Select locations..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reasonForRevision"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Describe the reason..." rows={2} data-testid="input-edit-reason" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="p-4 border-2 border-dashed rounded-lg text-center hover:border-primary/50 transition-colors bg-muted/30">
                <input
                  type="file"
                  id="edit-file-upload"
                  className="hidden"
                  accept=".doc,.docx"
                  onChange={handleFileChange}
                />
                <label htmlFor="edit-file-upload" className="cursor-pointer">
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.preventDefault(); setSelectedFile(null); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload corrected Word document</p>
                      <p className="text-xs text-muted-foreground">Leave empty to keep existing file</p>
                    </div>
                  )}
                </label>
              </div>

              <div className="space-y-2">
                <Label>Share with Departments</Label>
                <div className="relative" ref={dropdownRef}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full justify-between bg-muted border-border"
                  >
                    <span className="text-muted-foreground">
                      {selectedDepartments.length > 0
                        ? `${selectedDepartments.length} department(s) selected`
                        : "Select departments..."}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                  </Button>

                  {dropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg">
                      <div className="p-2 border-b border-border">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search departments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 bg-muted"
                          />
                        </div>
                      </div>

                      <div className="max-h-[300px] overflow-y-auto">
                        {getFilteredCategories().map((category) => {
                          const isExpanded = expandedCategories.includes(category.id);
                          const allSelected = category.departments.every((d) => selectedDepartments.includes(d.id));

                          return (
                            <div key={category.id} className="border-b border-border last:border-b-0">
                              <div
                                className="flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer"
                                onClick={() => toggleCategory(category.id)}
                              >
                                <div className="flex items-center gap-2">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  <span className="font-medium text-sm">{category.name}</span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleSelectAllCategory(category); }}
                                  className="text-[10px] h-5"
                                >
                                  {allSelected ? "Deselect All" : "Select All"}
                                </Button>
                              </div>

                              {isExpanded && (
                                <div className="pb-1 px-1">
                                  {category.departments.map((dept) => (
                                    <div
                                      key={dept.id}
                                      className="flex items-center gap-2 py-1 px-6 hover:bg-muted/30 rounded cursor-pointer"
                                      onClick={() => handleDepartmentToggle(dept.id)}
                                    >
                                      <Checkbox
                                        checked={selectedDepartments.includes(dept.id)}
                                        onCheckedChange={() => handleDepartmentToggle(dept.id)}
                                      />
                                      <span className="text-xs">{dept.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {selectedDepartments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedDepartments.slice(0, 8).map((deptId) => (
                      <span
                        key={deptId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-sm"
                      >
                        {getDepartmentName(deptId)}
                        <button type="button" onClick={() => setSelectedDepartments(prev => prev.filter(id => id !== deptId))}>
                          <X className="h-2 w-2" />
                        </button>
                      </span>
                    ))}
                    {selectedDepartments.length > 8 && (
                      <span className="text-[10px] text-muted-foreground flex items-center">+{selectedDepartments.length - 8} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                form.reset();
                onClose();
              }} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-edit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
