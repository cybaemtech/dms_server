import mammoth from "mammoth";
import puppeteer from "puppeteer";
import { PDFDocument, rgb } from "pdf-lib";
import path from "path";
import fs from "fs/promises";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { type Document } from "@shared/schema";
import { fileURLToPath } from 'url';
import AdmZipPackage from 'adm-zip';

const execAsync = promisify(exec);
const AdmZip = (AdmZipPackage as any).default || AdmZipPackage;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = process.cwd();

export interface ControlCopyInfo {
  userId: string;
  userFullName: string;
  controlCopyNumber: number;
  date: string;
}

export class PDFService {
  public uploadsDir = path.join(baseDir, "uploads");
  public pdfsDir = path.join(baseDir, "pdfs");

  constructor() { }

  async initialize(): Promise<void> {
    await this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.uploadsDir, { recursive: true });
    await fs.mkdir(this.pdfsDir, { recursive: true });
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
  }

  async convertWordToPDF(
    wordFilePath: string,
    document: Document,
    controlCopyInfo?: ControlCopyInfo
  ): Promise<string> {
    try {
      console.log(`[PDF] Starting High-Fidelity STAMPING conversion for ${document.docNumber}`);

      // 1. Convert Word to Native PDF first (Perfect Fidelity)
      const originalPdfPath = await this.convertWordToNativePdfWithLibreOffice(wordFilePath);
      const originalPdfBytes = await fs.readFile(originalPdfPath);

      // 2. Generate the "Stamps" (Headers/Footers Only)
      const stampsPdfPath = await this.generateStampsOnlyPdf(document, originalPdfBytes, controlCopyInfo);
      const stampsPdfBytes = await fs.readFile(stampsPdfPath);

      // 3. Digitally Merge and Scale the two PDFs
      const mergedPdfPath = await this.mergeAndScalePdfs(originalPdfBytes, stampsPdfBytes, document);

      // 4. Cleanup temp files
      try {
        await fs.unlink(originalPdfPath);
        await fs.unlink(stampsPdfPath);
      } catch (e) { }

      return mergedPdfPath;
    } catch (err: any) {
      console.error(`[PDF] CRITICAL HIGH-FIDELITY FAILURE for ${document.docNumber}:`, err);
      console.warn(`[PDF] High-Fidelity Conversion failed: ${err.message}. Falling back to standard conversion...`);
      return await this.convertWordToPDFWithPuppeteer(wordFilePath, document, controlCopyInfo);
    }
  }

  private async convertWordToNativePdfWithLibreOffice(wordFilePath: string): Promise<string> {
    const libreOfficePath = process.env.LIBREOFFICE_PATH || 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
    if (!existsSync(libreOfficePath)) throw new Error('LibreOffice not found');

    // Use a unique folder for concurrency safety
    const uniqueId = Math.random().toString(36).substring(2, 10);
    const tempOutputDir = path.join(this.pdfsDir, `stamp_temp_${Date.now()}_${uniqueId}`);
    await fs.mkdir(tempOutputDir, { recursive: true });

    try {
      // Copy the source file to a safe, space-free name to avoid shell escaping issues
      // (filenames with spaces/dots/special chars cause LibreOffice CLI to fail)
      const safeInputPath = path.join(tempOutputDir, `input.docx`);

      try {
        // Enforce exact margins by modifying the DOCX's document.xml before LibreOffice renders it.
        // This guarantees Perfect Margin alignment and content width without vertically squishing!
        const buffer = await fs.readFile(wordFilePath);
        const zip = new AdmZip(buffer);
        const docXmlEntry = zip.getEntry("word/document.xml");

        if (docXmlEntry) {
          let docXml = docXmlEntry.getData().toString("utf8");
          // Replace all <w:pgMar> margin attributes to match exactly:
          // Top ~ 4.5cm (2551 twips)
          // Bottom ~ 3.0cm (1701 twips)
          // Left ~ 1.3cm (737 twips)
          // Right ~ 1.0cm (567 twips)
          docXml = docXml.replace(/<w:pgMar([^>]*)\/?>/g, (match: string, attrs: string) => {
            let newAttrs = attrs;
            newAttrs = newAttrs.replace(/w:top="[0-9]+"/, 'w:top="2155"');
            newAttrs = newAttrs.replace(/w:bottom="[0-9]+"/, 'w:bottom="1701"');
            newAttrs = newAttrs.replace(/w:left="[0-9]+"/, 'w:left="737"');
            newAttrs = newAttrs.replace(/w:right="[0-9]+"/, 'w:right="567"');

            if (!newAttrs.includes('w:top=')) newAttrs += ' w:top="2155"';
            if (!newAttrs.includes('w:bottom=')) newAttrs += ' w:bottom="1701"';
            if (!newAttrs.includes('w:left=')) newAttrs += ' w:left="737"';
            if (!newAttrs.includes('w:right=')) newAttrs += ' w:right="567"';

            // Ensure trailing slash is clean if it got caught in attrs.
            if (newAttrs.endsWith('/')) newAttrs = newAttrs.slice(0, -1);

            return `<w:pgMar${newAttrs}/>`;
          });

          // Enforce all tables to be 100% width and remove negative left indents
          // This prevents native Word tables from overflowing the exact 1.3cm/1cm margin boundaries and getting abruptly cut!
          docXml = docXml.replace(/<w:tblPr\b[^>]*>([\s\S]*?)<\/w:tblPr>/g, (match: string, inner: string) => {
            let newInner = inner.replace(/<w:tblW[^>]*\/?>(?:<\/w:tblW>)?/g, '<w:tblW w:w="5000" w:type="pct"/>');
            newInner = newInner.replace(/<w:tblInd[^>]*\/?>(?:<\/w:tblInd>)?/g, '<w:tblInd w:w="0" w:type="dxa"/>');
            return match.replace(inner, newInner);
          });

          zip.updateFile("word/document.xml", Buffer.from(docXml, "utf8"));
          await fs.writeFile(safeInputPath, zip.toBuffer());
        } else {
          await fs.copyFile(wordFilePath, safeInputPath);
        }
      } catch (e) {
        console.warn("[PDF] Failed to inject dynamic margins, falling back to original file:", e);
        await fs.copyFile(wordFilePath, safeInputPath);
      }

      const command = `"${libreOfficePath}" --headless --convert-to pdf --outdir "${tempOutputDir}" "${safeInputPath}"`;
      console.log(`[PDF] Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command, { timeout: 60 * 1000 });

      if (stderr) console.warn(`[PDF] LibreOffice stderr: ${stderr}`);
      if (stdout) console.log(`[PDF] LibreOffice stdout: ${stdout}`);

      // LibreOffice names the output after the input file (input.pdf)
      const pdfPath = path.join(tempOutputDir, 'input.pdf');

      let retries = 0;
      while (!existsSync(pdfPath) && retries < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }

      if (!existsSync(pdfPath)) throw new Error('LibreOffice PDF output not found after conversion');

      const finalPath = path.join(this.pdfsDir, `native_${Date.now()}_${uniqueId}.pdf`);
      await fs.rename(pdfPath, finalPath);
      return finalPath;
    } finally {
      try {
        await fs.rm(tempOutputDir, { recursive: true, force: true });
      } catch (e) { }
    }
  }

  private async generateStampsOnlyPdf(document: Document, originalPdfBytes: Uint8Array, controlCopyInfo?: ControlCopyInfo): Promise<string> {
    const originalPdf = await PDFDocument.load(originalPdfBytes);
    const pageCount = originalPdf.getPageCount();

    // Create a temporary PDF to embed and extract true rotational dimensions
    const tempMerged = await PDFDocument.create();
    const embeddedPages = await tempMerged.embedPages(originalPdf.getPages());
    const trueWidth = embeddedPages[0].width;
    const trueHeight = embeddedPages[0].height;

    // Generate Header/Footer Template
    const headerHtml = this.getHeaderTemplate(document);
    const footerHtml = this.getFooterTemplate(document, controlCopyInfo);

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Generate exactly the right number of pages using page-break logic
      let contentHtml = '<div style="font-size: 1px;">';
      for (let i = 0; i < pageCount; i++) {
        contentHtml += `<div style="height: 1px; color: transparent; ${i < pageCount - 1 ? 'page-break-after: always;' : ''}">.</div>`;
      }
      contentHtml += '</div>';

      await page.setContent(contentHtml, { waitUntil: 'load' });

      const stampsPdfPath = path.join(this.pdfsDir, `stamps_${Date.now()}.pdf`);
      const pdfBuffer = await page.pdf({
        width: `${trueWidth / 72}in`,
        height: `${trueHeight / 72}in`,
        displayHeaderFooter: true,
        headerTemplate: headerHtml,
        footerTemplate: footerHtml,
        printBackground: true,
        margin: {
          top: '3.8cm',
          bottom: '3cm',
          left: '1.3cm',
          right: '1cm'
        }
      });

      await fs.writeFile(stampsPdfPath, pdfBuffer);
      return stampsPdfPath;
    } finally {
      if (browser) await browser.close();
    }
  }

  private async mergeAndScalePdfs(originalBytes: Uint8Array, stampsBytes: Uint8Array, document: Document): Promise<string> {
    const originalPdf = await PDFDocument.load(originalBytes);
    const stampsPdf = await PDFDocument.load(stampsBytes);
    const mergedPdf = await PDFDocument.create();

    const originalPages = originalPdf.getPages();
    const stampPages = stampsPdf.getPages();

    // Embed current PDFs into new one
    const embeddedOriginalPages = await mergedPdf.embedPages(originalPages);
    const embeddedStampPages = await mergedPdf.embedPages(stampPages);

    for (let i = 0; i < embeddedOriginalPages.length; i++) {
      const orig = embeddedOriginalPages[i];
      const stamp = i < embeddedStampPages.length ? embeddedStampPages[i] : embeddedStampPages[embeddedStampPages.length - 1];

      // Create new page matching the TRUE original size (accounts for rotation)
      const width = orig.width;
      const height = orig.height;
      const newPage = mergedPdf.addPage([width, height]);

      // Draw the original page exactly as is (100% scale).
      // We assume the Word document is formatted with the correct 1.3cm Left and 1cm Right margins,
      // and sufficient top/bottom margins to accommodate the header and footer stamps.
      // This ensures 100% true fidelity without squishing text vertically.
      newPage.drawPage(orig, {
        x: 0,
        y: 0,
        width: width,
        height: height
      });

      // 2. Overlay the Header/Footer Stamp (Transparent PDF)
      // Draws the stamped border/header at 100% scale over the content
      newPage.drawPage(stamp, { x: 0, y: 0, width, height });
    }

    const safeDocNumber = this.sanitizeFilename(document.docNumber);
    const finalName = `${safeDocNumber}_v${document.revisionNo}_final_${Date.now()}.pdf`;
    const finalPath = path.join(this.pdfsDir, finalName);

    const mergedBytes = await mergedPdf.save();
    await fs.writeFile(finalPath, mergedBytes);
    return finalPath;
  }

  private async detectIsLandscape(wordFilePath: string): Promise<boolean> {
    try {
      if (!wordFilePath.endsWith('.docx')) return false;
      const buffer = await fs.readFile(wordFilePath);
      const zip = new AdmZip(buffer);
      const docXml = zip.readAsText("word/document.xml");

      // Look for orientation tag in the main document section properties
      if (docXml.includes('w:orient="landscape"') || docXml.includes('orient="landscape"')) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  private async convertWordToHtmlWithLibreOffice(wordFilePath: string): Promise<string> {
    if (!existsSync(wordFilePath)) throw new Error("Word file not found");

    const libreOfficePath = process.env.LIBREOFFICE_PATH || 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
    if (!existsSync(libreOfficePath)) throw new Error('LibreOffice not found');

    const outputDir = path.join(this.pdfsDir, `temp_${Date.now()}`);
    await fs.mkdir(outputDir, { recursive: true });

    try {
      // Convert to HTML with embedded images
      const command = `"${libreOfficePath}" --headless --convert-to "html:HTML:EmbedImages" --outdir "${outputDir}" "${wordFilePath}"`;
      console.log(`[PDF] Executing LibreOffice to HTML: ${command}`);
      await execAsync(command, { timeout: 60000 });

      const tempHtmlName = path.basename(wordFilePath, path.extname(wordFilePath)) + ".html";
      const tempHtmlPath = path.join(outputDir, tempHtmlName);

      // Wait for file creation
      let retries = 0;
      while (!existsSync(tempHtmlPath) && retries < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }

      if (!existsSync(tempHtmlPath)) throw new Error('HTML conversion failed');

      let html = await fs.readFile(tempHtmlPath, 'utf-8');

      // Extract only the content inside the <body> tags from LibreOffice HTML
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const innerContent = bodyMatch ? bodyMatch[1] : html;

      // Clean up only the tags that break our systemic layout, but KEEP the formatting <style> block
      // We only remove @page and body margins, keeping the rest of the fidelity
      const scrubbedContent = innerContent
        .replace(/@page\s*\{[\s\S]*?\}/gi, '') // Remove Word-specific page margins
        .replace(/body\s*\{margin:[^;]+;?\}/gi, '') // Remove body margins
        .replace(/<(meta|title|link|xml)[^>]*>([\s\S]*?)<\/\1>/gi, '');

      // Check if there are styles in the head we should bring into the body
      const headMatch = html.match(/<head[^>]*>([\s\S]*)<\/head>/i);
      const headContent = headMatch ? headMatch[1] : '';
      const styleMatch = headContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      const styles = styleMatch ? styleMatch.join('\n') : '';

      // We wrap the content in a div to ensure styles apply correctly
      return `
        ${styles}
        <div class="libre-content">${scrubbedContent}</div>`;
    } finally {
      // Cleanup temp dir
      try {
        await fs.rm(outputDir, { recursive: true, force: true });
      } catch (rmErr) {
        console.warn(`[PDF] Failed to cleanup temp dir: ${outputDir}`);
      }
    }
  }

  private async generatePdfFromHtml(
    bodyHtml: string,
    document: Document,
    isLandscape: boolean = false,
    controlCopyInfo?: ControlCopyInfo
  ): Promise<string> {
    let browser;
    try {
      // Dimensions for A4
      const width = isLandscape ? 841.89 : 595.28;
      const height = isLandscape ? 595.28 : 841.89;

      // Wrap with systematic theme
      const fullHtml = this.wrapWithHeavyDutyTheme(document, bodyHtml, isLandscape, width, height, controlCopyInfo);

      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'load' });

      // Apply systematic header and footer templates
      const headerHtml = this.getHeaderTemplate(document);
      const footerHtml = this.getFooterTemplate(document, controlCopyInfo);

      const safeDocNumber = this.sanitizeFilename(document.docNumber);
      const pdfFileName = `${safeDocNumber}_v${document.revisionNo}_issued_${Date.now()}.pdf`;
      const pdfPath = path.join(this.pdfsDir, pdfFileName);

      const pdfBuffer = await page.pdf({
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: true,
        headerTemplate: headerHtml,
        footerTemplate: footerHtml,
        width: `${width / 72}in`,
        height: `${height / 72}in`,
        landscape: isLandscape,
        margin: {
          top: '3.8cm',
          bottom: '3cm',
          left: '1.3cm',
          right: '1cm'
        },
      });

      await fs.writeFile(pdfPath, pdfBuffer);
      return pdfPath;
    } finally {
      if (browser) await browser.close();
    }
  }

  private async convertWordToPDFWithPuppeteer(
    wordFilePath: string,
    document: Document,
    controlCopyInfo?: ControlCopyInfo
  ): Promise<string> {
    // Original mammoth-based fallback (kept for robustness)
    try {
      const isLandscape = await this.detectIsLandscape(wordFilePath);
      const wordBuffer = await fs.readFile(wordFilePath);
      const result = await mammoth.convertToHtml({ buffer: wordBuffer });
      const htmlContent = result.value || '';
      return await this.generatePdfFromHtml(htmlContent, document, isLandscape, controlCopyInfo);
    } catch (err) {
      console.error("[PDF] Critical Fallback Failure:", err);
      throw err;
    }
  }

  private wrapWithHeavyDutyTheme(document: Document, body: string, isLandscape: boolean, width: number, height: number, controlCopyInfo?: ControlCopyInfo): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    /* RESET CSS to match Word behavior */
    * { box-sizing: border-box; }
    html, body { 
      margin: 0; 
      padding: 0; 
      width: 100%; 
      -webkit-print-color-adjust: exact;
    }
    body {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: normal;
      color: #000;
    }
    h1, h2, h3, h4, h5, h6 { margin: 0; padding: 0.5em 0; font-size: inherit; font-weight: bold; }
    p { margin: 0; padding: 0; }
    
    .document-content { 
      padding: 0; 
      background: white; 
      width: 100%; 
    }
    
    /* FORCE relative positioning so Word content doesn't escape our margins */
    .libre-content, .libre-content * { 
      position: relative !important; 
      top: auto !important;
      left: auto !important;
      margin-top: auto;
    }
    
    .libre-content { padding-top: 5px; }
    .libre-content table { border-collapse: collapse; margin: 10pt 0; page-break-inside: auto; }
    .libre-content tr { page-break-inside: avoid; page-break-after: auto; }
    .libre-content td { padding: 4px; vertical-align: top; }
    .libre-content img { max-width: 100%; height: auto; display: block; }
  </style>
</head>
<body>
  <div class="document-content">
    ${body}
  </div>
</body>
</html>`;
  }

  private formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '-';
    return dateObj.toLocaleDateString('en-GB');
  }

  private getHeaderTemplate(document: Document): string {
    const deptName = (document as any).creatorDepartmentName || 'MR';
    const locationValue = document.location || 'Unit 1';
    const revNo = document.revisionNo !== undefined ? String(document.revisionNo).padStart(2, '0') : '00';
    const dateOfIssue = this.formatDate(document.dateOfIssue);
    const dateOfRev = this.formatDate(document.dateOfRev || (document.revisionNo > 0 ? document.dateOfIssue : null));
    const dueDate = this.formatDate(document.reviewDueDate);

    return `
      <style>
        #header { padding: 0 !important; margin: 0 !important; }
        .header-container { 
          margin: 0 !important;
          margin-left: 1.3cm !important;
          margin-right: 1cm !important;
          width: calc(100% - 2.3cm) !important;
          padding: 0.5cm 0 0.2cm 0 !important;
          font-family: 'Segoe UI', Calibri, Arial, sans-serif !important; 
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
        }
        .header-table { 
          width: 100%; 
          border-collapse: collapse; 
          border: 1.2pt solid #000; 
          table-layout: fixed; 
        }
        .header-table td { 
          border: 0.7pt solid #000; 
          padding: 3px 6px; 
          font-size: 8.5pt; 
          line-height: normal; 
          color: #000; 
          vertical-align: top; 
          word-wrap: break-word;
        }
        .company-name { 
          text-align: center; 
          font-weight: bold; 
          font-size: 10.5pt; 
          text-transform: uppercase; 
          border-bottom: 1.2pt solid #000 !important; 
          padding: 5px !important; 
          vertical-align: middle !important;
        }
        .label { font-weight: bold; }
      </style>
      <div class="header-container">
        <table class="header-table">
          <tr><td colspan="5" class="company-name">NEELIKON FOOD DYES AND CHEMICALS LIMITED</td></tr>
          <tr>
            <td style="width: 20%;"><span class="label">Location:</span> ${locationValue}</td>
            <td style="width: 23%;"><span class="label">Date of Issue:</span> ${dateOfIssue}</td>
            <td style="width: 12%;"><span class="label">Rev. No.:</span> ${revNo}</td>
            <td style="width: 30%;">
              <span class="label">Date of Rev. :</span> ${dateOfRev}<br>
              <span class="label">Due Date:</span> ${dueDate}
            </td>
            <td style="width: 15%;"><span class="label">Page</span> <span class="pageNumber"></span> of <span class="totalPages"></span></td>
          </tr>
          <tr>
            <td style="width: 20%;"><span class="label">Dept.:</span> ${deptName}</td>
            <td colspan="3" style="width: 65%;"><span class="label">Title :</span> ${document.docName}</td>
            <td style="width: 15%;"><span class="label">Doc. No.:</span> ${document.docNumber}</td>
          </tr>
        </table>
      </div>`;
  }

  private getFooterTemplate(document: Document, controlCopyInfo?: ControlCopyInfo): string {
    const preparer = (document as any).preparerName || 'Unknown';
    const approver = (document as any).approverName || 'Pending';
    const issuer = (document as any).issuerName || 'Pending';
    const status = (document.status || "PENDING").toUpperCase();

    let statusContent = `<span class="label">Status:</span> ${status}`;
    if (controlCopyInfo) {
      statusContent = `<span class="label">Controlled Copy</span><br><span style="font-size: 7pt;">(Printed by ${controlCopyInfo.userFullName} on ${controlCopyInfo.date})</span>`;
    }

    return `
      <style>
        #footer { padding: 0 !important; margin: 0 !important; }
        .footer-container { 
          margin: 0 !important;
          margin-left: 1.3cm !important;
          margin-right: 1cm !important;
          width: calc(100% - 2.3cm) !important;
          padding: 0.5cm 0 1cm 0 !important;
          font-family: 'Segoe UI', Arial, sans-serif !important; 
          box-sizing: border-box;
          font-size: 8.5pt;
          -webkit-print-color-adjust: exact;
        }
        .footer-table { width: 100%; border-collapse: collapse; border: 2px solid #000; table-layout: fixed; }
        .footer-table td { padding: 5px 10px; border: 1px solid #000; vertical-align: top; color: #000; }
        .label { font-weight: bold; }
      </style>
      <div class="footer-container">
        <table class="footer-table">
          <tr>
            <td style="width: 20%;"><span class="label">Prepared By:</span> ${preparer}</td>
            <td style="width: 20%;"><span class="label">Approved By:</span> ${approver}</td>
            <td style="width: 20%;"><span class="label">Issued By:</span> ${issuer}</td>
            <td style="width: 40%; text-align: center; vertical-align: middle;">${statusContent}</td>
          </tr>
        </table>
      </div>`;
  }

  async saveUploadedFile(fileBuffer: Buffer, originalName: string, documentId: string): Promise<string> {
    await this.ensureDirectories();
    const fileName = `${documentId}_${Date.now()}_${originalName}`;
    const filePath = path.join(this.uploadsDir, fileName);
    await fs.writeFile(filePath, fileBuffer);
    return `uploads/${fileName}`;
  }

  async extractHeaderFooterFromWord(buffer: Buffer): Promise<{ headerInfo: string; footerInfo: string }> {
    try {
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();

      let headerInfo = "";
      let footerInfo = "";

      // Look for header/footer XML files in the Word document zip
      for (const entry of entries) {
        if (entry.entryName.startsWith("word/header")) {
          const content = zip.readAsText(entry.entryName);
          // Very basic text extraction from XML tags
          const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (text) headerInfo += (headerInfo ? " " : "") + text;
        } else if (entry.entryName.startsWith("word/footer")) {
          const content = zip.readAsText(entry.entryName);
          const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (text) footerInfo += (footerInfo ? " " : "") + text;
        }
      }

      return {
        headerInfo: headerInfo.slice(0, 1000), // Cap length for database storage
        footerInfo: footerInfo.slice(0, 1000)
      };
    } catch (error) {
      console.error("Error extracting header/footer from Word:", error);
      return { headerInfo: "", footerInfo: "" };
    }
  }
}

export const pdfService = new PDFService();
