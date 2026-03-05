import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import express, { type Request, Response } from "express";
import { pdfService } from "./services/pdf-service";
import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
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
        location: user.location
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
        location: user.location
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
        documents = await storage.getUserAccessibleDocuments(recipientId as string);
      } else if (status) {
        documents = await storage.getDocumentsByStatus(status as string);
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
          const depts = await storage.getDocumentDepartments(doc.id);

          return {
            ...doc,
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

      const issuedDocs = await storage.getDocumentsByStatus("issued");

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
            preparerName: preparer?.fullName || "Unknown",
            departments: depts,
            daysUntilDue
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
      const documents = await storage.getDocumentsByDepartment(req.params.id, status as string);

      const documentsWithDetails = await Promise.all(
        documents.map(async (doc) => {
          const preparer = await storage.getUser(doc.preparedBy);
          const depts = await storage.getDocumentDepartments(doc.id);
          return {
            ...doc,
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

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const preparer = await storage.getUser(document.preparedBy);
      const approver = document.approvedBy ? await storage.getUser(document.approvedBy) : null;
      const issuer = document.issuedBy ? await storage.getUser(document.issuedBy) : null;
      const depts = await storage.getDocumentDepartments(document.id);
      const previousVersion = document.previousVersionId
        ? await storage.getDocument(document.previousVersionId)
        : null;

      res.json({
        ...document,
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

  app.get("/api/documents/next-revision/:docNumber", async (req, res) => {
    try {
      const { docNumber } = req.params;
      const existingDocs = await storage.getDocumentsByDocNumber(docNumber);
      const nextRevisionNo = existingDocs.length > 0
        ? Math.max(...existingDocs.map(d => d.revisionNo || 0)) + 1
        : 1;
      res.json({ nextRevisionNo });
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


      const duePeriodYears = req.body.duePeriodYears ? parseInt(req.body.duePeriodYears, 10) : 2;
      // Use provided dateOfIssue or default to current date
      const dateOfIssue = req.body.dateOfIssue ? new Date(req.body.dateOfIssue) : new Date();

      let reviewDueDate = new Date(dateOfIssue);
      reviewDueDate.setFullYear(reviewDueDate.getFullYear() + duePeriodYears);

      const dateOfRev = req.body.dateOfRev ? new Date(req.body.dateOfRev) : null;
      const originalDateOfIssue = req.body.originalDateOfIssue ? new Date(req.body.originalDateOfIssue) : dateOfIssue;

      // Get creator data for JSON storage
      const creator = await storage.getUser(req.body.preparedBy);
      const creatorData = creator ? {
        id: creator.id,
        username: creator.username,
        fullName: creator.fullName,
        role: creator.role
      } : null;

      // Auto-calculate revision number based on existing documents with same docNumber
      const existingDocsWithSameNumber = await storage.getDocumentsByDocNumber(req.body.docNumber);
      const nextRevisionNo = existingDocsWithSameNumber.length > 0
        ? Math.max(...existingDocsWithSameNumber.map(d => d.revisionNo || 0)) + 1
        : 1;

      // Auto-calculate Issue No based on existing documents
      const existingDocs = await storage.getDocumentsByUser(req.body.preparedBy);
      const sameDoc = existingDocs.find(d => d.docNumber === req.body.docNumber);
      const issueNo = sameDoc?.issueNo || '01';

      const documentData = {
        ...req.body,
        revisionNo: nextRevisionNo,
        duePeriodYears,
        reasonForRevision: req.body.reasonForRevision || undefined,
        issueNo,
        dateOfIssue,
        reviewDueDate,
        dateOfRev,
        originalDateOfIssue,
        headerInfo: (req.body.headerInfo && req.body.headerInfo !== 'undefined') ? req.body.headerInfo : (extracted.headerInfo || ""),
        footerInfo: (req.body.footerInfo && req.body.footerInfo !== 'undefined') ? req.body.footerInfo : (extracted.footerInfo || ""),
        preparerName: req.body.preparerName || creator?.fullName || "",
        location: req.body.location || creator?.location || null,
        creatorData
      };

      const document = await storage.createDocument(documentData);

      // Automatically assign creator's department
      const deptId = req.body.departmentId || creator?.departmentId;
      if (deptId && deptId !== 'undefined') {
        await storage.assignDocumentToDepartments(document.id, [deptId]);
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

  app.patch("/api/documents/:id", async (req, res) => {
    // Alias PATCH to PUT for documents
    return (app as any)._router.handle({ method: 'PUT', url: `/api/documents/${req.params.id}`, body: req.body, params: req.params }, res);
  });

  app.put("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const { 
        docName, docNumber, dateOfIssue, revisionNumber, 
        duePeriodYears, reasonForRevision, location, 
        preparerName, dateOfRev, reviewDueDate 
      } = req.body;

      const updateData: any = {
        updatedAt: new Date()
      };

      if (docName !== undefined) updateData.docName = docName;
      if (docNumber !== undefined) updateData.docNumber = docNumber;
      if (dateOfIssue !== undefined) updateData.dateOfIssue = new Date(dateOfIssue);
      if (revisionNumber !== undefined) updateData.revisionNo = parseInt(revisionNumber, 10);
      if (duePeriodYears !== undefined) updateData.duePeriodYears = parseInt(duePeriodYears, 10);
      if (reasonForRevision !== undefined) updateData.reasonForRevision = reasonForRevision;
      if (location !== undefined) updateData.location = location;
      if (preparerName !== undefined) updateData.preparerName = preparerName;
      if (dateOfRev !== undefined) updateData.dateOfRev = dateOfRev ? new Date(dateOfRev) : null;
      if (reviewDueDate !== undefined) updateData.reviewDueDate = reviewDueDate ? new Date(reviewDueDate) : null;

      // Recalculate reviewDueDate ONLY if it wasn't explicitly provided and other relevant fields changed
      if (updateData.reviewDueDate === undefined) {
        const newDateOfIssue = updateData.dateOfIssue || document.dateOfIssue;
        const newDuePeriod = updateData.duePeriodYears !== undefined ? updateData.duePeriodYears : document.duePeriodYears;

        if (newDateOfIssue && newDuePeriod) {
          const calculatedReviewDueDate = new Date(newDateOfIssue);
          calculatedReviewDueDate.setFullYear(calculatedReviewDueDate.getFullYear() + newDuePeriod);
          updateData.reviewDueDate = calculatedReviewDueDate;
        }
      }

      const updatedDoc = await storage.updateDocument(req.params.id, updateData);

      res.json(updatedDoc);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/documents/:id/approve", async (req, res) => {
    try {
      const { approvalRemarks, approvedBy, approverName, departments } = req.body;

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
        role: approver.role
      } : null;

      const updatedDoc = await storage.updateDocument(req.params.id, {
        status: "approved",
        approvalRemarks,
        approvedBy,
        approverName: approver?.fullName || approverName,
        approvedAt: new Date(),
        approverData
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
      const { declineRemarks } = req.body;

      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const updatedDoc = await storage.updateDocument(req.params.id, {
        status: "declined",
        declineRemarks,
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
      const { issuedBy, issuerName, remarks } = req.body;

      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Get issuer data for JSON storage
      const issuer = await storage.getUser(issuedBy);
      const issuerData = issuer ? {
        id: issuer.id,
        username: issuer.username,
        fullName: issuer.fullName,
        role: issuer.role
      } : null;

      const updatedDoc = await storage.updateDocument(req.params.id, {
        status: "issued",
        issuedBy,
        issuerName,
        issueRemarks: remarks,
        issuedAt: new Date(),
        issuerData
      });

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

      res.json({
        creators: creators.map(u => ({ id: u.id, username: u.username, fullName: u.fullName, role: u.role })),
        approvers: approvers.map(u => ({ id: u.id, username: u.username, fullName: u.fullName, role: u.role })),
        issuers: issuers.map(u => ({ id: u.id, username: u.username, fullName: u.fullName, role: u.role })),
        admins: admins.map(u => ({ id: u.id, username: u.username, fullName: u.fullName, role: u.role })),
        recipients: recipients.map(u => ({ id: u.id, username: u.username, fullName: u.fullName, role: u.role })),
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
      const issued = await storage.getDocumentsByStatus("issued");
      const declined = await storage.getDocumentsByStatus("declined");

      const allDocs = [...pending, ...approved, ...issued, ...declined];

      const documentsWithDetails = await Promise.all(
        allDocs.map(async (doc) => {
          const preparer = await storage.getUser(doc.preparedBy);
          const approver = doc.approvedBy ? await storage.getUser(doc.approvedBy) : null;
          const issuer = doc.issuedBy ? await storage.getUser(doc.issuedBy) : null;
          const depts = await storage.getDocumentDepartments(doc.id);

          return {
            ...doc,
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
          declined: declined.length
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
      const departments = await storage.getDepartments();

      const creators = await storage.getUsersByRole("creator");
      const approvers = await storage.getUsersByRole("approver");
      const issuers = await storage.getUsersByRole("issuer");

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const allDocs = [...pending, ...approved, ...issued, ...declined];
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

      const path = await import("path");
      const fs = await import("fs/promises");

      try {
        await fs.access(document.wordFilePath);
        const fileName = path.basename(document.wordFilePath);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        const fileBuffer = await fs.readFile(document.wordFilePath);
        res.send(fileBuffer);
      } catch (err) {
        return res.status(404).json({ message: "Word file not found on server" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/documents/:id/view-word", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (!document.wordFilePath) {
        return res.status(404).json({ message: "No Word file available for this document" });
      }

      try {
        await fs.access(document.wordFilePath);
        const wordBuffer = await fs.readFile(document.wordFilePath);

        const mammoth = await import("mammoth");
        const result = await mammoth.default.convertToHtml({ buffer: wordBuffer });

        res.json({
          html: result.value,
          messages: result.messages,
          docName: document.docName,
          docNumber: document.docNumber,
          revisionNo: document.revisionNo
        });
      } catch (err) {
        return res.status(404).json({ message: "Word file not found on server" });
      }
    } catch (error: any) {
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
        if (!user.masterCopyAccess) {
          return res.status(403).json({ message: "Access denied. Only master copy users can access specific versions." });
        }
        const requestedDoc = allVersions.find(d => d.revisionNo === requestedVersion);
        if (!requestedDoc) {
          return res.status(404).json({ message: `Version ${requestedVersion} not found` });
        }
        document = await storage.getDocument(requestedDoc.id) || requestedDoc;
      } else if (!user.masterCopyAccess && document.id !== latestVersion.id) {
        return res.status(403).json({ message: "Access denied. Only the latest version can be accessed. Please contact administrator for previous versions." });
      }

      if (document.status !== "issued") {
        console.log('Document not issued, status:', document.status);
        return res.status(403).json({ message: "Only issued documents can be viewed as PDF" });
      }

      if (!document.wordFilePath) {
        console.log('No Word file path for document:', document.id);
        return res.status(404).json({ message: "No Word file uploaded for this document" });
      }

      try {
        await fs.access(document.wordFilePath);
        console.log('Word file exists:', document.wordFilePath);
      } catch (fileError) {
        console.error('Word file not found:', document.wordFilePath, fileError);
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
          date: new Date().toLocaleDateString()
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
          preparerName: preparer?.fullName || "Unknown",
          approverName: approver?.fullName || "Pending",
          issuerName: issuer?.fullName || "Pending"
        };

        console.log('Converting Word to PDF with enriched data for control copy:', controlCopy.copyNumber);
        pdfPath = await pdfService.convertWordToPDF(
          document.wordFilePath,
          enrichedDocument as any,
          controlCopyInfo
        );

        console.log('PDF conversion successful:', pdfPath);
      } catch (err: any) {
        console.error("PDF conversion error:", err);
        return res.status(500).json({ message: "Failed to convert Word to PDF. Please check the document file and try again." });
      }

      try {
        console.log('Reading PDF file:', pdfPath);
        const pdfBuffer = await fs.readFile(pdfPath);

        if (pdfBuffer.length === 0) {
          throw new Error('PDF file is empty');
        }

        console.log('Sending PDF response, size:', pdfBuffer.length);

        // Security and caching headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Length', pdfBuffer.length.toString());

        // Content Security Policy for PDF viewing
        res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'self'; img-src 'self' data:; style-src 'unsafe-inline';");
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');

        res.send(pdfBuffer);

      } catch (err: any) {
        console.error("PDF file read error:", err);
        return res.status(500).json({ message: "PDF file not found or unreadable after conversion." });
      }
    } catch (error: any) {
      console.error("PDF endpoint error:", error);
      res.status(500).json({ message: error.message || 'Internal server error' });
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
        if (!user.masterCopyAccess) {
          return res.status(403).json({ message: "Access denied. Only master copy users can print specific versions." });
        }
        const requestedDoc = allVersions.find(d => d.revisionNo === requestedVersion);
        if (!requestedDoc) {
          return res.status(404).json({ message: `Version ${requestedVersion} not found` });
        }
        document = await storage.getDocument(requestedDoc.id) || requestedDoc;
      } else if (!user.masterCopyAccess && document.id !== latestVersion.id) {
        return res.status(403).json({ message: "Access denied. Only the latest version can be printed. Please contact administrator for previous versions." });
      }
      if (document.status !== "issued") {
        return res.status(403).json({ message: "Only issued documents can be printed" });
      }
      if (!document.wordFilePath) {
        return res.status(404).json({ message: "No Word file uploaded for this document" });
      }
      // Check for document content before PDF generation
      // Instead of checking document.content, check if word file exists and is accessible
      try {
        await fs.access(document.wordFilePath);
        const stats = await fs.stat(document.wordFilePath);
        if (stats.size === 0) {
          return res.status(400).json({ message: "Document file is empty. Cannot generate PDF." });
        }
      } catch (fileError) {
        return res.status(400).json({ message: "Document file not found or inaccessible. Cannot generate PDF." });
      }

      // Enforcement of one-time print rule
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
          date: new Date().toLocaleDateString()
        };
        const preparer = await storage.getUser(document.preparedBy);
        const approver = document.approvedBy ? await storage.getUser(document.approvedBy) : null;
        const issuer = document.issuedBy ? await storage.getUser(document.issuedBy) : null;
        const depts = await storage.getDocumentDepartments(document.id);
        const departmentNames = depts.map(d => d.name);

        const enrichedDocument = {
          ...document,
          departmentNames,
          preparerName: preparer?.fullName || "Unknown",
          approverName: approver?.fullName || "Pending",
          issuerName: issuer?.fullName || "Pending"
        };

        console.log('Converting Word to PDF (print) with enriched data for control copy:', controlCopy.copyNumber);
        pdfPath = await pdfService.convertWordToPDF(
          document.wordFilePath,
          enrichedDocument as any,
          controlCopyInfo
        );
      } catch (err) {
        console.error("PDF conversion error (print):", err);
        return res.status(500).json({ message: "Failed to convert Word to PDF for printing. Please check the document file and try again." });
      }
      try {
        const pdfBuffer = await fs.readFile(pdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="print_copy.pdf"');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
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

  const httpServer = createServer(app);

  return httpServer;
}
