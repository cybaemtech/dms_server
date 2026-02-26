import { db } from "./db";
import { users, departments, documents, notifications } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  const creator = await db.insert(users).values({
    username: "creator@example.com",
    password: "password123",
    fullName: "John Smith",
    role: "creator"
  }).returning();

  const approver = await db.insert(users).values({
    username: "approver@example.com",
    password: "password123",
    fullName: "Sarah Johnson",
    role: "approver"
  }).returning();

  const issuer = await db.insert(users).values({
    username: "issuer@example.com",
    password: "password123",
    fullName: "Michael Roberts",
    role: "issuer"
  }).returning();

  const depts = await db.insert(departments).values([
    { name: "Quality Control", code: "QC" },
    { name: "Production", code: "PROD" },
    { name: "Safety", code: "SAFE" },
    { name: "Engineering", code: "ENG" },
    { name: "Operations", code: "OPS" },
    { name: "Administration", code: "ADMIN" }
  ]).returning();

  const doc1 = await db.insert(documents).values({
    docName: "Quality Control SOP",
    docNumber: "QC-SOP-001",
    status: "pending",
    revisionNo: 2,
    preparedBy: creator[0].id,
    content: "This is the content of the Quality Control SOP document...",
    headerInfo: `Document No: QC-SOP-001
Revision: 2
Date: ${new Date().toLocaleDateString()}
Prepared By: ${creator[0].fullName}
Department: Quality Control
Category: Standard Operating Procedure`,
    footerInfo: `Confidential - Internal Use Only
Page 1 of 5
© Company Name ${new Date().getFullYear()}`
  }).returning();

  const doc2 = await db.insert(documents).values({
    docName: "Safety Inspection Format",
    docNumber: "SF-FMT-012",
    status: "pending",
    revisionNo: 0,
    preparedBy: creator[0].id,
    content: "This document outlines the safety inspection procedures...",
    headerInfo: `Document No: SF-FMT-012
Revision: 0
Date: ${new Date().toLocaleDateString()}
Prepared By: ${creator[0].fullName}
Department: Safety
Category: Format`,
    footerInfo: `Confidential - Internal Use Only
Page 1 of 3
© Company Name ${new Date().getFullYear()}`
  }).returning();

  await db.insert(notifications).values({
    userId: approver[0].id,
    documentId: doc1[0].id,
    message: `New document "${doc1[0].docName}" (${doc1[0].docNumber}) is ready for your approval`,
    type: "new_document"
  });

  await db.insert(notifications).values({
    userId: approver[0].id,
    documentId: doc2[0].id,
    message: `New document "${doc2[0].docName}" (${doc2[0].docNumber}) is ready for your approval`,
    type: "new_document"
  });

  console.log("Database seeded successfully!");
  console.log("\nTest Credentials:");
  console.log("Creator:", creator[0].username, "/ password123");
  console.log("Approver:", approver[0].username, "/ password123");
  console.log("Issuer:", issuer[0].username, "/ password123");
  
  process.exit(0);
}

seed().catch(console.error);
