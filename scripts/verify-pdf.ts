
import * as fs from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

async function verifyPdf() {
    const data = new Uint8Array(fs.readFileSync('C:\\inetpub\\wwwroot\\dms\\diagnostic_test.pdf'));
    const loadingTask = getDocument({ data });
    const pdf = await loadingTask.promise;

    console.log(`PDF loaded. Pages: ${pdf.numPages}`);

    let foundHeader = false;
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map((item: any) => item.str).join(' ');
        console.log(`Page ${i} text snippet: ${text.substring(0, 200)}...`);

        if (text.includes("NEELIKON")) {
            foundHeader = true;
        }
    }

    if (foundHeader) {
        console.log("SUCCESS: 'NEELIKON' keyword found in PDF headers!");
    } else {
        console.log("FAILURE: 'NEELIKON' keyword NOT found in PDF.");
    }
}

verifyPdf().catch(console.error);
