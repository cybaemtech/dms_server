import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Download, MoreVertical, Edit, Trash2 } from "lucide-react";
import StatusBadge, { DocumentStatus } from "./StatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Document {
  id: string;
  docName: string;
  docNumber: string;
  status: DocumentStatus;
  dateOfIssue: string;
  revisionNo: number;
  preparedBy: string;
  duePeriodYears?: number;
  reasonForRevision?: string;
}

interface DocumentTableProps {
  documents: Document[];
  onView?: (doc: Document) => void;
  onViewWord?: (doc: Document) => void;
  onDownload?: (doc: Document) => void;
  onEdit?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  onApprove?: (doc: Document) => void;
  onDecline?: (doc: Document) => void;
  showActions?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export default function DocumentTable({
  documents,
  onView,
  onViewWord,
  onDownload,
  onEdit,
  onDelete,
  onApprove,
  onDecline,
  showActions = true,
  canEdit = false,
  canDelete = false,
}: DocumentTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden" data-testid="table-documents">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Document Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Doc Number</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Revision</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Date</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Prepared By</th>
              {showActions && (
                <th className="px-6 py-3 text-right text-sm font-medium text-foreground">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {documents.map((doc) => (
              <tr
                key={doc.id}
                className="hover-elevate active-elevate-2"
                data-testid={`row-document-${doc.id}`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{doc.docName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-mono text-muted-foreground">{doc.docNumber}</span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={doc.status} />
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-foreground">Rev {doc.revisionNo}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-muted-foreground">{doc.dateOfIssue}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-muted-foreground">{doc.preparedBy}</span>
                </td>
                {showActions && (
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onView?.(doc)}
                        data-testid={`button-view-${doc.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" data-testid={`button-menu-${doc.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onViewWord && (
                            <DropdownMenuItem onClick={() => onViewWord(doc)} data-testid={`menu-view-word-${doc.id}`}>
                              <FileText className="w-4 h-4 mr-2" />
                              View Word
                            </DropdownMenuItem>
                          )}
                          {onDownload && (
                            <DropdownMenuItem onClick={() => onDownload(doc)} data-testid={`menu-download-word-${doc.id}`}>
                              <Download className="w-4 h-4 mr-2" />
                              Download as Word
                            </DropdownMenuItem>
                          )}
                          {canEdit && onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(doc)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && onDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDelete(doc)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                          {onApprove && (doc.status === "Pending" || doc.status === "Approved") && (
                            <DropdownMenuItem onClick={() => onApprove(doc)} data-testid={`menu-approve-${doc.id}`}>
                              {doc.status === "Approved" ? "Issue" : "Approve"}
                            </DropdownMenuItem>
                          )}
                          {onDecline && (doc.status === "Pending" || doc.status === "Approved") && (
                            <DropdownMenuItem onClick={() => onDecline(doc)} data-testid={`menu-decline-${doc.id}`}>
                              Decline
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
