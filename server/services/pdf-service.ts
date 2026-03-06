import mammoth from "mammoth";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs/promises";
import { type Document } from "@shared/schema";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// If we are in dist, the current directory IS our base, otherwise use project root
const baseDir = __dirname.includes('dist') ? __dirname : process.cwd();

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

  async convertWordToPDF(
    wordFilePath: string,
    document: Document,
    controlCopyInfo?: ControlCopyInfo
  ): Promise<string> {
    try {
      console.log(`[PDF] Attempting Puppeteer PDF for: ${document.docNumber}`);
      return await this.convertWordToPDFWithPuppeteer(wordFilePath, document, controlCopyInfo);
    } catch (err: any) {
      console.error(`[PDF] Puppeteer failed: ${err.message}. Switching to Professional Fallback...`);
      return await this.convertWordToPDFAlternative(wordFilePath, document, controlCopyInfo);
    }
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
  }

  private async convertWordToPDFWithPuppeteer(
    wordFilePath: string,
    document: Document,
    controlCopyInfo?: ControlCopyInfo
  ): Promise<string> {
    let browser;
    try {
      await fs.access(wordFilePath);
      const wordBuffer = await fs.readFile(wordFilePath);

      const options = {
        styleMap: [
          "p[style-name='Header'] => h1:fresh",
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
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
      };

      const result = await mammoth.convertToHtml({ buffer: wordBuffer }, options);
      const htmlContent = result.value || '';
      const fullHtml = this.wrapWithHeavyDutyTheme(document, htmlContent, controlCopyInfo);

      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--font-render-hinting=none'
        ]
      });

      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 30000 });

      // Extract real page count after content is rendered
      const pageCount = await page.evaluate(() => {
        // This is a rough estimate or we can use the footer/header injection result
        // For puppeteer, the actual page count is determined during pdf generation
        return 0; // Placeholder, will update document after PDF generation
      });

      const safeDocNumber = this.sanitizeFilename(document.docNumber);
      const pdfFileName = `${safeDocNumber}_v${document.revisionNo}_final_${Date.now()}.pdf`;
      const pdfPath = path.join(this.pdfsDir, pdfFileName);

      const headerHtml = this.getHeaderTemplate(document);
      const footerHtml = this.getFooterTemplate(document, controlCopyInfo);

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '160px', bottom: '120px', left: '45px', right: '45px' },
        displayHeaderFooter: true,
        headerTemplate: headerHtml,
        footerTemplate: footerHtml,
      });

      await fs.writeFile(pdfPath, pdfBuffer);

      // Now we can get the actual page count from the PDF buffer if needed,
      // but Puppeteer doesn't easily expose it here.
      // However, we can use a library or just accept that it's dynamic.

      return pdfPath;
    } finally {
      if (browser) await browser.close();
    }
  }

  private wrapWithHeavyDutyTheme(document: Document, body: string, controlCopyInfo?: ControlCopyInfo): string {

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 160px 45px 120px 45px; 
    }
    body { 
      font-family: 'Segoe UI', Calibri, Arial, sans-serif; 
      margin: 0; 
      padding: 0; 
      color: black; 
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* Content body - preserve Word formatting */
    .content-body { 
      font-size: 11pt; 
      line-height: 1.6; 
      color: black; 
      padding-top: 5px;
      width: 100%;
    }
    .content-body h1 { font-size: 14pt; margin: 15px 0 10px 0; font-weight: bold; }
    .content-body h2 { font-size: 13pt; margin: 12px 0 8px 0; font-weight: bold; }
    .content-body h3 { font-size: 12pt; margin: 10px 0 6px 0; font-weight: bold; }
    .content-body p { margin: 4px 0; text-align: justify; }
    .content-body p:empty { margin: 8px 0; }
    
    /* Preserve list formatting */
    .content-body ol, .content-body ul { margin: 6px 0 6px 20px; padding-left: 15px; }
    .content-body li { margin: 3px 0; line-height: 1.5; }
    .content-body p.list-paragraph { margin-left: 20px; }
    
    /* Preserve inline formatting */
    .content-body strong, .content-body b { font-weight: bold; }
    .content-body em, .content-body i { font-style: italic; }
    .content-body span.underline { text-decoration: underline; }
    .content-body sub { vertical-align: sub; font-size: 0.8em; }
    .content-body sup { vertical-align: super; font-size: 0.8em; }
    
    /* Preserve table formatting from Word */
    .document-table { width: 100%; border-collapse: collapse; margin: 10px 0; page-break-inside: auto; }
    .document-table tr { page-break-inside: avoid; page-break-after: auto; }
    .document-table td, .document-table th { 
      border: 1pt solid black; 
      padding: 5px 8px; 
      font-size: 10pt; 
      line-height: 1.4;
      vertical-align: top;
      text-align: left;
    }
    .document-table th { font-weight: bold; background-color: #f2f2f2; }
    
    /* Preserve images */
    .content-body img { max-width: 100%; height: auto; margin: 8px 0; }
    
    /* Preserve any inline styles from Word */
    .content-body [style] { /* allow inline styles to pass through */ }
  </style>
</head>
<body>
  <div class="content-body">
    <div class="document-content">
      ${body}
    </div>
    ${document.content ? `<div style="margin-top: 15px;">${document.content}</div>` : ''}
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
    const deptName = (document as any).departmentNames?.[0] || 'Management Representative';
    const location = (document as any).location || '';
    const revNo = document.revisionNo !== undefined ? String(document.revisionNo).padStart(2, '0') : '00';
    const dateOfIssue = this.formatDate(document.originalDateOfIssue || document.dateOfIssue);
    const dateOfRev = this.formatDate(document.dateOfRev || (document.revisionNo !== undefined && document.revisionNo > 0 ? document.dateOfIssue : null));
    const dueDate = this.formatDate(document.reviewDueDate);

    return `
      <style>
        .header-container {
          margin: 0 45px;
          font-family: 'Segoe UI', Calibri, Arial, sans-serif;
          width: calc(100% - 90px);
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.2pt solid #000;
        }
        .header-table td {
          border: 1pt solid #000;
          padding: 4px 5px;
          vertical-align: middle;
          font-size: 7.2pt;
          line-height: 1.2;
          overflow: hidden;
        }
        .company-name {
          text-align: center;
          font-weight: bold;
          font-size: 10pt;
          text-transform: uppercase;
          padding: 7px 5px !important;
          border-bottom: 1.2pt solid #000 !important;
          letter-spacing: 0.2px;
        }
        .label { font-weight: bold; color: #000; }
        .value { font-weight: normal; color: #000; }
        .nested-table { width: 100%; border: none !important; border-collapse: collapse; margin: 0; padding: 0; }
        .nested-table td { border: none !important; padding: 0 !important; font-size: 7.2pt !important; line-height: 1.4 !important; }
      </style>
      <div class="header-container">
        <table class="header-table">
          <colgroup>
            <col style="width: 18%;">
            <col style="width: 20%;">
            <col style="width: 12%;">
            <col style="width: 35%;">
            <col style="width: 15%;">
          </colgroup>
          <tr>
            <td colspan="5" class="company-name">NEELIKON FOOD DYES AND CHEMICALS LIMITED</td>
          </tr>
          <tr>
            <td style="white-space: normal;"><span class="label">Location:</span> <span class="value">${location}</span></td>
            <td><span class="label">Date of Issue:</span> <span class="value">${dateOfIssue}</span></td>
            <td><span class="label">Rev. No.:</span> <span class="value">${revNo}</span></td>
            <td style="white-space: normal; padding: 2px 5px;">
              <table class="nested-table">
                <tr>
                  <td style="width: 58%;"><span class="label">Date of Rev.</span></td>
                  <td><span class="label">:</span> <span class="value">${dateOfRev}</span></td>
                </tr>
                <tr>
                  <td><span class="label">Due Date of Rev.</span></td>
                  <td><span class="label">:</span> <span class="value">${dueDate}</span></td>
                </tr>
              </table>
            </td>
            <td><span class="label">Page</span> <span class="pageNumber"></span> <span class="label">of</span> <span class="totalPages"></span></td>
          </tr>
          <tr>
            <td style="white-space: normal;"><span class="label">Dept.:</span> <span class="value">${deptName}</span></td>
            <td colspan="3" style="white-space: normal;"><span class="label">Title:</span> <span class="value">${document.docName}</span></td>
            <td style="white-space: normal;"><span class="label">Doc. No.:</span> <span class="value">${document.docNumber}</span></td>
          </tr>
        </table>
      </div>
    `;
  }
  private getFooterTemplate(document: Document, controlCopyInfo?: ControlCopyInfo): string {
    const preparer = (document as any).preparerName || (document as any).creatorData?.fullName || 'Unknown';
    const approver = (document as any).approverName || (document as any).approverData?.fullName || 'Pending';
    const issuer = (document as any).issuerName || (document as any).issuerData?.fullName || 'Pending';

    const preparerId = document.preparedBy || '-';
    const approverId = document.approvedBy || '-';
    const issuerId = document.issuedBy || '-';

    const status = document.status ? document.status.toUpperCase() : 'PENDING';

    let statusContent = `<span class="footer-label">Status</span><span class="footer-value">${status}</span>`;
    if (controlCopyInfo) {
      statusContent = `<span class="footer-label">Status</span><span class="footer-value">Controlled Copy</span><br><span class="footer-value" style="font-size: 6.5pt;">(Printed by ${controlCopyInfo.userFullName} and ${controlCopyInfo.userId}) / ${controlCopyInfo.date}</span>`;
    }

    return `
      <style>
        .footer-container { 
          margin: 0 45px; 
          font-family: 'Segoe UI', Arial, sans-serif; 
          width: calc(100% - 90px);
          font-size: 7.5pt;
        }
        .footer-table { 
          width: 100%; 
          border-collapse: collapse; 
          table-layout: fixed; 
          border: 1.5pt solid #000; 
        }
        .footer-table td { 
          font-size: 7.5pt; 
          padding: 3px 5px; 
          vertical-align: top; 
          border: 1pt solid #000; 
          line-height: 1.3; 
        }
        .footer-label { font-weight: bold; display: block; margin-bottom: 1px; }
        .footer-value { font-weight: normal; }
      </style>
      <div class="footer-container">
        <table class="footer-table">
          <colgroup>
            <col style="width: 20%;">
            <col style="width: 20%;">
            <col style="width: 20%;">
            <col style="width: 40%;">
          </colgroup>
          <tr>
            <td>
              <span class="footer-label">Prepared By:</span>
              <span class="footer-value">(${preparer} and ${preparerId})</span>
            </td>
            <td>
              <span class="footer-label">Approved By:</span>
              <span class="footer-value">${approver === 'Pending' || !document.approvedBy ? 'Pending' : `(${approver} and ${approverId})`}</span>
            </td>
            <td>
              <span class="footer-label">Issued By:</span>
              <span class="footer-value">${issuer === 'Pending' || !document.issuedBy ? 'Pending' : `(${issuer} and ${issuerId})`}</span>
            </td>
            <td style="text-align: center;">${statusContent}</td>
          </tr>
        </table>
      </div>
    `;
  }

  private async convertWordToPDFAlternative(
    wordFilePath: string,
    document: Document,
    controlCopyInfo?: ControlCopyInfo
  ): Promise<string> {
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const wordBuffer = await fs.readFile(wordFilePath);
      const textResult = await mammoth.extractRawText({ buffer: wordBuffer });
      const content = textResult.value || '';

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let page = pdfDoc.addPage([595.28, 841.89]);
      const { width, height } = page.getSize();

      const companyHeader = (document.headerInfo || "").toUpperCase();

      const drawHeader = (p: any, pageNum: number, totalPgs: number) => {
        const companyHeader = "NEELIKON FOOD DYES AND CHEMICALS LIMITED";
        const L = 40;
        const R = width - 40;
        const W = R - L;

        // Vertical Line positions based on col widths: 18, 20, 12, 35, 15
        const col0 = L;
        const col1 = L + W * 0.18;
        const col2 = L + W * 0.38;
        const col3 = L + W * 0.50;
        const col4 = L + W * 0.85;

        const row0Top = height - 20;
        const row0Bot = height - 40;
        const row1Top = row0Bot;
        const row1Bot = height - 75;
        const row2Top = row1Bot;
        const row2Bot = height - 95;

        const borderColor = rgb(0, 0, 0);
        const bw = 1;

        // Outer box
        p.drawRectangle({ x: L, y: row2Bot, width: W, height: row0Top - row2Bot, borderColor, borderWidth: 1.2 });

        // Row lines
        p.drawLine({ start: { x: L, y: row0Bot }, end: { x: R, y: row0Bot }, thickness: 1.2, color: borderColor });
        p.drawLine({ start: { x: L, y: row1Bot }, end: { x: R, y: row1Bot }, thickness: 1.2, color: borderColor });

        // Row 1 vertical lines (5 cells)
        [col1, col2, col3, col4].forEach(cx => {
          p.drawLine({ start: { x: cx, y: row1Top }, end: { x: cx, y: row1Bot }, thickness: bw, color: borderColor });
        });

        // Row 2 vertical lines (3 cells aligned to row 1)
        [col1, col4].forEach(cx => {
          p.drawLine({ start: { x: cx, y: row2Top }, end: { x: cx, y: row2Bot }, thickness: bw, color: borderColor });
        });

        // Company header
        const compW = boldFont.widthOfTextAtSize(companyHeader, 10);
        p.drawText(companyHeader, { x: L + (W - compW) / 2, y: row0Bot + 7, size: 10, font: boldFont });

        const fs1 = 7.2;
        const location = (document as any).location || '';
        const dateOfIssue = this.formatDate(document.originalDateOfIssue || document.dateOfIssue);
        const revNo = document.revisionNo !== undefined ? String(document.revisionNo).padStart(2, '0') : '00';
        const dateOfRev = this.formatDate(document.dateOfRev || (document.revisionNo !== undefined && document.revisionNo > 0 ? document.dateOfIssue : null));
        const dueDate = this.formatDate(document.reviewDueDate);

        // Row 1 content
        const metaY = row1Bot + 15;
        const metaY2 = row1Bot + 5;

        p.drawText('Location:', { x: col0 + 4, y: metaY, font: boldFont, size: fs1 });
        p.drawText(` ${location}`, { x: col0 + 4 + boldFont.widthOfTextAtSize('Location:', fs1), y: metaY, font, size: fs1 });

        p.drawText('Date of Issue:', { x: col1 + 4, y: metaY, font: boldFont, size: fs1 });
        p.drawText(` ${dateOfIssue}`, { x: col1 + 4 + boldFont.widthOfTextAtSize('Date of Issue:', fs1), y: metaY, font, size: fs1 });

        p.drawText('Rev. No.:', { x: col2 + 4, y: metaY, font: boldFont, size: fs1 });
        p.drawText(` ${revNo}`, { x: col2 + 4 + boldFont.widthOfTextAtSize('Rev. No.:', fs1), y: metaY, font, size: fs1 });

        // Rev cell
        const col3W = col4 - col3;
        p.drawText('Date of Rev.', { x: col3 + 4, y: metaY, font: boldFont, size: fs1 });
        p.drawText(':', { x: col3 + col3W * 0.58, y: metaY, font: boldFont, size: fs1 });
        p.drawText(` ${dateOfRev}`, { x: col3 + col3W * 0.58 + boldFont.widthOfTextAtSize(':', fs1), y: metaY, font, size: fs1 });

        p.drawText('Due Date of Rev.', { x: col3 + 4, y: metaY2, font: boldFont, size: fs1 });
        p.drawText(':', { x: col3 + col3W * 0.58, y: metaY2, font: boldFont, size: fs1 });
        p.drawText(` ${dueDate}`, { x: col3 + col3W * 0.58 + boldFont.widthOfTextAtSize(':', fs1), y: metaY2, font, size: fs1 });

        p.drawText(`Page ${pageNum} of ${totalPgs}`, { x: col4 + 4, y: metaY, font: boldFont, size: fs1 });

        // Row 2 content
        const deptName = (document as any).departmentNames?.[0] || 'Management Representative';
        const deptY = row2Bot + 6;

        p.drawText('Dept.:', { x: col0 + 4, y: deptY, font: boldFont, size: fs1 });
        p.drawText(` ${deptName.substring(0, 20)}`, { x: col0 + 4 + boldFont.widthOfTextAtSize('Dept.:', fs1), y: deptY, font, size: fs1 });

        p.drawText('Title:', { x: col1 + 4, y: deptY, font: boldFont, size: fs1 });
        p.drawText(` ${document.docName.substring(0, 50)}`, { x: col1 + 4 + boldFont.widthOfTextAtSize('Title:', fs1), y: deptY, font, size: fs1 });

        p.drawText('Doc. No.:', { x: col4 + 4, y: deptY, font: boldFont, size: fs1 });
        p.drawText(` ${document.docNumber}`, { x: col4 + 4 + boldFont.widthOfTextAtSize('Doc. No.:', fs1), y: deptY, font, size: fs1 });
      };
      drawHeader(page, 1, 1);
      let y = height - 170;
      const lines = content.split('\n').filter(l => l.trim().length > 0);

      // First pass: calculate total pages
      let tempY = y;
      let totalPages = 1;
      for (const line of lines) {
        if (tempY < 150) {
          totalPages++;
          tempY = height - 170;
        }
        tempY -= 15;
      }

      // Re-draw first page header with correct total
      drawHeader(page, 1, totalPages);
      let currentPage = 1;

      for (const line of lines) {
        if (y < 150) {
          page = pdfDoc.addPage([595.28, 841.89]);
          currentPage++;
          drawHeader(page, currentPage, totalPages);
          y = height - 170;
        }
        // Clean characters for PDF-lib compatibility
        const cleanLine = line.substring(0, 95).replace(/[^\x20-\x7E]/g, " ");
        page.drawText(cleanLine, { x: 50, y, size: 10, font });
        y -= 15;
      }
      const safeDocNumber = this.sanitizeFilename(document.docNumber);
      const pdfFileName = `${safeDocNumber}_v${document.revisionNo}_fallback_${Date.now()}.pdf`;
      const pdfPath = path.join(this.pdfsDir, pdfFileName);
      const pdfBytes = await pdfDoc.save();
      await fs.writeFile(pdfPath, pdfBytes);
      return pdfPath;
    } catch (fallbackErr: any) {
      console.error(`[PDF] Fallback engine also failed: ${fallbackErr.message}`);
      throw new Error(`PDF generation failed completely: ${fallbackErr.message}`);
    }
  }

  async saveUploadedFile(fileBuffer: Buffer, originalName: string, documentId: string): Promise<string> {
    await this.ensureDirectories();
    const fileName = `${documentId}_${Date.now()}_${originalName}`;
    const filePath = path.join(this.uploadsDir, fileName);
    await fs.writeFile(filePath, fileBuffer);
    return `uploads/${fileName}`;
  }

  async extractHeaderFooterFromWord(fileBuffer: Buffer): Promise<{ headerInfo: string, footerInfo: string }> {
    return { headerInfo: '', footerInfo: '' };
  }
}
export const pdfService = new PDFService();
