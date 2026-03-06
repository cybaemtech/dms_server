import { pdfService } from "./server/services/pdf-service.ts";
import { storage } from "./server/storage.ts";
import path from "path";
import fs from "fs/promises";

async function test() {
    try {
        const docId = "doc-1772794022914"; // One from the list
        const doc = await storage.getDocument(docId);
        if (!doc) {
            console.error("Document not found");
            return;
        }

        const fullWordPath = path.resolve("./dist/uploads", path.basename(doc.wordFilePath));
        console.log("Testing conversion for:", fullWordPath);

        const pdfPath = await pdfService.convertWordToPDF(fullWordPath, doc);
        console.log("PDF generated at:", pdfPath);

        const exists = await fs.access(pdfPath).then(() => true).catch(() => false);
        console.log("PDF exists:", exists);

    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        process.exit();
    }
}

test();
