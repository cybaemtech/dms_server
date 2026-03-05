import { getPool, sql } from "./db";
import {
  type User,
  type InsertUser,
  type Document,
  type InsertDocument,
  type Department,
  type InsertDepartment,
  type Notification,
  type InsertNotification,
  type ControlCopy,
  type InsertControlCopy,
  type PrintLog,
  type InsertPrintLog,
  type DocumentRecipient,
  type InsertDocumentRecipient
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByStatus(status: string, userId?: string): Promise<Document[]>;
  getDocumentsByUser(userId: string): Promise<Document[]>;
  getDocumentsByDocNumber(docNumber: string): Promise<Document[]>;
  getDocumentsByDepartment(departmentId: string, status?: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined>;

  getDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  deleteDepartment(id: string): Promise<void>;

  assignDocumentToDepartments(documentId: string, departmentIds: string[]): Promise<void>;
  getDocumentDepartments(documentId: string): Promise<Department[]>;

  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;

  getUsersByRole(role: string): Promise<User[]>;

  createControlCopy(controlCopy: Omit<InsertControlCopy, 'copyNumber'>): Promise<ControlCopy>;
  getControlCopiesByDocument(documentId: string): Promise<ControlCopy[]>;
  getControlCopiesByUser(userId: string): Promise<ControlCopy[]>;

  createPrintLog(printLog: InsertPrintLog): Promise<PrintLog>;
  getPrintLogsByDocument(documentId: string): Promise<PrintLog[]>;
  getPrintLogsByUser(userId: string): Promise<PrintLog[]>;

  createDocumentRecipient(recipient: InsertDocumentRecipient): Promise<DocumentRecipient>;
  getDocumentRecipients(documentId: string): Promise<DocumentRecipient[]>;
  getUserAccessibleDocuments(userId: string): Promise<Document[]>;
  hasUserPrintedDocument(userId: string, documentId: string): Promise<boolean>;
}

// Helper: Map SQL Server row to User object
function mapUser(row: any): User {
  // Extract location safely handling potential casing or raw row structure
  const location = row.location || row.Location || row.LOCATION || null;

  return {
    id: row.id,
    username: row.username,
    password: row.password,
    role: row.role,
    fullName: row.full_name || row.fullName,
    masterCopyAccess: row.master_copy_access === true || row.master_copy_access === 1 || row.masterCopyAccess === true,
    departmentId: row.department_id || row.departmentId || null,
    departmentName: row.department_name || row.departmentName || null,
    departmentCode: row.department_code || row.departmentCode || null,
    location: (typeof location === 'string') ? location.trim() : location,
  };
}

// Helper: Map SQL Server row to Department object
function mapDepartment(row: any): Department {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    category: row.category || null,
    categoryName: row.category_name || null,
    createdAt: row.created_at,
  };
}

// Helper: Map SQL Server row to Document object
function mapDocument(row: any): Document {
  return {
    id: row.id,
    docName: row.doc_name,
    docNumber: row.doc_number,
    status: row.status,
    dateOfIssue: row.date_of_issue || null,
    revisionNo: row.revision_no || 0,
    preparedBy: row.prepared_by,
    approvedBy: row.approved_by || null,
    issuedBy: row.issued_by || null,
    content: row.content || null,
    headerInfo: row.header_info || null,
    footerInfo: row.footer_info || null,
    duePeriodYears: row.due_period_years || null,
    reasonForRevision: row.reason_for_revision || null,
    reviewDueDate: row.review_due_date || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at || null,
    issuedAt: row.issued_at || null,
    approvalRemarks: row.approval_remarks || null,
    declineRemarks: row.decline_remarks || null,
    issueRemarks: row.issue_remarks || null,
    issuerName: row.issuer_name || null,
    previousVersionId: row.previous_version_id || null,
    pdfFilePath: row.pdf_file_path || null,
    wordFilePath: row.word_file_path || null,
    creatorData: row.creator_data ? (typeof row.creator_data === 'string' ? JSON.parse(row.creator_data) : row.creator_data) : null,
    approverData: row.approver_data ? (typeof row.approver_data === 'string' ? JSON.parse(row.approver_data) : row.approver_data) : null,
    issuerData: row.issuer_data ? (typeof row.issuer_data === 'string' ? JSON.parse(row.issuer_data) : row.issuer_data) : null,
    issueNo: row.issue_no || null,
    originalDateOfIssue: row.original_date_of_issue || null,
    preparerName: row.preparer_name || null,
    approverName: row.approver_name || null,
    pageCount: row.page_count || null,
    location: row.location || null,
    dateOfRev: row.date_of_rev || null,
  };
}

// Helper: Map SQL Server row to Notification object
function mapNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    documentId: row.document_id,
    message: row.message,
    type: row.type,
    isRead: row.is_read === true || row.is_read === 1,
    createdAt: row.created_at,
  };
}

// Helper: Map SQL Server row to ControlCopy object
function mapControlCopy(row: any): ControlCopy {
  return {
    id: row.id,
    documentId: row.document_id,
    userId: row.user_id,
    copyNumber: row.copy_number,
    actionType: row.action_type,
    generatedAt: row.generated_at,
  };
}

// Helper: Map SQL Server row to PrintLog object
function mapPrintLog(row: any): PrintLog {
  return {
    id: row.id,
    documentId: row.document_id,
    userId: row.user_id,
    controlCopyId: row.control_copy_id,
    printedAt: row.printed_at,
    medium: row.medium || null,
  };
}

// Helper: Map SQL Server row to DocumentRecipient object
function mapDocumentRecipient(row: any): DocumentRecipient {
  return {
    id: row.id,
    documentId: row.document_id,
    userId: row.user_id || null,
    departmentId: row.department_id || null,
    notifiedAt: row.notified_at,
    readAt: row.read_at || null,
  };
}

// Generate unique ID
function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

export class SqlServerStorage implements IStorage {

  // =============================================
  // Users
  // =============================================

  async getUserByUsername(username: string): Promise<User | undefined> {
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT id, username, password, role, full_name, master_copy_access, department_id, department_name, department_code, location FROM users WHERE username = @username');
    return result.recordset.length > 0 ? mapUser(result.recordset[0]) : undefined;
  }

  async getUser(id: string): Promise<User | undefined> {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .query('SELECT id, username, password, role, full_name, master_copy_access, department_id, department_name, department_code, location FROM users WHERE id = @id');
    return result.recordset.length > 0 ? mapUser(result.recordset[0]) : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const pool = await getPool();

    // Generate auto-increment user ID based on role
    const rolePrefix: Record<string, string> = {
      'creator': 'CA',
      'approver': 'AD',
      'issuer': 'IA',
      'admin': 'AM',
      'recipient': 'RC'
    };

    const prefix = rolePrefix[insertUser.role || 'creator'] || 'US';

    // Get the next number for this role prefix
    const countResult = await pool.request()
      .input('prefix', sql.NVarChar, `${prefix}-%`)
      .query('SELECT id FROM users WHERE id LIKE @prefix');

    let nextNumber = 1;
    if (countResult.recordset.length > 0) {
      const numbers = countResult.recordset.map((r: any) => {
        const match = r.id.match(new RegExp(`^${prefix}-(\\d+)$`));
        return match ? parseInt(match[1], 10) : 0;
      }).filter((num: number) => !isNaN(num));

      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }

    const userId = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
    
    // Handle department fields syncing
    let deptId = (insertUser as any).departmentId;
    if (deptId === "") deptId = null;
    
    let deptName = (insertUser as any).departmentName || null;
    let deptCode = (insertUser as any).departmentCode || null;
    
    if (deptId && (!deptName || !deptCode)) {
      const deptResult = await pool.request()
        .input('id', sql.NVarChar, deptId)
        .query('SELECT name, code FROM departments WHERE id = @id');
      if (deptResult.recordset.length > 0) {
        deptName = deptResult.recordset[0].name;
        deptCode = deptResult.recordset[0].code;
      }
    }

    await pool.request()
      .input('id', sql.NVarChar, userId)
      .input('username', sql.NVarChar, insertUser.username)
      .input('password', sql.NVarChar, insertUser.password)
      .input('role', sql.NVarChar, insertUser.role || 'creator')
      .input('fullName', sql.NVarChar, insertUser.fullName)
      .input('masterCopyAccess', sql.Bit, insertUser.masterCopyAccess ? 1 : 0)
      .input('departmentId', sql.NVarChar, deptId)
      .input('departmentName', sql.NVarChar, deptName)
      .input('departmentCode', sql.NVarChar, deptCode)
      .input('location', sql.NVarChar, (insertUser as any).location || null)
      .query(`INSERT INTO users (id, username, password, role, full_name, master_copy_access, department_id, department_name, department_code, location)
              VALUES (@id, @username, @password, @role, @fullName, @masterCopyAccess, @departmentId, @departmentName, @departmentCode, @location)`);

    return (await this.getUser(userId))!;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const pool = await getPool();
    const existing = await this.getUser(id);
    if (!existing) throw new Error(`User with id ${id} not found`);

    const setClauses: string[] = [];
    const request = pool.request().input('id', sql.NVarChar, id);

    if (updates.username !== undefined) { setClauses.push('username = @username'); request.input('username', sql.NVarChar, updates.username); }
    if (updates.password !== undefined && updates.password !== "") { setClauses.push('password = @password'); request.input('password', sql.NVarChar, updates.password); }
    if (updates.role !== undefined) { setClauses.push('role = @role'); request.input('role', sql.NVarChar, updates.role); }
    if (updates.fullName !== undefined) { setClauses.push('full_name = @fullName'); request.input('fullName', sql.NVarChar, updates.fullName); }
    if (updates.masterCopyAccess !== undefined) { setClauses.push('master_copy_access = @masterCopyAccess'); request.input('masterCopyAccess', sql.Bit, updates.masterCopyAccess ? 1 : 0); }
    
    // Handle department updates with empty-string-to-null conversion
    let deptId = updates.departmentId;
    if (deptId === "") deptId = null;
    
    if (updates.departmentId !== undefined) { 
      setClauses.push('department_id = @departmentId'); 
      request.input('departmentId', sql.NVarChar, deptId); 
      
      // If departmentId is changed, try to update name and code too
      if (deptId) {
        const deptResult = await pool.request()
          .input('did', sql.NVarChar, deptId)
          .query('SELECT name, code FROM departments WHERE id = @did');
        if (deptResult.recordset.length > 0) {
          const d = deptResult.recordset[0];
          setClauses.push('department_name = @dn');
          request.input('dn', sql.NVarChar, d.name);
          setClauses.push('department_code = @dc');
          request.input('dc', sql.NVarChar, d.code);
        }
      } else {
        setClauses.push('department_name = NULL');
        setClauses.push('department_code = NULL');
      }
    } else {
      if (updates.departmentName !== undefined) { setClauses.push('department_name = @departmentName'); request.input('departmentName', sql.NVarChar, updates.departmentName); }
      if (updates.departmentCode !== undefined) { setClauses.push('department_code = @departmentCode'); request.input('departmentCode', sql.NVarChar, updates.departmentCode); }
    }

    if (updates.location !== undefined) { setClauses.push('location = @location'); request.input('location', sql.NVarChar, updates.location); }

    if (setClauses.length > 0) {
      await request.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = @id`);
    }

    return this.getUser(id);
  }

  async deleteUser(id: string): Promise<void> {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .query('DELETE FROM users WHERE id = @id');
    if (result.rowsAffected[0] === 0) {
      throw new Error(`User with id ${id} not found`);
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('role', sql.NVarChar, role)
      .query('SELECT * FROM users WHERE role = @role');
    return result.recordset.map(mapUser);
  }

  // =============================================
  // Documents
  // =============================================

  async getDocument(id: string): Promise<Document | undefined> {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .query('SELECT * FROM documents WHERE id = @id');
    return result.recordset.length > 0 ? mapDocument(result.recordset[0]) : undefined;
  }

  async getDocumentsByStatus(status: string): Promise<Document[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('status', sql.NVarChar, status)
      .query('SELECT * FROM documents WHERE status = @status ORDER BY created_at DESC');
    return result.recordset.map(mapDocument);
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT * FROM documents WHERE prepared_by = @userId ORDER BY created_at DESC');
    return result.recordset.map(mapDocument);
  }

  async getDocumentsByDocNumber(docNumber: string): Promise<Document[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('docNumber', sql.NVarChar, docNumber)
      .query('SELECT * FROM documents WHERE doc_number = @docNumber ORDER BY revision_no DESC');
    return result.recordset.map(mapDocument);
  }

  async getDocumentsByDepartment(departmentId: string, status?: string): Promise<Document[]> {
    const pool = await getPool();
    const request = pool.request().input('departmentId', sql.NVarChar, departmentId);
    
    let query = `SELECT DISTINCT d.* FROM documents d
                 INNER JOIN document_departments dd ON d.id = dd.document_id
                 WHERE dd.department_id = @departmentId`;
                 
    if (status) {
      query += ` AND d.status = @status`;
      request.input('status', sql.NVarChar, status);
    }
    
    query += ` ORDER BY d.created_at DESC`;
    
    const result = await request.query(query);
    return result.recordset.map(mapDocument);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const pool = await getPool();
    const docId = `doc-${Date.now()}`;

    await pool.request()
      .input('id', sql.NVarChar, docId)
      .input('docName', sql.NVarChar, insertDocument.docName)
      .input('docNumber', sql.NVarChar, insertDocument.docNumber)
      .input('status', sql.NVarChar, insertDocument.status || 'pending')
      .input('dateOfIssue', sql.DateTime2, insertDocument.dateOfIssue ? new Date(insertDocument.dateOfIssue as any) : new Date())
      .input('revisionNo', sql.Int, Number(insertDocument.revisionNo) || 0)
      .input('preparedBy', sql.NVarChar, insertDocument.preparedBy)
      .input('approvedBy', sql.NVarChar, insertDocument.approvedBy || null)
      .input('issuedBy', sql.NVarChar, insertDocument.issuedBy || null)
      .input('content', sql.NVarChar(sql.MAX), insertDocument.content || null)
      .input('headerInfo', sql.NVarChar(sql.MAX), insertDocument.headerInfo || null)
      .input('footerInfo', sql.NVarChar(sql.MAX), insertDocument.footerInfo || null)
      .input('duePeriodYears', sql.Int, Number(insertDocument.duePeriodYears) || null)
      .input('reasonForRevision', sql.NVarChar(sql.MAX), insertDocument.reasonForRevision || null)
      .input('reviewDueDate', sql.DateTime2, insertDocument.reviewDueDate ? new Date(insertDocument.reviewDueDate as any) : null)
      .input('approvalRemarks', sql.NVarChar(sql.MAX), insertDocument.approvalRemarks || null)
      .input('declineRemarks', sql.NVarChar(sql.MAX), insertDocument.declineRemarks || null)
      .input('previousVersionId', sql.NVarChar, insertDocument.previousVersionId || null)
      .input('pdfFilePath', sql.NVarChar, insertDocument.pdfFilePath || null)
      .input('wordFilePath', sql.NVarChar, insertDocument.wordFilePath || null)
      .input('creatorData', sql.NVarChar(sql.MAX), insertDocument.creatorData ? JSON.stringify(insertDocument.creatorData) : null)
      .input('issueNo', sql.NVarChar, (insertDocument as any).issueNo || null)
      .input('originalDateOfIssue', sql.DateTime2, (insertDocument as any).originalDateOfIssue ? new Date((insertDocument as any).originalDateOfIssue) : null)
      .input('preparerName', sql.NVarChar, (insertDocument as any).preparerName || null)
      .input('approverName', sql.NVarChar, (insertDocument as any).approverName || null)
      .input('pageCount', sql.Int, (insertDocument as any).pageCount || null)
      .input('location', sql.NVarChar, (insertDocument as any).location || null)
      .input('dateOfRev', sql.DateTime2, (insertDocument as any).dateOfRev ? new Date((insertDocument as any).dateOfRev) : null)
      .query(`INSERT INTO documents (id, doc_name, doc_number, status, date_of_issue, revision_no, prepared_by, approved_by, issued_by, content, header_info, footer_info, due_period_years, reason_for_revision, review_due_date, approval_remarks, decline_remarks, previous_version_id, pdf_file_path, word_file_path, creator_data, issue_no, original_date_of_issue, preparer_name, approver_name, page_count, location, date_of_rev)
              VALUES (@id, @docName, @docNumber, @status, @dateOfIssue, @revisionNo, @preparedBy, @approvedBy, @issuedBy, @content, @headerInfo, @footerInfo, @duePeriodYears, @reasonForRevision, @reviewDueDate, @approvalRemarks, @declineRemarks, @previousVersionId, @pdfFilePath, @wordFilePath, @creatorData, @issueNo, @originalDateOfIssue, @preparerName, @approverName, @pageCount, @location, @dateOfRev)`);

    return (await this.getDocument(docId))!;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const pool = await getPool();
    const existing = await this.getDocument(id);
    if (!existing) return undefined;

    const setClauses: string[] = [];
    const request = pool.request().input('id', sql.NVarChar, id);

    if (updates.docName !== undefined) { setClauses.push('doc_name = @docName'); request.input('docName', sql.NVarChar, updates.docName); }
    if (updates.docNumber !== undefined) { setClauses.push('doc_number = @docNumber'); request.input('docNumber', sql.NVarChar, updates.docNumber); }
    if (updates.status !== undefined) { setClauses.push('status = @status'); request.input('status', sql.NVarChar, updates.status); }
    if (updates.dateOfIssue !== undefined) { setClauses.push('date_of_issue = @dateOfIssue'); request.input('dateOfIssue', sql.DateTime2, updates.dateOfIssue ? new Date(updates.dateOfIssue as any) : null); }
    if (updates.revisionNo !== undefined) { setClauses.push('revision_no = @revisionNo'); request.input('revisionNo', sql.Int, updates.revisionNo); }
    if (updates.preparedBy !== undefined) { setClauses.push('prepared_by = @preparedBy'); request.input('preparedBy', sql.NVarChar, updates.preparedBy); }
    if (updates.approvedBy !== undefined) { setClauses.push('approved_by = @approvedBy'); request.input('approvedBy', sql.NVarChar, updates.approvedBy); }
    if (updates.issuedBy !== undefined) { setClauses.push('issued_by = @issuedBy'); request.input('issuedBy', sql.NVarChar, updates.issuedBy); }
    if (updates.content !== undefined) { setClauses.push('content = @content'); request.input('content', sql.NVarChar(sql.MAX), updates.content); }
    if (updates.headerInfo !== undefined) { setClauses.push('header_info = @headerInfo'); request.input('headerInfo', sql.NVarChar(sql.MAX), updates.headerInfo); }
    if (updates.footerInfo !== undefined) { setClauses.push('footer_info = @footerInfo'); request.input('footerInfo', sql.NVarChar(sql.MAX), updates.footerInfo); }
    if (updates.duePeriodYears !== undefined) { setClauses.push('due_period_years = @duePeriodYears'); request.input('duePeriodYears', sql.Int, updates.duePeriodYears); }
    if (updates.reasonForRevision !== undefined) { setClauses.push('reason_for_revision = @reasonForRevision'); request.input('reasonForRevision', sql.NVarChar(sql.MAX), updates.reasonForRevision); }
    if (updates.reviewDueDate !== undefined) { setClauses.push('review_due_date = @reviewDueDate'); request.input('reviewDueDate', sql.DateTime2, updates.reviewDueDate ? new Date(updates.reviewDueDate as any) : null); }
    if (updates.approvedAt !== undefined) { setClauses.push('approved_at = @approvedAt'); request.input('approvedAt', sql.DateTime2, updates.approvedAt ? new Date(updates.approvedAt as any) : null); }
    if (updates.issuedAt !== undefined) { setClauses.push('issued_at = @issuedAt'); request.input('issuedAt', sql.DateTime2, updates.issuedAt ? new Date(updates.issuedAt as any) : null); }
    if (updates.approvalRemarks !== undefined) { setClauses.push('approval_remarks = @approvalRemarks'); request.input('approvalRemarks', sql.NVarChar(sql.MAX), updates.approvalRemarks); }
    if (updates.declineRemarks !== undefined) { setClauses.push('decline_remarks = @declineRemarks'); request.input('declineRemarks', sql.NVarChar(sql.MAX), updates.declineRemarks); }
    if (updates.issueRemarks !== undefined) { setClauses.push('issue_remarks = @issueRemarks'); request.input('issueRemarks', sql.NVarChar(sql.MAX), updates.issueRemarks); }
    if (updates.issuerName !== undefined) { setClauses.push('issuer_name = @issuerName'); request.input('issuerName', sql.NVarChar, updates.issuerName); }
    if (updates.previousVersionId !== undefined) { setClauses.push('previous_version_id = @previousVersionId'); request.input('previousVersionId', sql.NVarChar, updates.previousVersionId); }
    if (updates.pdfFilePath !== undefined) { setClauses.push('pdf_file_path = @pdfFilePath'); request.input('pdfFilePath', sql.NVarChar, updates.pdfFilePath); }
    if (updates.wordFilePath !== undefined) { setClauses.push('word_file_path = @wordFilePath'); request.input('wordFilePath', sql.NVarChar, updates.wordFilePath); }
    if (updates.creatorData !== undefined) { setClauses.push('creator_data = @creatorData'); request.input('creatorData', sql.NVarChar(sql.MAX), updates.creatorData ? JSON.stringify(updates.creatorData) : null); }
    if (updates.approverData !== undefined) { setClauses.push('approver_data = @approverData'); request.input('approverData', sql.NVarChar(sql.MAX), updates.approverData ? JSON.stringify(updates.approverData) : null); }
    if (updates.issuerData !== undefined) { setClauses.push('issuer_data = @issuerData'); request.input('issuerData', sql.NVarChar(sql.MAX), updates.issuerData ? JSON.stringify(updates.issuerData) : null); }
    if (updates.issueNo !== undefined) { setClauses.push('issue_no = @issueNo'); request.input('issueNo', sql.NVarChar, updates.issueNo); }
    if (updates.originalDateOfIssue !== undefined) { setClauses.push('original_date_of_issue = @originalDateOfIssue'); request.input('originalDateOfIssue', sql.DateTime2, updates.originalDateOfIssue ? new Date(updates.originalDateOfIssue as any) : null); }
    if (updates.preparerName !== undefined) { setClauses.push('preparer_name = @preparerName'); request.input('preparerName', sql.NVarChar, updates.preparerName); }
    if (updates.approverName !== undefined) { setClauses.push('approver_name = @approverName'); request.input('approverName', sql.NVarChar, updates.approverName); }
    if (updates.pageCount !== undefined) { setClauses.push('page_count = @pageCount'); request.input('pageCount', sql.Int, updates.pageCount); }
    if (updates.location !== undefined) { setClauses.push('location = @location'); request.input('location', sql.NVarChar, updates.location); }
    if (updates.dateOfRev !== undefined) { setClauses.push('date_of_rev = @dateOfRev'); request.input('dateOfRev', sql.DateTime2, updates.dateOfRev ? new Date(updates.dateOfRev as any) : null); }

    // Always update updated_at
    setClauses.push('updated_at = GETDATE()');

    if (setClauses.length > 0) {
      await request.query(`UPDATE documents SET ${setClauses.join(', ')} WHERE id = @id`);
    }

    return this.getDocument(id);
  }

  // =============================================
  // Departments
  // =============================================

  async getDepartments(): Promise<Department[]> {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM departments ORDER BY name');
    return result.recordset.map(mapDepartment);
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const pool = await getPool();
    const deptId = `dept-${Date.now()}`;

    await pool.request()
      .input('id', sql.NVarChar, deptId)
      .input('name', sql.NVarChar, insertDepartment.name)
      .input('code', sql.NVarChar, insertDepartment.code)
      .input('category', sql.NVarChar, insertDepartment.category || null)
      .input('categoryName', sql.NVarChar, insertDepartment.categoryName || null)
      .query('INSERT INTO departments (id, name, code, category, category_name) VALUES (@id, @name, @code, @category, @categoryName)');

    const result = await pool.request()
      .input('id', sql.NVarChar, deptId)
      .query('SELECT * FROM departments WHERE id = @id');
    return mapDepartment(result.recordset[0]);
  }

  async deleteDepartment(id: string): Promise<void> {
    const pool = await getPool();

    // Remove document-department associations first
    await pool.request()
      .input('departmentId', sql.NVarChar, id)
      .query('DELETE FROM document_departments WHERE department_id = @departmentId');

    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .query('DELETE FROM departments WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      throw new Error(`Department with id ${id} not found`);
    }
  }

  // =============================================
  // Document-Department Assignments
  // =============================================

  async assignDocumentToDepartments(documentId: string, departmentIds: string[]): Promise<void> {
    const pool = await getPool();

    // Remove existing associations
    await pool.request()
      .input('documentId', sql.NVarChar, documentId)
      .query('DELETE FROM document_departments WHERE document_id = @documentId');

    // Insert new associations
    for (const deptId of departmentIds) {
      await pool.request()
        .input('id', sql.NVarChar, generateId('dd'))
        .input('documentId', sql.NVarChar, documentId)
        .input('departmentId', sql.NVarChar, deptId)
        .query('INSERT INTO document_departments (id, document_id, department_id) VALUES (@id, @documentId, @departmentId)');
    }
  }

  async getDocumentDepartments(documentId: string): Promise<Department[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('documentId', sql.NVarChar, documentId)
      .query(`SELECT d.* FROM departments d
              INNER JOIN document_departments dd ON d.id = dd.department_id
              WHERE dd.document_id = @documentId`);
    return result.recordset.map(mapDepartment);
  }

  // =============================================
  // Notifications
  // =============================================

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const pool = await getPool();
    const notifId = generateId('notif');

    await pool.request()
      .input('id', sql.NVarChar, notifId)
      .input('userId', sql.NVarChar, insertNotification.userId)
      .input('documentId', sql.NVarChar, insertNotification.documentId)
      .input('message', sql.NVarChar(sql.MAX), insertNotification.message)
      .input('type', sql.NVarChar, insertNotification.type)
      .query('INSERT INTO notifications (id, user_id, document_id, message, type) VALUES (@id, @userId, @documentId, @message, @type)');

    const result = await pool.request()
      .input('id', sql.NVarChar, notifId)
      .query('SELECT * FROM notifications WHERE id = @id');
    return mapNotification(result.recordset[0]);
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT * FROM notifications WHERE user_id = @userId ORDER BY created_at DESC');
    return result.recordset.map(mapNotification);
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, id)
      .query('UPDATE notifications SET is_read = 1 WHERE id = @id');
  }

  // =============================================
  // Control Copies
  // =============================================

  async createControlCopy(insertControlCopy: Omit<InsertControlCopy, 'copyNumber'>): Promise<ControlCopy> {
    const pool = await getPool();
    const ccId = generateId('cc');

    // Get next copy number
    const copyNumber = await this.getNextCopyNumber(insertControlCopy.documentId, insertControlCopy.userId);

    await pool.request()
      .input('id', sql.NVarChar, ccId)
      .input('documentId', sql.NVarChar, insertControlCopy.documentId)
      .input('userId', sql.NVarChar, insertControlCopy.userId)
      .input('copyNumber', sql.Int, copyNumber)
      .input('actionType', sql.NVarChar, insertControlCopy.actionType)
      .query('INSERT INTO control_copies (id, document_id, user_id, copy_number, action_type) VALUES (@id, @documentId, @userId, @copyNumber, @actionType)');

    const result = await pool.request()
      .input('id', sql.NVarChar, ccId)
      .query('SELECT * FROM control_copies WHERE id = @id');
    return mapControlCopy(result.recordset[0]);
  }

  async getControlCopiesByDocument(documentId: string): Promise<ControlCopy[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('documentId', sql.NVarChar, documentId)
      .query('SELECT * FROM control_copies WHERE document_id = @documentId ORDER BY generated_at DESC');
    return result.recordset.map(mapControlCopy);
  }

  async getControlCopiesByUser(userId: string): Promise<ControlCopy[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT * FROM control_copies WHERE user_id = @userId ORDER BY generated_at DESC');
    return result.recordset.map(mapControlCopy);
  }

  private async getNextCopyNumber(documentId: string, userId: string): Promise<number> {
    const pool = await getPool();
    const result = await pool.request()
      .input('documentId', sql.NVarChar, documentId)
      .input('userId', sql.NVarChar, userId)
      .query('SELECT MAX(copy_number) as maxCopy FROM control_copies WHERE document_id = @documentId AND user_id = @userId');
    return (result.recordset[0].maxCopy || 0) + 1;
  }

  // =============================================
  // Print Logs
  // =============================================

  async createPrintLog(insertPrintLog: InsertPrintLog): Promise<PrintLog> {
    const pool = await getPool();
    const plId = generateId('pl');

    await pool.request()
      .input('id', sql.NVarChar, plId)
      .input('documentId', sql.NVarChar, insertPrintLog.documentId)
      .input('userId', sql.NVarChar, insertPrintLog.userId)
      .input('controlCopyId', sql.NVarChar, insertPrintLog.controlCopyId)
      .input('medium', sql.NVarChar, insertPrintLog.medium || null)
      .query('INSERT INTO print_logs (id, document_id, user_id, control_copy_id, medium) VALUES (@id, @documentId, @userId, @controlCopyId, @medium)');

    const result = await pool.request()
      .input('id', sql.NVarChar, plId)
      .query('SELECT * FROM print_logs WHERE id = @id');
    return mapPrintLog(result.recordset[0]);
  }

  async getPrintLogsByDocument(documentId: string): Promise<PrintLog[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('documentId', sql.NVarChar, documentId)
      .query('SELECT * FROM print_logs WHERE document_id = @documentId ORDER BY printed_at DESC');
    return result.recordset.map(mapPrintLog);
  }

  async getPrintLogsByUser(userId: string): Promise<PrintLog[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT * FROM print_logs WHERE user_id = @userId ORDER BY printed_at DESC');
    return result.recordset.map(mapPrintLog);
  }

  // =============================================
  // Document Recipients
  // =============================================

  async createDocumentRecipient(insertRecipient: InsertDocumentRecipient): Promise<DocumentRecipient> {
    const pool = await getPool();

    if (!insertRecipient.userId && !insertRecipient.departmentId) {
      throw new Error("Document recipient must have either userId or departmentId");
    }

    const drId = generateId('dr');

    await pool.request()
      .input('id', sql.NVarChar, drId)
      .input('documentId', sql.NVarChar, insertRecipient.documentId)
      .input('userId', sql.NVarChar, insertRecipient.userId || null)
      .input('departmentId', sql.NVarChar, insertRecipient.departmentId || null)
      .query('INSERT INTO document_recipients (id, document_id, user_id, department_id) VALUES (@id, @documentId, @userId, @departmentId)');

    const result = await pool.request()
      .input('id', sql.NVarChar, drId)
      .query('SELECT * FROM document_recipients WHERE id = @id');
    return mapDocumentRecipient(result.recordset[0]);
  }

  async getDocumentRecipients(documentId: string): Promise<DocumentRecipient[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('documentId', sql.NVarChar, documentId)
      .query('SELECT * FROM document_recipients WHERE document_id = @documentId');
    return result.recordset.map(mapDocumentRecipient);
  }

  async getUserAccessibleDocuments(userId: string): Promise<Document[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`SELECT DISTINCT d.* FROM documents d
              INNER JOIN document_recipients dr ON d.id = dr.document_id
              LEFT JOIN users u ON u.id = @userId
              WHERE (dr.user_id = @userId OR dr.department_id = u.department_id)
              AND d.status = 'issued'
              ORDER BY d.created_at DESC`);
    return result.recordset.map(mapDocument);
  }

  async hasUserPrintedDocument(userId: string, documentId: string): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .input('documentId', sql.NVarChar, documentId)
      .query('SELECT TOP 1 id FROM print_logs WHERE user_id = @userId AND document_id = @documentId');
    return result.recordset.length > 0;
  }
}

export const storage = new SqlServerStorage();
