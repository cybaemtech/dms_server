
import { PDFService } from "./server/services/pdf-service.js";
import fs from "fs/promises";
import path from "path";

async function test() {
  const pdfService = new PDFService();
  const wordFile = "c:/inetpub/wwwroot/dms/dist/uploads/doc-1773143511065_1773143511092_Check list for Glass items and Acrylic sheets P-11.docx";
  
  const mockDoc = {
    id: "test",
    docName: "Test Document",
    docNumber: "TEST/001",
    revisionNo: 1,
    status: "issued",
    wordFilePath: wordFile
  };

  try {
    console.log("Starting PDF conversion test...");
    const pdfPath = await pdfService.convertWordToPDF(wordFile, mockDoc);
    console.log("PDF generated at:", pdfPath);
    const stats = await fs.stat(pdfPath);
    console.log("PDF size:", stats.size);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
