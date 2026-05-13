
import { pdfService } from "../server/services/pdf-service";
import path from "path";
import fs from "fs/promises";

async function testPdf() {
    console.log("Generating diagnostic PDF...");

    // Dummy document data matching the systematic fields
    const mockDocument: any = {
        docName: "TEST CONTROL DOCUMENT",
        docNumber: "NFDCL/TEST/001",
        status: "issued",
        revisionNo: 5,
        dateOfIssue: new Date("2020-02-15"),
        dateOfRev: new Date("2025-02-15"),
        reviewDueDate: new Date("2028-02-14"),
        location: "Unit 1, Unit 2",
        creatorDepartmentName: "Production-Plant A",
        preparerName: "John Preparer",
        approverName: "Sam Approver",
        issuerName: "Jane Issuer"
    };

    const mockControlCopy = {
        userId: "user-1",
        userFullName: "Admin Test",
        controlCopyNumber: 1,
        date: "20/03/2026"
    };

    const dummyHtml = `
        <h1>1. PURPOSE</h1>
        <p>This is a test document to verify header and footer visibility.</p>
        <p>If you see this text but No table at the top/bottom, the margin or template injection is failing.</p>
        <div style="height: 1000px; background: #eee; padding: 20px;">
           Large block to force multiple pages...
        </div>
        <h1>2. SCOPE</h1>
        <p>Page 2 should also have headers.</p>
    `;

    try {
        // We bypass the LibreOffice step and go straight to PDF generation from HTML
        // @ts-ignore - accessing private for test
        const pdfPath = await pdfService.generatePdfFromHtml(dummyHtml, mockDocument, mockControlCopy);

        const artifactPath = "C:\\inetpub\\wwwroot\\dms\\diagnostic_test.pdf";
        await fs.copyFile(pdfPath, artifactPath);
        console.log(`Diagnostic PDF generated at: ${artifactPath}`);
    } catch (err) {
        console.error("PDF Generation Failed:", err);
    }
}

testPdf();
