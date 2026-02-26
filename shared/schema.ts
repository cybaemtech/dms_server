import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("creator"),
  fullName: text("full_name").notNull(),
  masterCopyAccess: boolean("master_copy_access").notNull().default(false),
  departmentId: varchar("department_id").references(() => departments.id),
});

export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  docName: text("doc_name").notNull(),
  docNumber: text("doc_number").notNull().unique(),
  status: text("status").notNull().default("pending"),
  dateOfIssue: timestamp("date_of_issue").defaultNow(),
  revisionNo: integer("revision_no").notNull().default(0),
  preparedBy: varchar("prepared_by").notNull().references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  issuedBy: varchar("issued_by").references(() => users.id),
  content: text("content"),
  headerInfo: text("header_info"),
  footerInfo: text("footer_info"),
  duePeriodYears: integer("due_period_years"),
  reasonForRevision: text("reason_for_revision"),
  reviewDueDate: timestamp("review_due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
  issuedAt: timestamp("issued_at"),
  approvalRemarks: text("approval_remarks"),
  declineRemarks: text("decline_remarks"),
  issueRemarks: text("issue_remarks"),
  issuerName: text("issuer_name"),
  previousVersionId: varchar("previous_version_id").references((): any => documents.id),
  pdfFilePath: text("pdf_file_path"),
  wordFilePath: text("word_file_path"),
  creatorData: json("creator_data").$type<{ id: string; username: string; fullName: string; role: string }>(),
  approverData: json("approver_data").$type<{ id: string; username: string; fullName: string; role: string }>(),
  issuerData: json("issuer_data").$type<{ id: string; username: string; fullName: string; role: string }>(),
  issueNo: text("issue_no"),
  originalDateOfIssue: timestamp("original_date_of_issue"),
  preparerName: text("preparer_name"),
  approverName: text("approver_name"),
  pageCount: integer("page_count"),
});

export const documentDepartments = pgTable("document_departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  departmentId: varchar("department_id").notNull().references(() => departments.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  message: text("message").notNull(),
  type: text("type").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const controlCopies = pgTable("control_copies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  copyNumber: integer("copy_number").notNull(),
  actionType: text("action_type").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const printLogs = pgTable("print_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  controlCopyId: varchar("control_copy_id").notNull().references(() => controlCopies.id),
  printedAt: timestamp("printed_at").defaultNow().notNull(),
  medium: text("medium"),
});

export const documentRecipients = pgTable("document_recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  userId: varchar("user_id").references(() => users.id),
  departmentId: varchar("department_id").references(() => departments.id),
  notifiedAt: timestamp("notified_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  masterCopyAccess: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  issuedAt: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertControlCopySchema = createInsertSchema(controlCopies).omit({
  id: true,
  generatedAt: true,
  copyNumber: true,
});

export const insertPrintLogSchema = createInsertSchema(printLogs).omit({
  id: true,
  printedAt: true,
});

export const insertDocumentRecipientSchema = createInsertSchema(documentRecipients).omit({
  id: true,
  notifiedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type ControlCopy = typeof controlCopies.$inferSelect;
export type InsertControlCopy = z.infer<typeof insertControlCopySchema>;
export type PrintLog = typeof printLogs.$inferSelect;
export type InsertPrintLog = z.infer<typeof insertPrintLogSchema>;
export type DocumentRecipient = typeof documentRecipients.$inferSelect;
export type InsertDocumentRecipient = z.infer<typeof insertDocumentRecipientSchema>;
