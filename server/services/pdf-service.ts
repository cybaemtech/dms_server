import mammoth from "mammoth";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs/promises";
import { type Document } from "@shared/schema";

export interface ControlCopyInfo {
  userId: string;
  userFullName: string;
  controlCopyNumber: number;
  date: string;
}

export class PDFService {
  private uploadsDir = path.join(process.cwd(), "uploads");
  private pdfsDir = path.join(process.cwd(), "pdfs");

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
          "table => table.document-table:fresh"
        ]
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

      const pdfFileName = `${document.docNumber}_v${document.revisionNo}_final_${Date.now()}.pdf`;
      const pdfPath = path.join(this.pdfsDir, pdfFileName);

      const headerHtml = this.getHeaderTemplate(document);
      const footerHtml = this.getFooterTemplate(document, controlCopyInfo);

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '160px', bottom: '180px', left: '45px', right: '45px' },
        displayHeaderFooter: true,
        headerTemplate: headerHtml,
        footerTemplate: `
          <div style="width: 100%; font-size: 8pt; font-family: 'Segoe UI', Arial, sans-serif;">
            <script>
              (function() {
                const pageNum = document.querySelector('.pageNumber');
                const totalPages = document.querySelector('.totalPages');
                if (pageNum && totalPages && pageNum.textContent !== totalPages.textContent) {
                  document.body.style.display = 'none';
                }
              })();
            </script>
            ${footerHtml}
          </div>
        `,
        preferCSSPageSize: true
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
    const issueNo = document.issueNo || '01';
    const revNo = document.revisionNo ?? 0;
    const revDate = document.dateOfIssue ? new Date(document.dateOfIssue).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    const dueDate = document.reviewDueDate ? new Date(document.reviewDueDate).toLocaleDateString('en-GB') : 'N/A';
    const depts = (document as any).departmentNames || [];
    const deptString = depts.length > 0 ? depts.join(', ') : '';

    const preparer = (document as any).preparerName || (document as any).creatorData?.fullName || '';
    const approver = (document as any).approverName || (document as any).approverData?.fullName || 'Pending';
    const issuer = (document as any).issuerName || (document as any).issuerData?.fullName || 'Pending';
    const reason = document.reasonForRevision || '';

    // Use stored header/footer info
    const companyHeader = document.headerInfo || "";
    const extraFooter = document.footerInfo || "";

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    @page { size: A4; margin: 160px 45px 160px 45px; }
    body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; margin: 0; padding: 0; color: black; background: white; }
    .content-body { font-size: 11pt; line-height: 1.5; color: black; padding-top: 10px; }
    .content-body h1 { text-align: center; text-decoration: underline; font-size: 14pt; margin-bottom: 25px; font-weight: bold; }
    .document-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .document-table td, .document-table th { border: 1pt solid black; padding: 8px; }
  </style>
</head>
<body>
  <div class="content-body">
    <h1>${document.docName.toUpperCase()}</h1>
    <div class="document-content">
      ${body}
    </div>
    ${document.content ? `<div style="margin-top: 20px;">${document.content}</div>` : ''}
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

    return `
      <style>
        .header-container { margin: 0 45px; font-family: 'Segoe UI', Arial, sans-serif; }
        .header-table { width: 100%; border-collapse: collapse; border: 1pt solid #000; table-layout: fixed; }
        .header-table td { 
          border: 1pt solid #000; 
          padding: 3px 4px; 
          vertical-align: middle; 
          font-size: 7pt; 
          word-wrap: break-word;
          overflow: hidden;
        }
        .company-name { 
          text-align: center; 
          font-weight: bold; 
          font-size: 9pt; 
          text-transform: uppercase; 
          padding: 8px !important; 
        }
        .label { font-weight: bold; }
        .value { font-weight: normal; }
        .center-text { text-align: center; }
      </style>
      <div class="header-container">
        <table class="header-table">
          <tr>
            <td colspan="6" class="company-name">NEELIKON FOOD DYES AND CHEMICALS LIMITED</td>
          </tr>
          <tr>
            <td style="width: 10%;"><span class="label">Issue No:</span><br><span class="value">01</span></td>
            <td style="width: 18%;"><span class="label">Date of Issue:</span><br><span class="value">${this.formatDate(document.dateOfIssue)}</span></td>
            <td style="width: 12%;"><span class="label">Rev. No:</span><br><span class="value">${document.revisionNo || 0}</span></td>
            <td style="width: 15%;"><span class="label">Date of Rev.:</span><br><span class="value">${this.formatDate(document.dateOfRevision)}</span></td>
            <td style="width: 15%;"><span class="label">Due Date:</span><br><span class="value">${this.formatDate(document.reviewDueDate)}</span></td>
            <td style="width: 12%;"><span class="label">Period:</span><br><span class="value">${document.duePeriodYears || '3'}Y</span></td>
          </tr>
          <tr>
            <td colspan="2" style="width: 30%;"><span class="label">Dept.:</span> <span class="value">${deptName}</span></td>
            <td colspan="3" style="width: 48%;"><span class="label">Title:</span> <span class="value">${document.docName}</span></td>
            <td style="width: 12%;"><span class="label">Doc. No:</span><br><span class="value">${document.docNumber}</span></td>
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

      const drawHeader = (p: any) => {
        // Document Name and Number at the top
        p.drawText(`Document Name: ${document.docName.substring(0, 60)} | Document Number: ${document.docNumber.substring(0, 30)}`, { x: 45, y: height - 30, size: 9, font: boldFont });

        // Header Box
        p.drawRectangle({ x: 40, y: height - 135, width: width - 80, height: 95, borderColor: rgb(0, 0, 0), borderWidth: 1 });
        p.drawText(companyHeader.substring(0, 70), { x: 50, y: height - 60, size: 11, font: boldFont });

        p.drawText(`Issue No: ${document.issueNo || '01'} | Revision No: ${document.revisionNo || 0}`, { x: 45, y: height - 85, size: 9, font });

        const dateOfIssue = document.dateOfIssue ? new Date(document.dateOfIssue).toLocaleDateString() : new Date().toLocaleDateString();
        const dueDate = document.reviewDueDate ? new Date(document.reviewDueDate).toLocaleDateString() : 'N/A';

        p.drawText(`Date of Issue: ${dateOfIssue} | Due Date: ${dueDate}`, { x: 45, y: height - 100, size: 9, font });
        p.drawText(`Page: 1 of 1`, { x: 45, y: height - 115, size: 9, font });
      };
      drawHeader(page);
      let y = height - 170;
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      for (const line of lines) {
        if (y < 150) {
          page = pdfDoc.addPage([595.28, 841.89]);
          drawHeader(page);
          y = height - 170;
        }
        // Clean characters for PDF-lib compatibility
        const cleanLine = line.substring(0, 95).replace(/[^\x20-\x7E]/g, " ");
        page.drawText(cleanLine, { x: 50, y, size: 10, font });
        y -= 15;
      }
      const pdfFileName = `${document.docNumber}_v${document.revisionNo}_fallback_${Date.now()}.pdf`;
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
