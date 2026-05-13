import type { Express } from "express";
import { createServer, type Server } from "http";
import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import path from 'path';
import { storage } from "./storage";
import multer from "multer";
import express, { type Request, Response } from "express";
import { pdfService } from "./services/pdf-service";
import puppeteer from "puppeteer";
// The second path import is redundant but not part of the requested change.
// import path from "path"; 

// In-memory PDF cache: key = docId_revisionNo, value = { pdfPath, expiresAt }
const pdfCache = new Map<string, { pdfPath: string; expiresAt: number }>();
const PDF_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function getCachedOrGeneratePdf(
  cacheKey: string,
  fullWordPath: string,
  enrichedDocument: any,
  controlCopyInfo?: any
): Promise<string> {
  const cached = pdfCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    // Verify file still exists
    try {
      await fsPromises.access(cached.pdfPath);
      console.log(`[PDF Cache] HIT for key: ${cacheKey}`);
      return cached.pdfPath;
    } catch {
      pdfCache.delete(cacheKey);
    }
  }
  console.log(`[PDF Cache] MISS for key: ${cacheKey} - generating PDF...`);
  const pdfPath = await pdfService.convertWordToPDF(fullWordPath, enrichedDocument, controlCopyInfo);
  pdfCache.set(cacheKey, { pdfPath, expiresAt: Date.now() + PDF_CACHE_TTL_MS });
  return pdfPath;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const debugLog = (msg: string) => {
    const logPath = 'c:\\inetpub\\wwwroot\\dms\\debug.log';
    const timestamp = new Date().toISOString();
    try {
      fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
    } catch (e) {
      console.error("Failed to write to debug log", e);
    }
  };
  app.get("/api/version", (_req, res) => {
    res.json({ version: "1.0.6", timestamp: new Date().toISOString() });
  });

  debugLog("--- SERVER RESTARTED - ROUTES REGISTERED v1.0.6 ---");

  const upload = multer({ storage: multer.memoryStorage() });

  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);

      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        location: user.location,
        departmentId: user.departmentId || null,
        departmentName: user.departmentName || null,
        masterCopyAccess: user.masterCopyAccess || false
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        location: user.location,
        departmentId: user.departmentId || null,
        departmentName: user.departmentName || null,
        masterCopyAccess: user.masterCopyAccess || false
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/documents", async (req, res) => {
    try {
      const { status, userId, recipientId } = req.query;
      let documents;

      if (recipientId && status === "issued") {
        // Accurate filtering: Recipients should only see documents shared with or owned by their department
        const user = await storage.getUser(recipientId as string);
        if (user?.departmentId) {
          documents = await storage.getDocumentsByDepartment(user.departmentId, "issued", true);
        } else {
          documents = await storage.getDocumentsByStatus("issued", true);
        }
      } else if (status) {
        documents = await storage.getDocumentsByStatus(status as string, status === "issued");
      } else if (userId) {
        documents = await storage.getDocumentsByUser(userId as string);
      } else {
        return res.status(400).json({ message: "Status, userId, or recipientId query parameter is required" });
      }

      const documentsWithDetails = await Promise.all(
        documents.map(async (doc) => {
          const preparer = await storage.getUser(doc.preparedBy);
          const approver = doc.approvedBy ? await storage.getUser(doc.approvedBy) : null;
          const issuer = doc.issuedBy ? await storage.getUser(doc.issuedBy) : null;
          let depts = await storage.getDocumentDepartments(doc.id);

          // Fallback: if no departments are assigned in document_departments table,
          // use the document creator's department so the column is never blank
          if (depts.length === 0 && preparer?.departmentId && preparer?.departmentName) {
            depts = [{
              id: preparer.departmentId,
              name: preparer.departmentName,
              code: preparer.departmentCode || '',
              category: null,
              categoryName: null,
              createdAt: new Date()
            }];
          }

          return {
            ...doc,
            creatorDepartmentId: (doc.creatorData && doc.creatorData.departmentId) ? doc.creatorData.departmentId : (preparer?.departmentId || null),
            preparerName: preparer?.fullName || "Unknown",
            approverName: approver?.fullName || null,
            issuerName: issuer?.fullName || null,
            departments: depts
          };
        })
      );

      res.json(documentsWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.json({ settingValue: 'false' }); // default
      }
      res.json(setting);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      const { value } = req.body;
      const setting = await storage.updateSetting(req.params.key, value);
      res.json(setting);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/documents/due-for-review", async (req, res) => {
    try {
      const { daysAhead = '30' } = req.query;
      const daysAheadInt = parseInt(daysAhead as string, 10);

      if (isNaN(daysAheadInt) || daysAheadInt < 0) {
        return res.status(400).json({ message: "Invalid daysAhead parameter" });
      }

      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAheadInt);

      const issuedDocs = await storage.getDocumentsByStatus("issued", true);

      const dueForReview = issuedDocs.filter(doc => {
        if (!doc.reviewDueDate) return false;
        const dueDate = new Date(doc.reviewDueDate);
        return dueDate <= futureDate;
      });

      const documentsWithDetails = await Promise.all(
        dueForReview.map(async (doc) => {
          const preparer = await storage.getUser(doc.preparedBy);
          const depts = await storage.getDocumentDepartments(doc.id);
          const daysUntilDue = Math.ceil((new Date(doc.reviewDueDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          return {
            ...doc,
            creatorDepartmentId: (doc.creatorData && doc.creatorData.departmentId) ? doc.creatorData.departmentId : (preparer?.departmentId || null),
            preparerName: preparer?.fullName || "Unknown",
            departments: depts,
            daysUntilDue,
            dateOfRev: doc.dateOfRev,
            dateOfIssue: doc.dateOfIssue
          };
        })
      );

      documentsWithDetails.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

      res.json(documentsWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/documents/department/:id", async (req, res) => {
    try {
      const { status } = req.query;
      const documents = await storage.getDocumentsByDepartment(req.params.id, status as string, status === "issued");

      const documentsWithDetails = await Promise.all(
        documents.map(async (doc) => {
          const preparer = await storage.getUser(doc.preparedBy);
          let depts = await storage.getDocumentDepartments(doc.id);
          // Fallback to creator's department if none assigned
          if (depts.length === 0 && preparer?.departmentId && preparer?.departmentName) {
            depts = [{ id: preparer.departmentId, name: preparer.departmentName, code: preparer.departmentCode || '', category: null, categoryName: null, createdAt: new Date() }];
          }
          return {
            ...doc,
            creatorDepartmentId: (doc.creatorData && doc.creatorData.departmentId) ? doc.creatorData.departmentId : (preparer?.departmentId || null),
            preparerName: preparer?.fullName || "Unknown",
            departments: depts
          };
        })
      );

      res.json(documentsWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/next-revision-series", async (req, res) => {
    try {
      const { docNumber } = req.query;
      const nextRevisionNo = await storage.getGlobalNextRevisionNo(docNumber as string);
      res.json({ nextRevisionNo });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/documents/next-revision/:docNumber?", async (req, res) => {
    try {
      // Handle double-encoded document numbers (to support forward slashes)
      const docNumber = req.params.docNumber ? decodeURIComponent(decodeURIComponent(req.params.docNumber)) : undefined;
      const nextRevisionNo = await storage.getGlobalNextRevisionNo(docNumber);
      res.json({ nextRevisionNo });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST endpoint for getting next revision number
  app.post("/api/revision-number", async (req, res) => {
    try {
      const { docNumber } = req.body;
      const nextRevisionNo = await storage.getGlobalNextRevisionNo(docNumber);
      res.json({ nextRevisionNo });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const preparer = await storage.getUser(document.preparedBy);
      const approver = document.approvedBy ? await storage.getUser(document.approvedBy) : null;
      const issuer = document.issuedBy ? await storage.getUser(document.issuedBy) : null;
      let depts = await storage.getDocumentDepartments(document.id);
      // Fallback to creator's department if none assigned
      if (depts.length === 0 && preparer?.departmentId && preparer?.departmentName) {
        depts = [{ id: preparer.departmentId, name: preparer.departmentName, code: preparer.departmentCode || '', category: null, categoryName: null, createdAt: new Date() }];
      }
      const previousVersion = document.previousVersionId
        ? await storage.getDocument(document.previousVersionId)
        : null;

      res.json({
        ...document,
        creatorDepartmentId: (document.creatorData && document.creatorData.departmentId) ? document.creatorData.departmentId : (preparer?.departmentId || null),
        preparerName: preparer?.fullName || "Unknown",
        approverName: approver?.fullName || null,
        issuerName: issuer?.fullName || null,
        departments: depts,
        previousVersion
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/documents", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Word document file is required" });
      }

      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Only Word documents (.doc, .docx) are allowed" });
      }

      const maxSize = 10 * 1024 * 1024;
      if (req.file.size > maxSize) {
        return res.status(400).json({ message: "File size must be less than 10MB" });
      }

      const extracted = await pdfService.extractHeaderFooterFromWord(req.file.buffer);

      const duePeriodYears = req.body.duePeriodYears ? parseInt(req.body.duePeriodYears, 10) : 3;
      // Use provided dateOfIssue or default to current date
      const dateOfIssue = req.body.dateOfIssue ? new Date(req.body.dateOfIssue) : new Date();
      // Handle dateOfRevision from frontend (new field name)
      const dateOfRev = (req.body.dateOfRevision && req.body.dateOfRevision !== "")
        ? new Date(req.body.dateOfRevision)
        : (req.body.dateOfRev ? new Date(req.body.dateOfRev) : null);

      // Review reminder calculation will be done after nextRevisionNo is determined
      let reviewBaseDate: Date;
      let reviewDueDate: Date;
      const originalDateOfIssue = req.body.originalDateOfIssue ? new Date(req.body.originalDateOfIssue) : dateOfIssue;

      // Get creator data for JSON storage
      const creator = await storage.getUser(req.body.preparedBy);
      const creatorData = creator ? {
        id: creator.id,
        username: creator.username,
        fullName: creator.fullName,
        role: creator.role,
        departmentId: creator.departmentId || null,
        departmentName: creator.departmentName || null
      } : null;

      // Guard: Prevent creating a NEW revision if one is already in progress (Pending, Approved, Declined)
      // This helps avoid jumps from v0 directly to v2 if a v1 already exists but was declined.
      if (req.body.previousVersionId && req.body.docNumber) {
        const existingVersions = await storage.getDocumentsByDocNumber(req.body.docNumber, req.body.location);
        const inProgress = existingVersions.find(v =>
          ['pending', 'approved', 'declined'].includes((v.status || "").toLowerCase().trim())
        );

        if (inProgress) {
          return res.status(400).json({
            message: `A revision for this document (Revision ${inProgress.revisionNo}) is already in state "${inProgress.status}". Please edit or resubmit that version instead of starting a new one.`
          });
        }
      }

      // Auto-calculate revision number per document (unless migration mode or manual entry is enabled)
      const manualRevSetting = await storage.getSetting("enable_manual_revision");
      const isManualRevEnabled = manualRevSetting?.settingValue === 'true';

      let nextRevisionNo;
      const rawRevNo = req.body.revisionNo !== undefined ? req.body.revisionNo : req.body.revisionNumber;
      const parsedRevNo = parseInt(rawRevNo, 10);

      if (req.body.migrationMode && !isNaN(parsedRevNo)) {
        // Migration mode: use provided revision number
        nextRevisionNo = parsedRevNo;
      } else if (isManualRevEnabled && !isNaN(parsedRevNo)) {
        // Manual revision enabled: use provided value if it's a valid number
        nextRevisionNo = parsedRevNo;
      } else {
        // Normal mode: auto-calculate next revision number
        nextRevisionNo = await storage.getGlobalNextRevisionNo(req.body.docNumber, req.body.location);
      }

      // Review reminder calculation: prioritize dateOfRev if available, otherwise use dateOfIssue
      reviewBaseDate = dateOfRev ? dateOfRev : dateOfIssue;
      reviewDueDate = new Date(reviewBaseDate);
      reviewDueDate.setFullYear(reviewDueDate.getFullYear() + duePeriodYears);
      // Subtract 1 day to make it 3 years - 1 day
      reviewDueDate.setDate(reviewDueDate.getDate() - 1);

      // Issue No is no longer required
      const issueNo = null;

      // Handle revision creation
      let inheritedData: any = {};
      if (req.body.previousVersionId) {
        const previousDoc = await storage.getDocument(req.body.previousVersionId);
        if (previousDoc) {
          inheritedData = {
            duePeriodYears: req.body.duePeriodYears || previousDoc.duePeriodYears,
            location: req.body.location || previousDoc.location,
            originalDateOfIssue: previousDoc.originalDateOfIssue || previousDoc.dateOfIssue,
            // Use provided dateOfRev or default to current date
            dateOfRev: dateOfRev || new Date(),
            reasonForRevision: req.body.reasonForRevision || `Revision of ${previousDoc.docName} (v${previousDoc.revisionNo})`
          };
        }
      }

      const documentData = {
        ...req.body,
        ...inheritedData,
        revisionNo: nextRevisionNo,
        duePeriodYears: inheritedData.duePeriodYears || duePeriodYears,
        reasonForRevision: inheritedData.reasonForRevision || req.body.reasonForRevision || undefined,
        issueNo,
        dateOfIssue,
        reviewDueDate,
        dateOfRev: dateOfRev || inheritedData.dateOfRev || null,
        originalDateOfIssue: inheritedData.originalDateOfIssue || originalDateOfIssue,
        headerInfo: (req.body.headerInfo && req.body.headerInfo !== 'undefined') ? req.body.headerInfo : (extracted.headerInfo || ""),
        footerInfo: (req.body.footerInfo && req.body.footerInfo !== 'undefined') ? req.body.footerInfo : (extracted.footerInfo || ""),
        preparerName: req.body.preparerName || creator?.fullName || "",
        location: inheritedData.location || req.body.location || creator?.location || null,
        previousVersionId: req.body.previousVersionId || null, // Store the link to previous version
        creatorData
      };

      const document = await storage.createDocument(documentData);

      // Handle department assignment - inherit from previous version if this is a revision
      let departmentsToAssign: string[] = [];

      if (req.body.previousVersionId) {
        // For revisions, inherit departments from previous version
        const previousDepts = await storage.getDocumentDepartments(req.body.previousVersionId);
        departmentsToAssign = previousDepts.map(d => d.id);
      }

      // Override with explicitly provided departments or fallback to creator's department
      const explicitDeptId = req.body.departmentId || creator?.departmentId;
      if (explicitDeptId && explicitDeptId !== 'undefined') {
        departmentsToAssign = [explicitDeptId];
      }

      // Assign departments
      if (departmentsToAssign.length > 0) {
        await storage.assignDocumentToDepartments(document.id, departmentsToAssign);
      }

      const filePath = await pdfService.saveUploadedFile(
        req.file.buffer,
        req.file.originalname,
        document.id
      );

      await storage.updateDocument(document.id, { wordFilePath: filePath });

      const approvers = await storage.getUsersByRole("approver");
      for (const approver of approvers) {
        await storage.createNotification({
          userId: approver.id,
          documentId: document.id,
          message: `New document "${document.docName}" (${document.docNumber}) is ready for your approval`,
          type: "new_document"
        });
      }

      res.status(201).json({ ...document, wordFilePath: filePath });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/documents/:id", upload.single('file'), async (req, res) => {
    // Forward patching to PUT handler logic
    return handleDocumentUpdate(req, res);
  });

  app.put("/api/documents/:id", upload.single('file'), async (req, res) => {
    return handleDocumentUpdate(req, res);
  });

  const handleDocumentUpdate = async (req: any, res: any) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const currentStatus = (document.status || "").trim().toLowerCase();
      console.log(`[Update] Document ID: ${req.params.id}. Current Status: ${document.status} (normalized: ${currentStatus})`);
      console.log("[Update] Received fields for update:", Object.keys(req.body));

      if (currentStatus === "approved" || currentStatus === "issued") {
        return res.status(400).json({ message: "Approved or issued documents cannot be edited. Use 'Revise' to create a new version." });
      }

      let {
        docName, docNumber, dateOfIssue, revisionNumber, revisionNo,
        duePeriodYears, reasonForRevision, location,
        preparerName, dateOfRev, reviewDueDate, departments
      } = req.body;

      // Handle department JSON if coming from FormData
      if (departments && typeof departments === 'string') {
        try {
          departments = JSON.parse(departments);
        } catch (e) {
          console.warn("Could not parse departments JSON, using as-is");
        }
      }

      const updateData: any = {
        updatedAt: new Date()
      };

      debugLog(`[Update] Status check: current=${currentStatus}, original=${document.status}`);
      // If document was declined, reset to pending upon edit and clear old remarks
      if (currentStatus === "declined") {
        debugLog(`[Update] Resubmitting declined document ${req.params.id}. Resetting to pending.`);
        updateData.status = "pending";
        updateData.declineRemarks = null;
        updateData.approvalRemarks = null;
        updateData.approvedBy = null;
        updateData.issuedBy = null;
        updateData.approvedAt = null;
        updateData.issuedAt = null;
      }

      if (docName !== undefined) updateData.docName = docName;
      if (docNumber !== undefined) updateData.docNumber = docNumber;
      if (dateOfIssue !== undefined && dateOfIssue !== "") {
        const d = new Date(dateOfIssue);
        if (!isNaN(d.getTime())) {
          updateData.dateOfIssue = d;
        }
      }

      // Handle both revisionNumber and revisionNo
      const rev = revisionNo !== undefined ? revisionNo : revisionNumber;
      if (rev !== undefined) {
        const parsedRev = parseInt(rev as string, 10);
        if (!isNaN(parsedRev)) {
          updateData.revisionNo = parsedRev;
        }
      }

      if (duePeriodYears !== undefined) {
        const parsedYears = parseInt(duePeriodYears as string, 10);
        if (!isNaN(parsedYears)) {
          updateData.duePeriodYears = parsedYears;
        }
      }
      if (reasonForRevision !== undefined) updateData.reasonForRevision = reasonForRevision;
      if (location !== undefined) updateData.location = location;
      if (preparerName !== undefined) updateData.preparerName = preparerName;
      if (dateOfRev !== undefined && dateOfRev !== "") {
        const d = new Date(dateOfRev);
        if (!isNaN(d.getTime())) {
          updateData.dateOfRev = d;
        } else {
          updateData.dateOfRev = null;
        }
      } else if (dateOfRev === "") {
        updateData.dateOfRev = null;
      }

      if (reviewDueDate !== undefined && reviewDueDate !== "") {
        const d = new Date(reviewDueDate);
        if (!isNaN(d.getTime())) {
          updateData.reviewDueDate = d;
        } else {
          updateData.reviewDueDate = null;
        }
      } else if (reviewDueDate === "") {
        updateData.reviewDueDate = null;
      }

      // File handling
      if (req.file) {
        const filePath = await pdfService.saveUploadedFile(
          req.file.buffer,
          req.file.originalname,
          document.id
        );
        updateData.wordFilePath = filePath;
        // DO NOT clear pdfFilePath here, let pdfService regenerate when requested 
        // updateData.pdfFilePath = null; 
      }

      // Recalculate reviewDueDate ONLY if it wasn't explicitly provided
      if (updateData.reviewDueDate === undefined) {
        const newDateOfRev = updateData.dateOfRev !== undefined ? updateData.dateOfRev : document.dateOfRev;
        const newDateOfIssue = updateData.dateOfIssue || document.dateOfIssue;
        const newDuePeriod = updateData.duePeriodYears !== undefined ? updateData.duePeriodYears : document.duePeriodYears;
        const currentRevNo = updateData.revisionNo !== undefined ? updateData.revisionNo : (document.revisionNo || 0);
        const reviewBaseDate = newDateOfRev ? newDateOfRev : newDateOfIssue;

        if (reviewBaseDate && newDuePeriod) {
          const calculatedReviewDueDate = new Date(reviewBaseDate);
          calculatedReviewDueDate.setFullYear(calculatedReviewDueDate.getFullYear() + newDuePeriod);
          // Subtract 1 day to make it 3 years - 1 day
          calculatedReviewDueDate.setDate(calculatedReviewDueDate.getDate() - 1);
          updateData.reviewDueDate = calculatedReviewDueDate;
        }
      }

      debugLog(`[Update] Final updateData keys for ${req.params.id}: ${Object.keys(updateData).join(', ')}`);
      debugLog(`[Update] Final updateData values: ${JSON.stringify(updateData)}`);
      const updatedDoc = await storage.updateDocument(req.params.id, updateData);

      // Handle department assignments
      if (departments && Array.isArray(departments)) {
        await storage.assignDocumentToDepartments(req.params.id, departments);
      }

      // Notify approvers if resubmitted
      if (document.status === "declined") {
        const approvers = await storage.getUsersByRole("approver");
        for (const approver of approvers) {
          await storage.createNotification({
            userId: approver.id,
            documentId: document.id,
            message: `Document "${document.docName}" (${document.docNumber}) has been resubmitted after decline`,
            type: "new_document"
          });
        }
      }

      res.json(updatedDoc);
    } catch (error: any) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: error.message });
    }
  };

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      await storage.deleteDocument(req.params.id);
      res.json({ success: true, message: "Document deleted successfully" });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        res.status(404).json({ message: error.message });
      } else if (error.message.includes("Cannot delete")) {
        res.status(403).json({ message: error.message });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.post("/api/documents/:id/approve", async (req, res) => {
    try {
      const { approvalRemarks, approvedBy, approverName, departments, docNumber } = req.body;

      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const approver = await storage.getUser(approvedBy);
      const finalApproverName = approverName || approver?.fullName || "Unknown";

      // Store approver data as JSON
      const approverData = approver ? {
        id: approver.id,
        username: approver.username,
        fullName: approver.fullName,
        role: approver.role,
        departmentId: approver.departmentId || null,
        departmentName: approver.departmentName || null
      } : null;

      const updatedDoc = await storage.updateDocument(req.params.id, {
        status: "approved",
        approvalRemarks,
        approvedBy,
        approverName: approver?.fullName || approverName,
        approvedAt: new Date(),
        approverData,
        // Update docNumber if provided during approval
        ...(docNumber && { docNumber })
      });

      if (departments && departments.length > 0) {
        await storage.assignDocumentToDepartments(req.params.id, departments);
      }

      const issuers = await storage.getUsersByRole("issuer");
      for (const issuer of issuers) {
        await storage.createNotification({
          userId: issuer.id,
          documentId: req.params.id,
          message: `Document "${document.docName}" (${document.docNumber}) has been approved by ${finalApproverName}. Remarks: "${approvalRemarks}"`,
          type: "approved_document"
        });
      }

      await storage.createNotification({
        userId: document.preparedBy,
        documentId: req.params.id,
        message: `Your document "${document.docName}" (${document.docNumber}) has been approved by ${finalApproverName}`,
        type: "document_status_update"
      });

      res.json(updatedDoc);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/documents/:id/decline", async (req, res) => {
    try {
      const { declineRemarks, declinedBy, declinerName } = req.body;

      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const updatedDoc = await storage.updateDocument(req.params.id, {
        status: "declined",
        declineRemarks,
        declinedBy: declinedBy || null,
        declinerName: declinerName || null,
        declinedAt: new Date(),
        approvedBy: null,
        issuedBy: null
      });

      await storage.createNotification({
        userId: document.preparedBy,
        documentId: req.params.id,
        message: `Your document "${document.docName}" (${document.docNumber}) has been declined by issuer. Remarks: ${declineRemarks}. Please review and resubmit.`,
        type: "document_declined"
      });

      res.json(updatedDoc);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/documents/:id/issue", async (req, res) => {
    try {
      const { issuedBy, issuerName, remarks, departments: targetDepartments, docNumber } = req.body;

      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Update departments if provided
      if (targetDepartments && Array.isArray(targetDepartments)) {
        await storage.assignDocumentToDepartments(req.params.id, targetDepartments);
      }

      // Get issuer data for JSON storage
      const issuer = await storage.getUser(issuedBy);
      const issuerData = issuer ? {
        id: issuer.id,
        username: issuer.username,
        fullName: issuer.fullName,
        role: issuer.role,
        departmentId: issuer.departmentId || null,
        departmentName: issuer.departmentName || null
      } : null;

      const updatedDoc = await storage.updateDocument(req.params.id, {
        status: "issued",
        issuedBy,
        issuerName,
        issueRemarks: remarks,
        issuedAt: new Date(),
        issuerData,
        docNumber: docNumber || undefined
      });

      // After issuing, ensure any previous versions that were still 'issued' are marked as 'obsolete'
      const currentDocNumber = docNumber || document.docNumber;
      if (currentDocNumber) {
        try {
          const allVersions = await storage.getDocumentsByDocNumber(currentDocNumber, document.location || undefined);
          for (const version of allVersions) {
            const statusStr = (version.status || "").toLowerCase().trim();
            // IMPORTANT: Only mark as obsolete if it's the SAME document chain (same location)
            if (version.id !== req.params.id && statusStr === 'issued') {
              console.log(`[Obsolete] Marking version ${version.revisionNo} (ID: ${version.id}) of ${currentDocNumber} at ${document.location || 'unassigned'} as obsolete`);
              await storage.updateDocument(version.id, { status: 'obsolete' });
            }
          }
        } catch (supErr) {
          console.error("[Obsolete] Error marking previous versions as obsolete:", supErr);
        }
      }

      await storage.createNotification({
        userId: document.preparedBy,
        documentId: req.params.id,
        message: `Your document "${document.docName}" (${document.docNumber}) has been issued by ${issuerName}`,
        type: "document_issued"
      });

      if (document.approvedBy) {
        await storage.createNotification({
          userId: document.approvedBy,
          documentId: req.params.id,
          message: `Document "${document.docName}" (${document.docNumber}) has been issued`,
          type: "document_issued"
        });
      }

      const departments = await storage.getDocumentDepartments(req.params.id);
      for (const dept of departments) {
        await storage.createDocumentRecipient({
          documentId: req.params.id,
          departmentId: dept.id
        });
      }

      res.json(updatedDoc);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.params.userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ message: "Notification marked as read" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/departments/categorized", async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      // Group departments by category
      const categoryMap: Record<string, { id: string; name: string; departments: { id: string; name: string }[] }> = {};

      for (const dept of departments) {
        const catId = dept.category || "uncategorized";
        const catName = dept.categoryName || "Uncategorized";

        if (!categoryMap[catId]) {
          categoryMap[catId] = { id: catId, name: catName, departments: [] };
        }
        categoryMap[catId].departments.push({ id: dept.id, name: dept.name });
      }

      const categories = Object.values(categoryMap);
      res.json({ categories });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/departments", async (req, res) => {
    try {
      const department = await storage.createDepartment(req.body);
      res.status(201).json(department);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const { role } = req.query;
      if (role) {
        const users = await storage.getUsersByRole(role as string);
        res.json(users);
      } else {
        res.status(400).json({ message: "Role query parameter is required" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const updatedUser = await storage.updateUser(req.params.id, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/departments/:id", async (req, res) => {
    try {
      await storage.deleteDepartment(req.params.id);
      res.json({ success: true, message: "Department deleted successfully" });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const creators = await storage.getUsersByRole("creator");
      const approvers = await storage.getUsersByRole("approver");
      const issuers = await storage.getUsersByRole("issuer");
      const admins = await storage.getUsersByRole("admin");
      const recipients = await storage.getUsersByRole("recipient");

      const mapUser = (u: any) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        departmentId: u.departmentId,
        departmentName: u.departmentName,
        location: u.location,
        masterCopyAccess: u.masterCopyAccess
      });

      res.json({
        creators: creators.map(mapUser),
        approvers: approvers.map(mapUser),
        issuers: issuers.map(mapUser),
        admins: admins.map(mapUser),
        recipients: recipients.map(mapUser),
        total: creators.length + approvers.length + issuers.length + admins.length + recipients.length
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/documents", async (req, res) => {
    try {
      const pending = await storage.getDocumentsByStatus("pending");
      const approved = await storage.getDocumentsByStatus("approved");
      // For the main documents list, only show the latest issued version
      const issued = await storage.getDocumentsByStatus("issued", true);
      const declined = await storage.getDocumentsByStatus("declined");
      const obsolete = await storage.getDocumentsByStatus("obsolete");

      // For revision counts, we need the FULL history of all documents
      // but we can't easily get it from the status-filtered lists if we want accuracy.
      // However, we can group doc numbers from what we HAVE, or fetch all.
      // Let's assume for counts we want to see the total including obsolete.
      // We'll calculate counts later after we have a way to fetch all doc numbers.
      const allDocs = [...pending, ...approved, ...issued, ...declined, ...obsolete];

      // Calculate revision counts for all document numbers
      const revisionCounts: Record<string, number> = {};
      allDocs.forEach(doc => {
        if (doc.docNumber) {
          const key = `${doc.docNumber.trim().toLowerCase()}_${(doc.location || '').trim().toLowerCase()}`;
          revisionCounts[key] = (revisionCounts[key] || 0) + 1;
        }
      });

      const documentsWithDetails = await Promise.all(
        allDocs.map(async (doc) => {
          const preparer = await storage.getUser(doc.preparedBy);
          const approver = doc.approvedBy ? await storage.getUser(doc.approvedBy) : null;
          const issuer = doc.issuedBy ? await storage.getUser(doc.issuedBy) : null;

          const key = doc.docNumber ? `${doc.docNumber.trim().toLowerCase()}_${(doc.location || '').trim().toLowerCase()}` : '';
          const revCount = revisionCounts[key] || 0;

          let depts = await storage.getDocumentDepartments(doc.id);
          // Fallback to creator's department if none assigned
          if (depts.length === 0 && preparer?.departmentId && preparer?.departmentName) {
            depts = [{ id: preparer.departmentId, name: preparer.departmentName, code: preparer.departmentCode || '', category: null, categoryName: null, createdAt: new Date() }];
          }

          return {
            ...doc,
            revisionCount: revCount,
            creatorDepartmentId: (doc.creatorData && doc.creatorData.departmentId) ? doc.creatorData.departmentId : (preparer?.departmentId || null),
            preparerName: preparer?.fullName || "Unknown",
            approverName: approver?.fullName || null,
            issuerName: issuer?.fullName || null,
            departments: depts
          };
        })
      );

      res.json({
        documents: documentsWithDetails,
        stats: {
          total: allDocs.length,
          pending: pending.length,
          approved: approved.length,
          issued: issued.length,
          declined: declined.length,
          obsolete: obsolete.length
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const pending = await storage.getDocumentsByStatus("pending");
      const approved = await storage.getDocumentsByStatus("approved");
      const issued = await storage.getDocumentsByStatus("issued");
      const declined = await storage.getDocumentsByStatus("declined");
      const obsolete = await storage.getDocumentsByStatus("obsolete");
      const departments = await storage.getDepartments();

      const creators = await storage.getUsersByRole("creator");
      const approvers = await storage.getUsersByRole("approver");
      const issuers = await storage.getUsersByRole("issuer");

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const allDocs = [...pending, ...approved, ...issued, ...declined, ...obsolete];
      const recentDocs = allDocs.filter(doc =>
        doc.createdAt && new Date(doc.createdAt) >= thirtyDaysAgo
      );

      const weeklyActivity = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayDocs = allDocs.filter(doc => {
          if (!doc.createdAt) return false;
          const docDate = new Date(doc.createdAt);
          return docDate.toDateString() === date.toDateString();
        });
        weeklyActivity.push({
          day: days[date.getDay()],
          documents: dayDocs.length
        });
      }

      res.json({
        documents: {
          total: allDocs.length,
          pending: pending.length,
          approved: approved.length,
          issued: issued.length,
          declined: declined.length,
          obsolete: allDocs.filter(d => (d.status || "").toLowerCase() === "obsolete").length,
          recentCount: recentDocs.length
        },
        users: {
          creators: creators.length,
          approvers: approvers.length,
          issuers: issuers.length,
          total: creators.length + approvers.length + issuers.length
        },
        departments: {
          total: departments.length,
          list: departments
        },
        weeklyActivity,
        recentDocuments: allDocs.slice(0, 10).map(doc => ({
          id: doc.id,
          docName: doc.docName,
          docNumber: doc.docNumber,
          status: doc.status,
          createdAt: doc.createdAt
        }))
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/documents/:id/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const filePath = await pdfService.saveUploadedFile(
        req.file.buffer,
        req.file.originalname,
        req.params.id
      );

      const updatedDoc = await storage.updateDocument(req.params.id, {
        wordFilePath: filePath
      });

      res.json({ message: "File uploaded successfully", document: updatedDoc });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (!document.wordFilePath) {
        return res.status(404).json({ message: "No Word file available for this document" });
      }

      if (document.status === "issued") {
        return res.status(403).json({
          message: "Issued documents (controlled copies) cannot be downloaded in Word format. Please use the Print Controlled Copy option in the PDF viewer."
        });
      }

      const fullPath = path.join(pdfService.uploadsDir, path.basename(document.wordFilePath!));

      try {
        await fsPromises.access(fullPath);
        const fileName = path.basename(fullPath);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        const fileBuffer = await fsPromises.readFile(fullPath);
        res.send(fileBuffer);
      } catch (err) {
        console.error('Download error:', err);
        return res.status(404).json({ message: "Word file not found on server" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/documents/:id/view-word", async (req, res) => {
    try {
      debugLog(`[Word View] Requesting document ${req.params.id}`);
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        debugLog(`[Word View] Document ${req.params.id} not found`);
        return res.status(404).json({ message: "Document not found" });
      }

      if (!document.wordFilePath) {
        debugLog(`[Word View] No Word file path for document ${req.params.id}`);
        return res.status(404).json({ message: "No Word file available for this document" });
      }

      // Try multiple path resolution strategies
      let fullPath: string;
      let wordBuffer: Buffer;

      // Strategy 1: Use the full path as stored
      if (path.isAbsolute(document.wordFilePath)) {
        fullPath = document.wordFilePath;
      } else {
        // Strategy 2: Join with uploads directory
        fullPath = path.join(pdfService.uploadsDir, document.wordFilePath);
      }

      debugLog(`[Word View] Primary path attempt: ${fullPath}`);

      try {
        await fsPromises.access(fullPath);
        wordBuffer = await fsPromises.readFile(fullPath);
        debugLog(`[Word View] Successfully read file from primary path, size: ${wordBuffer.length} bytes`);
      } catch (err: any) {
        debugLog(`[Word View] Primary path failed: ${err.message}`);

        // Strategy 3: Try just the basename in uploads directory
        const fallbackPath = path.join(pdfService.uploadsDir, path.basename(document.wordFilePath));
        debugLog(`[Word View] Trying fallback path: ${fallbackPath}`);

        try {
          await fsPromises.access(fallbackPath);
          wordBuffer = await fsPromises.readFile(fallbackPath);
          fullPath = fallbackPath;
          debugLog(`[Word View] Successfully read file from fallback path, size: ${wordBuffer.length} bytes`);
        } catch (fallbackErr: any) {
          debugLog(`[Word View] Fallback path also failed: ${fallbackErr.message}`);
          try {
            const availableFiles = await fsPromises.readdir(pdfService.uploadsDir);
            debugLog(`[Word View] Available files in uploads dir: ${availableFiles.join(', ')}`);
          } catch {
            debugLog(`[Word View] Unable to read uploads directory`);
          }
          return res.status(404).json({ message: `Word file not found on server. Tried: ${fullPath}, ${fallbackPath}` });
        }
      }

      // Explicit check for legacy .doc format
      // Magic number for .doc files (OLE Compound File Binary Format)
      const magicNumber = wordBuffer!.toString('hex', 0, 8);
      if (magicNumber.startsWith('d0cf11e0a1b11ae1')) {
        debugLog(`[Word View] Legacy .doc file detected for document ${req.params.id}. Magic number: ${magicNumber}`);
        return res.status(400).json({ message: "This is a legacy Word (.doc) file. The system only supports modern .docx files for viewing. Please convert this file to .docx and re-upload." });
      }

      debugLog(`[Word View] Processing .docx file for document ${req.params.id}.`);

      // Convert Word to HTML using mammoth
      const mammoth = await import("mammoth");
      const result = await mammoth.convertToHtml({
        buffer: wordBuffer
      }, {
        styleMap: [
          "p[style-name='Header'] => h1:fresh",
          "p[style-name='Heading 1'] => h2:fresh",
          "p[style-name='Heading 2'] => h3:fresh",
          "p[style-name='Heading 3'] => h4:fresh",
          "p[style-name='List Paragraph'] => p.list-paragraph:fresh",
          "p[style-name='Normal'] => p:fresh",
          "r[style-name='Strong'] => strong:fresh",
          "r[style-name='Emphasis'] => em:fresh",
          "table => table.document-table:fresh",
          "b => strong",
          "i => em",
          "u => span.underline"
        ],
        includeDefaultStyleMap: true,
        convertImage: mammoth.images.imgElement(function (image: any) {
          return image.read("base64").then(function (imageBuffer: string) {
            return { src: "data:" + image.contentType + ";base64," + imageBuffer };
          });
        })
      });

      debugLog(`[Word View] Mammoth conversion complete, HTML length: ${result.value.length} `);

      res.json({
        html: result.value,
        messages: result.messages,
        docName: document.docName,
        docNumber: document.docNumber,
        revisionNo: document.revisionNo
      });

    } catch (error: any) {
      debugLog(`[Word View] Server error: ${error.message} `);
      res.status(500).json({ message: error.message });
    }
  });

  // Health check endpoint for PDF service
  app.get("/api/health/pdf", async (req, res) => {
    try {
      console.log('PDF health check requested');

      // Test Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent('<html><body><h1>Test PDF</h1></body></html>');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true
      });

      await browser.close();

      res.json({
        status: 'healthy',
        pdfService: 'operational',
        puppeteer: 'working',
        testPdfSize: pdfBuffer.length
      });
    } catch (error: any) {
      console.error('PDF health check failed:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        pdfService: 'failed'
      });
    }
  });

  // PDF preview endpoint for issuers to preview approved documents before issuing
  app.get("/api/documents/:id/preview-pdf", async (req, res) => {
    try {
      console.log('PDF preview request for document:', req.params.id);

      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "userId query parameter is required" });
      }

      const user = await storage.getUser(userId as string);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only allow issuers and admins to preview approved documents
      if (user.role !== "issuer" && user.role !== "admin") {
        return res.status(403).json({ message: "Only issuers and admins can preview approved documents" });
      }

      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Allow preview of approved documents for issuers
      if (document.status !== "approved" && document.status !== "issued") {
        return res.status(403).json({ message: "Only approved or issued documents can be previewed" });
      }

      if (!document.wordFilePath) {
        return res.status(404).json({ message: "No Word file uploaded for this document" });
      }

      const fullWordPath = path.join(pdfService.uploadsDir, path.basename(document.wordFilePath));

      try {
        await fsPromises.access(fullWordPath);
      } catch (fileError) {
        console.error('Word file not found:', fullWordPath, fileError);
        return res.status(404).json({ message: "Word file not found on server" });
      }

      let pdfPath;
      try {
        const preparer = await storage.getUser(document.preparedBy);
        const approver = document.approvedBy ? await storage.getUser(document.approvedBy) : null;
        const issuer = document.issuedBy ? await storage.getUser(document.issuedBy) : null;
        const depts = await storage.getDocumentDepartments(document.id);
        const departmentNames = depts.map(d => d.name);

        const enrichedDocument = {
          ...document,
          departments: depts,
          departmentNames,
          creatorDepartmentName: preparer?.departmentName || "MR",
          preparerName: preparer?.fullName || "Unknown",
          approverName: approver?.fullName || "Pending",
          issuerName: issuer?.fullName || "Pending",
          location: document.location || preparer?.location || ""
        };

        // Use cache for preview PDFs
        const previewCacheKey = `preview_${document.id}_rev${document.revisionNo}`;
        pdfPath = await getCachedOrGeneratePdf(previewCacheKey, fullWordPath, enrichedDocument as any);

      } catch (err: any) {
        console.error("PDF conversion error:", err);
        return res.status(500).json({ message: "Failed to convert Word to PDF. Please check the document file and try again." });
      }

      try {
        const pdfBuffer = await fsPromises.readFile(pdfPath);

        if (pdfBuffer.length === 0) {
          throw new Error('PDF file is empty');
        }

        const { download } = req.query;
        res.setHeader('Content-Type', 'application/pdf');

        if (download === 'true') {
          const fileName = `${document.docNumber}_${document.docName}_PREVIEW.pdf`.replace(/[/\\?%*:|"<>]/g, '-');
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        } else {
          res.setHeader('Content-Disposition', 'inline; filename="document-preview.pdf"');
        }

        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Content-Length', pdfBuffer.length.toString());
        res.send(pdfBuffer);

      } catch (err: any) {
        console.error("PDF file read error:", err);
        return res.status(500).json({ message: "PDF file not found or unreadable after conversion." });
      }
    } catch (error: any) {
      console.error("PDF preview endpoint error:", error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  });

  app.get("/api/documents/:id/pdf", async (req, res) => {
    try {
      console.log('PDF request for document:', req.params.id);

      const { userId, version } = req.query;
      if (!userId) {
        console.log('Missing userId parameter');
        return res.status(400).json({ message: "userId query parameter is required" });
      }

      const user = await storage.getUser(userId as string);
      if (!user) {
        console.log('User not found:', userId);
        return res.status(404).json({ message: "User not found" });
      }

      let document = await storage.getDocument(req.params.id);
      if (!document) {
        console.log('Document not found:', req.params.id);
        return res.status(404).json({ message: "Document not found" });
      }

      console.log('Found document:', document.docName, 'Status:', document.status);

      const originalDocNumber = document.docNumber;
      const allIssuedDocs = await storage.getDocumentsByStatus("issued");
      const allVersions = allIssuedDocs.filter(d => d.docNumber === originalDocNumber);

      if (allVersions.length === 0) {
        console.log('No issued versions found for document:', originalDocNumber);
        return res.status(404).json({ message: "No issued versions found for this document" });
      }

      const latestVersion = allVersions.reduce((latest, current) => {
        return current.revisionNo > latest.revisionNo ? current : latest;
      }, allVersions[0]);

      if (version !== undefined) {
        const requestedVersion = parseInt(version as string, 10);
        if (isNaN(requestedVersion)) {
          return res.status(400).json({ message: "Invalid version parameter" });
        }
        const userRole = user.role?.toLowerCase() || "";
        if (!user.masterCopyAccess && !["approver", "creator", "issuer", "admin"].includes(userRole)) {
          return res.status(403).json({ message: "Access denied. Only master copy users can access specific versions." });
        }
        const requestedDoc = allVersions.find(d => d.revisionNo === requestedVersion);
        if (!requestedDoc) {
          return res.status(404).json({ message: `Version ${requestedVersion} not found` });
        }
        document = await storage.getDocument(requestedDoc.id) || requestedDoc;
      } else if (!user.masterCopyAccess && !["approver", "creator", "issuer", "admin"].includes(user.role?.toLowerCase() || "") && document.id !== latestVersion.id) {
        return res.status(403).json({ message: "Access denied. Only the latest version can be accessed. Please contact administrator for previous versions." });
      }

      // Allow issuers to view approved documents, and everyone to view issued documents
      // For issued documents, all departments should have access per system policy
      if (document.status !== "issued" && !(document.status === "approved" && user.role === "issuer")) {
        console.log('Document access denied, status:', document.status, 'user role:', user.role);
        return res.status(403).json({ message: "Only issued documents (or approved documents for issuers) can be viewed as PDF" });
      }

      // Issued documents are accessible to all users, regardless of department
      console.log('PDF access granted for issued document:', document.docName, 'to user:', user.fullName);

      if (!document.wordFilePath) {
        console.log('No Word file path for document:', document.id);
        return res.status(404).json({ message: "No Word file uploaded for this document" });
      }

      const fullWordPath = path.join(pdfService.uploadsDir, path.basename(document.wordFilePath));

      try {
        await fsPromises.access(fullWordPath);
        console.log('Word file exists:', fullWordPath);
      } catch (fileError) {
        console.error('Word file not found:', fullWordPath, fileError);
        return res.status(404).json({ message: "Word file not found on server" });
      }

      let pdfPath;
      try {
        console.log('Creating control copy...');
        const controlCopy = await storage.createControlCopy({
          documentId: document.id,
          userId: userId as string,
          actionType: "view"
        });

        const controlCopyInfo = {
          userId: user.id,
          userFullName: user.fullName,
          controlCopyNumber: controlCopy.copyNumber,
          date: new Date().toLocaleDateString('en-GB')
        };

        const preparer = await storage.getUser(document.preparedBy);
        const approver = document.approvedBy ? await storage.getUser(document.approvedBy) : null;
        const issuer = document.issuedBy ? await storage.getUser(document.issuedBy) : null;
        const depts = await storage.getDocumentDepartments(document.id);
        const departmentNames = depts.map(d => d.name);

        const enrichedDocument = {
          ...document,
          departments: depts,
          departmentNames,
          creatorDepartmentName: (document as any).creatorData?.departmentName || preparer?.departmentName || "MR",
          preparerName: preparer?.fullName || document.preparerName || "Unknown",
          approverName: approver?.fullName || document.approverName || "Pending",
          issuerName: issuer?.fullName || document.issuerName || "Pending",
          location: document.location || (document as any).creatorData?.location || preparer?.location || ""
        };

        console.log('Converting Word to PDF with enriched data for control copy:', controlCopy.copyNumber);
        const cacheKey = `${document.id}_rev${document.revisionNo}_cc${controlCopy.copyNumber}`;
        pdfPath = await getCachedOrGeneratePdf(cacheKey, fullWordPath, enrichedDocument as any, controlCopyInfo);

        console.log('PDF conversion successful:', pdfPath);
      } catch (err: any) {
        console.error("PDF conversion error:", err);
        storage.createNotification({
          userId: userId as string,
          documentId: document.id,
          message: `PDF conversion failed for "${document.docName}".Please contact administrator.`,
          type: "system_error"
        }).catch(() => { });
        const debugMsg = `[PDF Error] Document ${document.id} (${document.docNumber}): ${err.message}${err.stack ? '\n' + err.stack : ''} `;
        try {
          const fs = await import('fs');
          fs.appendFileSync('c:\\inetpub\\wwwroot\\dms\\debug.log', `[${new Date().toISOString()}] ${debugMsg} \n`);
        } catch (e) { }

        const message = err.message.includes(".docx")
          ? err.message
          : "Failed to convert Word to PDF. Please check the document file and try again.";

        return res.status(500).json({ message });
      }

      try {
        console.log('Reading PDF file:', pdfPath);
        const pdfBuffer = await fsPromises.readFile(pdfPath);

        if (pdfBuffer.length === 0) {
          throw new Error('PDF file is empty');
        }

        console.log('Sending PDF response, size:', pdfBuffer.length);

        const { download } = req.query;
        res.setHeader('Content-Type', 'application/pdf');

        if (download === 'true') {
          const fileName = `${document.docNumber}_${document.docName}_v${document.revisionNo}.pdf`.replace(/[/\\?%*:|"<>]/g, '-');
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        } else {
          res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
        }

        // Security and caching headers
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Length', pdfBuffer.length.toString());

        // Content Security Policy for PDF viewing
        res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'self'; img-src 'self' data:; style-src 'unsafe-inline';");
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');

        res.send(pdfBuffer);
      } catch (err) {
        console.error("PDF file read error (print):", err);
        return res.status(500).json({ message: "PDF file not found or unreadable after conversion." });
      }
    } catch (error: any) {
      console.error("Print endpoint error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/documents/:id/print", async (req, res) => {
    try {
      const { userId, version } = req.body;
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return res.status(400).json({ message: "userId is required and must be a non-empty string." });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      let document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      const originalDocNumber = document.docNumber;
      const allIssuedDocs = await storage.getDocumentsByStatus("issued");
      const allVersions = allIssuedDocs.filter(d => d.docNumber === originalDocNumber);
      if (allVersions.length === 0) {
        return res.status(404).json({ message: "No issued versions found for this document" });
      }
      const latestVersion = allVersions.reduce((latest, current) => {
        return current.revisionNo > latest.revisionNo ? current : latest;
      }, allVersions[0]);

      if (version !== undefined) {
        const requestedVersion = parseInt(version as string, 10);
        if (isNaN(requestedVersion)) {
          return res.status(400).json({ message: "Invalid version parameter" });
        }
        const userRole = user.role?.toLowerCase() || "";
        if (!user.masterCopyAccess && !["approver", "creator", "issuer", "admin"].includes(userRole)) {
          return res.status(403).json({ message: "Access denied. Only master copy users can print specific versions." });
        }
        const requestedDoc = allVersions.find(d => d.revisionNo === requestedVersion);
        if (!requestedDoc) {
          return res.status(404).json({ message: `Version ${requestedVersion} not found` });
        }
        document = await storage.getDocument(requestedDoc.id) || requestedDoc;
      } else if (!user.masterCopyAccess && !["approver", "creator", "issuer", "admin"].includes(user.role?.toLowerCase() || "") && document.id !== latestVersion.id) {
        return res.status(403).json({ message: "Access denied. Only the latest version can be printed. Please contact administrator for previous versions." });
      }

      if (document.status !== "issued") {
        return res.status(403).json({ message: "Only issued documents can be printed" });
      }
      if (!document.wordFilePath) {
        return res.status(404).json({ message: "No Word file uploaded for this document" });
      }

      const fullPath = path.join(pdfService.uploadsDir, path.basename(document.wordFilePath));
      try {
        await fsPromises.access(fullPath);
      } catch (fileError) {
        return res.status(400).json({ message: "Document file not found or inaccessible. Cannot generate PDF." });
      }

      if (user.role !== 'admin') {
        const alreadyPrinted = await storage.hasUserPrintedDocument(userId, document.id);
        if (alreadyPrinted) {
          return res.status(403).json({
            message: "Access Denied: This document has already been printed by you. Multiple prints are not allowed as per system policy. Please contact your administrator if you need another copy."
          });
        }
      }

      let pdfPath;
      try {
        const controlCopy = await storage.createControlCopy({
          documentId: document.id,
          userId: userId,
          actionType: "print"
        });
        await storage.createPrintLog({
          documentId: document.id,
          userId: userId,
          controlCopyId: controlCopy.id,
          medium: "PDF"
        });
        const controlCopyInfo = {
          userId: user.id,
          userFullName: user.fullName,
          controlCopyNumber: controlCopy.copyNumber,
          date: new Date().toLocaleDateString('en-GB')
        };
        const preparer = await storage.getUser(document.preparedBy);
        const approver = document.approvedBy ? await storage.getUser(document.approvedBy) : null;
        const issuer = document.issuedBy ? await storage.getUser(document.issuedBy) : null;
        const depts = await storage.getDocumentDepartments(document.id);
        const departmentNames = depts.map(d => d.name);

        const enrichedDocument = {
          ...document,
          departments: depts,
          departmentNames,
          creatorDepartmentName: (document as any).creatorData?.departmentName || preparer?.departmentName || "MR",
          preparerName: preparer?.fullName || document.preparerName || "Unknown",
          approverName: approver?.fullName || document.approverName || "Pending",
          issuerName: issuer?.fullName || document.issuerName || "Pending",
          location: document.location || (document as any).creatorData?.location || preparer?.location || ""
        };

        pdfPath = await pdfService.convertWordToPDF(fullPath, enrichedDocument as any, controlCopyInfo);
        const pdfBuffer = await fsPromises.readFile(pdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="print_copy.pdf"');
        res.send(pdfBuffer);
      } catch (err) {
        console.error("PDF printing error:", err);
        return res.status(500).json({ message: "Failed to generate print copy." });
      }
    } catch (error: any) {
      console.error("Print endpoint error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/documents/:id/download-pdf", async (req, res) => {
    const REQUEST_ID = Math.random().toString(36).substring(7);
    try {
      debugLog(`[Download - ${REQUEST_ID}] New PDF download request for ID: ${req.params.id} `);
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "userId is required" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      let document = await storage.getDocument(req.params.id);
      if (!document) return res.status(404).json({ message: "Document not found" });

      if (document.status !== "issued" && !(document.status === "approved" && user.role === "issuer")) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!document.wordFilePath) return res.status(404).json({ message: "No Word file found" });

      // Identify absolute path correctly
      const wordBasename = path.basename(document.wordFilePath);
      const fullWordPath = path.join(pdfService.uploadsDir, wordBasename);

      debugLog(`[Download - ${REQUEST_ID}] Looking for file: ${fullWordPath} `);
      try {
        await fsPromises.access(fullWordPath);
      } catch (e) {
        debugLog(`[Download - ${REQUEST_ID}] File NOT found: ${fullWordPath} `);
        return res.status(400).json({ message: "Word file not found on server storage." });
      }

      const controlCopy = await storage.createControlCopy({
        documentId: document.id,
        userId: userId,
        actionType: "download"
      });

      const controlCopyInfo = {
        userId: user.id,
        userFullName: user.fullName,
        controlCopyNumber: controlCopy.copyNumber,
        date: new Date().toLocaleDateString('en-GB')
      };

      const depts = await storage.getDocumentDepartments(document.id);
      const preparer = await storage.getUser(document.preparedBy);
      const approver = document.approvedBy ? await storage.getUser(document.approvedBy) : null;
      const issuer = document.issuedBy ? await storage.getUser(document.issuedBy) : null;

      const enrichedDocument = {
        ...document,
        departments: depts,
        departmentNames: depts.map(d => d.name),
        creatorDepartmentName: (document as any).creatorData?.departmentName || preparer?.departmentName || "MR",
        preparerName: preparer?.fullName || document.preparerName || "Unknown",
        approverName: approver?.fullName || document.approverName || "Pending",
        issuerName: issuer?.fullName || document.issuerName || "Pending",
        location: document.location || (document as any).creatorData?.location || preparer?.location || ""
      };

      debugLog(`[Download - ${REQUEST_ID}] Starting conversion v2.1...`);
      const pdfPath = await pdfService.convertWordToPDF(fullWordPath, enrichedDocument as any, controlCopyInfo);

      const pdfBuffer = await fsPromises.readFile(pdfPath);
      if (!pdfBuffer || pdfBuffer.length < 100) { // PDF header is tiny, but a real PDF should be larger
        throw new Error(`Generated PDF is suspiciously small(${pdfBuffer?.length || 0} bytes)`);
      }

      debugLog(`[Download - ${REQUEST_ID}]Success! Sending ${pdfBuffer.length} bytes`);

      const safeDocNumber = (document.docNumber || "document").trim().replace(/[/\\?%*:|"<>]/g, '-');
      const safeDocName = (document.docName || "").trim().replace(/[/\\?%*:|"<>]/g, '-');
      const fileName = `${safeDocNumber}_${safeDocName}_v${document.revisionNo}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      res.send(pdfBuffer);

    } catch (err: any) {
      const errorMsg = `[Download - ${REQUEST_ID}] CRITICAL ERROR: ${err.message} `;
      console.error(errorMsg);
      debugLog(errorMsg);
      res.status(500).json({ message: "Internal server error during PDF generation. " + err.message });
    }
  });

  app.get("/api/reports/print-logs", async (req, res) => {
    try {
      const { documentId, userId } = req.query;

      let printLogs;
      if (documentId) {
        printLogs = await storage.getPrintLogsByDocument(documentId as string);
      } else if (userId) {
        printLogs = await storage.getPrintLogsByUser(userId as string);
      } else {
        return res.status(400).json({ message: "documentId or userId query parameter is required" });
      }

      const logsWithDetails = await Promise.all(
        printLogs.map(async (log) => {
          const document = await storage.getDocument(log.documentId);
          const user = await storage.getUser(log.userId);
          const controlCopy = await storage.getControlCopiesByDocument(log.documentId);
          const userCopy = controlCopy.find(cc => cc.id === log.controlCopyId);

          return {
            ...log,
            documentName: document?.docName || "Unknown",
            documentNumber: document?.docNumber || "Unknown",
            userName: user?.fullName || "Unknown",
            userEmail: user?.username || "Unknown",
            controlCopyNumber: userCopy?.copyNumber || 0,
          };
        })
      );

      res.json(logsWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/control-copies", async (req, res) => {
    try {
      const { documentId, userId } = req.query;

      let controlCopies;
      if (documentId) {
        controlCopies = await storage.getControlCopiesByDocument(documentId as string);
      } else if (userId) {
        controlCopies = await storage.getControlCopiesByUser(userId as string);
      } else {
        return res.status(400).json({ message: "documentId or userId query parameter is required" });
      }

      const copiesWithDetails = await Promise.all(
        controlCopies.map(async (cc) => {
          const document = await storage.getDocument(cc.documentId);
          const user = await storage.getUser(cc.userId);

          return {
            ...cc,
            documentName: document?.docName || "Unknown",
            documentNumber: document?.docNumber || "Unknown",
            userName: user?.fullName || "Unknown",
            userEmail: user?.username || "Unknown",
          };
        })
      );

      res.json(copiesWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/documents/:docNumber/versions", async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ message: "userId query parameter is required" });
      }

      const user = await storage.getUser(userId as string);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const allDocuments = await storage.getDocumentsByStatus("issued");
      const documentVersions = allDocuments.filter(d => d.docNumber === req.params.docNumber);

      if (user.masterCopyAccess) {
        res.json(documentVersions);
      } else {
        const latestVersion = documentVersions.reduce((latest, current) => {
          return current.revisionNo > latest.revisionNo ? current : latest;
        }, documentVersions[0]);
        res.json([latestVersion]);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get document details for revision
  app.get("/api/documents/:id/revise", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Only allow revision of approved or issued documents
      if (document.status !== "approved" && document.status !== "issued") {
        return res.status(400).json({ message: "Only approved or issued documents can be revised" });
      }

      // Get departments associated with the document
      const departments = await storage.getDocumentDepartments(document.id);

      // Return document data prepared for revision
      res.json({
        originalDocument: {
          ...document,
          departments
        },
        revisionData: {
          docName: document.docName,
          docNumber: document.docNumber,
          location: document.location,
          duePeriodYears: document.duePeriodYears,
          previousVersionId: document.id,
          // Auto-set revision date to today
          dateOfIssue: new Date().toISOString().split('T')[0],
          reasonForRevision: `Revision of ${document.docName} (v${document.revisionNo})`
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/documents/:id/revisions", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Get all documents with the same document number to show revision history
      const revisions = await storage.getDocumentRevisions(document.docNumber);

      const revisionsWithDetails = await Promise.all(
        revisions.map(async (doc) => {
          const preparer = await storage.getUser(doc.preparedBy);
          const approver = doc.approvedBy ? await storage.getUser(doc.approvedBy) : null;
          const issuer = doc.issuedBy ? await storage.getUser(doc.issuedBy) : null;

          return {
            ...doc,
            preparerName: preparer?.fullName || "Unknown",
            approverName: approver?.fullName || null,
            issuerName: issuer?.fullName || null,
          };
        })
      );

      res.json(revisionsWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get revision history for a document
  app.get("/api/documents/:id/revision-history", async (req, res) => {
    try {
      const documentId = req.params.id;
      const document = await storage.getDocument(documentId);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Get the complete revision chain
      const revisionChain = [];

      // Get all documents with the same document number
      const allDocs = await storage.getDocumentsByDocNumber(document.docNumber);

      // Sort by revision number
      const sortedDocs = allDocs.sort((a, b) => a.revisionNo - b.revisionNo);

      // Build revision history with details
      for (const doc of sortedDocs) {
        const preparer = await storage.getUser(doc.preparedBy);
        const approver = doc.approvedBy ? await storage.getUser(doc.approvedBy) : null;
        const issuer = doc.issuedBy ? await storage.getUser(doc.issuedBy) : null;
        const depts = await storage.getDocumentDepartments(doc.id);

        // Find the previous version document details
        let previousVersionDetails = null;
        if (doc.previousVersionId) {
          const prevDoc = await storage.getDocument(doc.previousVersionId);
          if (prevDoc) {
            previousVersionDetails = {
              id: prevDoc.id,
              docNumber: prevDoc.docNumber,
              revisionNo: prevDoc.revisionNo,
              status: prevDoc.status
            };
          }
        }

        revisionChain.push({
          ...doc,
          preparerName: preparer?.fullName || "Unknown",
          approverName: approver?.fullName || null,
          issuerName: issuer?.fullName || null,
          departments: depts,
          previousVersionDetails,
          isOriginal: doc.revisionNo === 1 || !doc.previousVersionId,
          revisionCount: sortedDocs.length
        });
      }

      res.json({
        documentNumber: document.docNumber,
        totalRevisions: sortedDocs.length,
        revisionChain: revisionChain
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all revision activities (for admin overview)
  app.get("/api/admin/revision-activities", async (req, res) => {
    try {
      debugLog(`[RevisionActivities] Starting grouped revision activities query`);

      // Get all documents from all statuses
      const pending = await storage.getDocumentsByStatus("pending");
      const approved = await storage.getDocumentsByStatus("approved");
      const issued = await storage.getDocumentsByStatus("issued");
      const declined = await storage.getDocumentsByStatus("declined");
      const obsolete = await storage.getDocumentsByStatus("obsolete");

      const allDocs = [...pending, ...approved, ...issued, ...declined, ...obsolete];

      // Group by document number
      const groups: Record<string, any[]> = {};
      allDocs.forEach(doc => {
        if (!doc.docNumber) return;
        if (!groups[doc.docNumber]) groups[doc.docNumber] = [];
        groups[doc.docNumber].push(doc);
      });

      // Process groups
      const groupedActivities = await Promise.all(
        Object.entries(groups).map(async ([docNumber, docs]) => {
          // Sort by revision number
          const sorted = docs.sort((a, b) => a.revisionNo - b.revisionNo);

          // Get details for each version
          const activities = await Promise.all(
            sorted.map(async (doc) => {
              const preparer = await storage.getUser(doc.preparedBy);
              const approver = doc.approvedBy ? await storage.getUser(doc.approvedBy) : null;
              const issuer = doc.issuedBy ? await storage.getUser(doc.issuedBy) : null;
              const depts = await storage.getDocumentDepartments(doc.id);

              return {
                ...doc,
                preparerName: preparer?.fullName || "Unknown",
                approverName: approver?.fullName || null,
                issuerName: issuer?.fullName || null,
                departments: depts,
                daysSinceCreated: Math.ceil((new Date().getTime() - new Date(doc.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24))
              };
            })
          );

          return {
            docNumber,
            docName: activities[0].docName,
            totalRevisions: activities.length,
            activities
          };
        })
      );

      // Sort by latest activity date
      groupedActivities.sort((a, b) => {
        const latestA = Math.max(...a.activities.map(act => new Date(act.createdAt || 0).getTime()));
        const latestB = Math.max(...b.activities.map(act => new Date(act.createdAt || 0).getTime()));
        return latestB - latestA;
      });

      res.json({
        totalRevisions: allDocs.length,
        groupedActivities
      });
    } catch (error: any) {
      console.error("Error in grouped revision activities:", error);
      res.status(500).json({ message: error.message });
    }
  });
  const httpServer = createServer(app);

  return httpServer;
}
