// DMS Schema - TypeScript types for SQL Server
// No Drizzle/PostgreSQL dependencies - pure TypeScript interfaces

// =============================================
// User
// =============================================
export interface User {
  id: string;
  username: string;
  password: string;
  role: string;
  fullName: string;
  masterCopyAccess: boolean;
  departmentId: string | null;
  departmentName: string | null;
  departmentCode: string | null;
  location: string | null;
}

export interface InsertUser {
  username: string;
  password: string;
  fullName: string;
  role?: string;
  masterCopyAccess?: boolean;
  departmentId?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  location?: string | null;
}

// =============================================
// Department
// =============================================
export interface Department {
  id: string;
  name: string;
  code: string;
  category: string | null;
  categoryName: string | null;
  createdAt: Date;
}

export interface InsertDepartment {
  name: string;
  code?: string | null;
  category?: string | null;
  categoryName?: string | null;
}

// =============================================
// Document
// =============================================
export interface Document {
  id: string;
  docName: string;
  docNumber: string;
  status: string;
  dateOfIssue: Date | null;
  revisionNo: number;
  preparedBy: string;
  approvedBy: string | null;
  issuedBy: string | null;
  content: string | null;
  headerInfo: string | null;
  footerInfo: string | null;
  duePeriodYears: number | null;
  reasonForRevision: string | null;
  reviewDueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  issuedAt: Date | null;
  approvalRemarks: string | null;
  declineRemarks: string | null;
  issueRemarks: string | null;
  issuerName: string | null;
  previousVersionId: string | null;
  pdfFilePath: string | null;
  wordFilePath: string | null;
  creatorData: { id: string; username: string; fullName: string; role: string } | null;
  approverData: { id: string; username: string; fullName: string; role: string } | null;
  issuerData: { id: string; username: string; fullName: string; role: string } | null;
  issueNo: string | null;
  originalDateOfIssue: Date | null;
  preparerName: string | null;
  approverName: string | null;
  pageCount: number | null;
  location: string | null;
  dateOfRev: Date | null;
}

export interface InsertDocument {
  docName: string;
  docNumber: string;
  status?: string;
  dateOfIssue?: Date | string | null;
  revisionNo?: number;
  preparedBy: string;
  approvedBy?: string | null;
  issuedBy?: string | null;
  content?: string | null;
  headerInfo?: string | null;
  footerInfo?: string | null;
  duePeriodYears?: number | null;
  reasonForRevision?: string | null;
  reviewDueDate?: Date | string | null;
  approvalRemarks?: string | null;
  declineRemarks?: string | null;
  issueRemarks?: string | null;
  issuerName?: string | null;
  previousVersionId?: string | null;
  pdfFilePath?: string | null;
  wordFilePath?: string | null;
  creatorData?: { id: string; username: string; fullName: string; role: string } | null;
  approverData?: { id: string; username: string; fullName: string; role: string } | null;
  issuerData?: { id: string; username: string; fullName: string; role: string } | null;
  issueNo?: string | null;
  originalDateOfIssue?: Date | string | null;
  preparerName?: string | null;
  approverName?: string | null;
  pageCount?: number | null;
  location?: string | null;
  dateOfRev?: Date | string | null;
}

// =============================================
// Notification
// =============================================
export interface Notification {
  id: string;
  userId: string;
  documentId: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

export interface InsertNotification {
  userId: string;
  documentId: string;
  message: string;
  type: string;
}

// =============================================
// Control Copy
// =============================================
export interface ControlCopy {
  id: string;
  documentId: string;
  userId: string;
  copyNumber: number;
  actionType: string;
  generatedAt: Date;
}

export interface InsertControlCopy {
  documentId: string;
  userId: string;
  actionType: string;
}

// =============================================
// Print Log
// =============================================
export interface PrintLog {
  id: string;
  documentId: string;
  userId: string;
  controlCopyId: string;
  printedAt: Date;
  medium: string | null;
}

export interface InsertPrintLog {
  documentId: string;
  userId: string;
  controlCopyId: string;
  medium?: string | null;
}

// =============================================
// Document Recipient
// =============================================
export interface DocumentRecipient {
  id: string;
  documentId: string;
  userId: string | null;
  departmentId: string | null;
  notifiedAt: Date;
  readAt: Date | null;
}

export interface InsertDocumentRecipient {
  documentId: string;
  userId?: string | null;
  departmentId?: string | null;
}

// =============================================
// Document Department (junction table)
// =============================================
export interface DocumentDepartment {
  id: string;
  documentId: string;
  departmentId: string;
  createdAt: Date;
}
