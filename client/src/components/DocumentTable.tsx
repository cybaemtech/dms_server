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
  location?: string | null;
  dateOfRev?: string | null;
  duePeriodYears?: number;
  reasonForRevision?: string;
  reviewDueDate?: string;
  departments?: { id: string; name: string }[];
}

interface DocumentTableProps {
  documents: Document[];
  onView?: (doc: Document) => void;
  onViewWord?: (doc: Document) => void;
  onDownload?: (doc: Document) => void;
  onRevise?: (doc: Document) => void;
  onEdit?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  onApprove?: (doc: Document) => void;
  onDecline?: (doc: Document) => void;
  showActions?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  showLocation?: boolean;
}

export default function DocumentTable({
  documents,
  onView,
  onViewWord,
  onDownload,
  onRevise,
  onEdit,
  onDelete,
  onApprove,
  onDecline,
  showActions = true,
  canEdit = false,
  canDelete = false,
  showLocation = false,
}: DocumentTableProps) {
  return (
    <div className="border border-slate-300 rounded-sm overflow-hidden" data-testid="table-documents">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="px-2 py-1.5 border-r border-slate-300 text-left text-[11px] font-bold text-slate-700 uppercase">Document Name</th>
              <th className="px-2 py-1.5 border-r border-slate-300 text-left text-[11px] font-bold text-slate-700 uppercase">Doc Number</th>
              <th className="px-2 py-1.5 border-r border-slate-300 text-left text-[11px] font-bold text-slate-700 uppercase">Status</th>
              <th className="px-2 py-1.5 border-r border-slate-300 text-left text-[11px] font-bold text-slate-700 uppercase">Revision</th>
              <th className="px-2 py-1.5 border-r border-slate-300 text-left text-[11px] font-bold text-slate-700 uppercase">Date</th>
              <th className="px-2 py-1.5 border-r border-slate-300 text-left text-[11px] font-bold text-slate-700 uppercase">Prepared By</th>
              <th className="px-2 py-1.5 border-r border-slate-300 text-left text-[11px] font-bold text-slate-700 uppercase">Departments</th>
              {showLocation && (
                <th className="px-2 py-1.5 border-r border-slate-300 text-left text-[11px] font-bold text-slate-700 uppercase">Location</th>
              )}
              {showActions && (
                <th className="px-2 py-1.5 text-right text-[11px] font-bold text-slate-700 uppercase">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr
                key={doc.id}
                className="hover:bg-slate-50 even:bg-slate-50/50 border-b border-slate-200 transition-colors"
                data-testid={`row-document-${doc.id}`}
              >
                <td className="px-2 py-1 border-r border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-primary/60" />
                    <span className="text-xs font-semibold text-slate-800">{doc.docName}</span>
                  </div>
                </td>
                <td className="px-2 py-1 border-r border-slate-200">
                  <span className="text-[10px] font-mono text-slate-600">{doc.docNumber}</span>
                </td>
                <td className="px-2 py-1 border-r border-slate-200">
                  <StatusBadge status={doc.status} />
                </td>
                <td className="px-2 py-1 border-r border-slate-200 text-center">
                  <span className="text-xs text-slate-700">Rev {doc.revisionNo}</span>
                </td>
                <td className="px-2 py-1 border-r border-slate-200">
                  <span className="text-[10px] text-slate-500 font-medium">{doc.dateOfIssue}</span>
                </td>
                <td className="px-2 py-1 border-r border-slate-200">
                  <span className="text-[10px] text-slate-600 font-medium">{doc.preparedBy}</span>
                </td>
                <td className="px-2 py-1 border-r border-slate-200">
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {doc.departments && doc.departments.length > 0
                      ? doc.departments.map(d => d.name).join(', ')
                      : '-'}
                  </span>
                </td>
                {showLocation && (
                  <td className="px-2 py-1 border-r border-slate-200">
                    <span className="text-[10px] text-slate-600">{doc.location || '-'}</span>
                  </td>
                )}
                {showActions && (
                  <td className="px-2 py-1">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => onView?.(doc)}
                        data-testid={`button-view-${doc.id}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 p-0" data-testid={`button-menu-${doc.id}`}>
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          {onViewWord && (
                            <DropdownMenuItem onClick={() => onViewWord(doc)} data-testid={`menu-view-word-${doc.id}`}>
                              <FileText className="w-3.5 h-3.5 mr-2" />
                              View Word
                            </DropdownMenuItem>
                          )}
                          {onDownload && (
                            <DropdownMenuItem onClick={() => onDownload(doc)} data-testid={`menu-download-word-${doc.id}`}>
                              <Download className="w-3.5 h-3.5 mr-2" />
                              Download as Word
                            </DropdownMenuItem>
                          )}
                          {canEdit && onEdit && (doc.status !== "Approved" && doc.status !== "Issued") && (
                            <DropdownMenuItem
                              onClick={() => onEdit(doc)}
                            >
                              <Edit className="w-3.5 h-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onRevise && doc.status === "Issued" && (
                            <DropdownMenuItem
                              onClick={() => onRevise(doc)}
                            >
                              <Edit className="w-3.5 h-3.5 mr-2" />
                              Revise
                            </DropdownMenuItem>
                          )}
                          {canDelete && onDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDelete(doc)}
                                disabled={doc.status === "Approved" || doc.status === "Issued"}
                                className={doc.status === "Approved" || doc.status === "Issued" ? "text-muted-foreground cursor-not-allowed" : "text-destructive focus:text-destructive"}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
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
