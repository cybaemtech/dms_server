import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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

const documentSchema = z.object({
  docName: z.string().min(1, "Document name is required"),
  docNumber: z.string().min(1, "Document number is required"),
  dateOfIssue: z.string().min(1, "Date of issue is required"),
  revisionNumber: z.string().min(1, "Revision number is required"),
  duePeriodYears: z.string().optional(),
  preparerName: z.string().min(1, "Preparer name is required"),
  reasonForRevision: z.string().optional(),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

interface DocumentEditDialogProps {
  document: Document | null;
  open: boolean;
  onClose: () => void;
  onSave?: (docId: string, data: DocumentFormValues) => void;
}

export default function DocumentEditDialog({
  document,
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
      reasonForRevision: "",
    },
  });

  useEffect(() => {
    if (document) {
      form.reset({
        docName: document.docName,
        docNumber: document.docNumber,
        dateOfIssue: document.dateOfIssue,
        revisionNumber: document.revisionNo.toString(),
        duePeriodYears: (document as any).duePeriodYears?.toString() || "",
        preparerName: document.preparedBy,
        reasonForRevision: (document as any).reasonForRevision || "",
      });
    }
  }, [document, form]);

  const handleSubmit = (data: DocumentFormValues) => {
    if (document) {
      console.log("Saving document edit:", data);
      onSave?.(document.id, data);
      onClose();
    }
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-document">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="docName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Name *</FormLabel>
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
                      <Input {...field} data-testid="input-edit-doc-number" />
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
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value)}
                        data-testid="input-edit-revision-number" 
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
                      <Input type="number" {...field} data-testid="input-edit-due-period" />
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
                      <Input {...field} data-testid="input-edit-preparer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reasonForRevision"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Revision</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      data-testid="input-edit-revision-reason"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                form.reset();
                onClose();
              }} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-edit">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
