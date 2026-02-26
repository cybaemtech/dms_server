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
          padding: 4px 6px; 
          vertical-align: top; 
          font-size: 7.5pt; 
          word-wrap: break-word;
          overflow: hidden;
        }
        .company-name { 
          text-align: center; 
          font-weight: bold; 
          font-size: 10pt; 
          text-transform: uppercase; 
          padding: 10px !important; 
        }
        .label { font-weight: bold; }
        .value { font-weight: normal; }
      </style>
      <div class="header-container">
        <table class="header-table">
          <tr>
            <td colspan="20" class="company-name">NEELIKON FOOD DYES AND CHEMICALS LIMITED</td>
          </tr>
          <tr>
            <td colspan="3" style="width: 15%;">
              <span class="label">Location:</span> <span class="value">${(document as any).location || '-'}</span>
            </td>
            <td colspan="5" style="width: 25%;">
              <span class="label">Date of Issue:</span> <span class="value">${this.formatDate(document.originalDateOfIssue || document.dateOfIssue)}</span>
            </td>
            <td colspan="3" style="width: 15%;">
              <span class="label">Rev. No.:</span> <span class="value">${document.revisionNo !== undefined ? String(document.revisionNo).padStart(2, '0') : '00'}</span>
            </td>
            <td colspan="6" style="width: 30%;">
              <span class="label">Date of Rev. :</span> <span class="value">${this.formatDate((document as any).dateOfRevision || (document.revisionNo !== undefined && document.revisionNo > 0 ? document.dateOfIssue : null))}</span><br>
              <span class="label">Due Date of Rev.:</span> <span class="value">${this.formatDate(document.reviewDueDate)}</span>
            </td>
            <td colspan="3" style="width: 15%;">
              <span class="label">Page</span> <span class="pageNumber"></span> of <span class="totalPages"></span>
            </td>
          </tr>
          <tr>
            <td colspan="5" style="width: 25%;">
              <span class="label">Dept.:</span> <span class="value">${deptName}</span>
            </td>
            <td colspan="12" style="width: 60%;">
              <span class="label">Title:</span> <span class="value">${document.docName}</span>
            </td>
            <td colspan="3" style="width: 15%;">
              <span class="label">Doc. No.:</span> <span class="value">${document.docNumber}</span>
            </td>
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

    const preparerDisplay = `${preparer} (${preparerId})`;
    const approverDisplay = (approver === 'Pending' || !document.approvedBy) ? 'Pending' : `${approver} (${approverId})`;
    const issuerDisplay = (issuer === 'Pending' || !document.issuedBy) ? 'Pending' : `${issuer} (${issuerId})`;

    const status = document.status ? document.status.toUpperCase() : 'PENDING';

    return `
      <style>
        .footer-container { margin: 0 45px; font-family: 'Segoe UI', Arial, sans-serif; width: 100%; border-top: 1pt solid #000; padding-top: 5px; }
        .footer-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .footer-table td { font-size: 7.5pt; padding: 4px 6px; vertical-align: top; border: 1pt solid #000; }
        .label { font-weight: bold; }
        .value { font-weight: normal; }
      </style>
      <div class="footer-container">
        <table class="footer-table">
          <tr>
            <td style="width: 33.33%;"><span class="label">Prepared By:</span><br><span class="value">${preparerDisplay}</span></td>
            <td style="width: 33.33%;"><span class="label">Approved By:</span><br><span class="value">${approverDisplay}</span></td>
            <td style="width: 33.34%;"><span class="label">Issued By:</span><br><span class="value">${issuerDisplay}</span></td>
          </tr>
          <tr>
            <td colspan="3"><span class="label">Status:</span> <span class="value">${status}</span></td>
          </tr>
          ${controlCopyInfo ? `
          <tr>
            <td colspan="3" style="text-align: center; padding: 10px 6px;">
              <span class="label" style="font-size: 8.5pt; text-transform: uppercase;">Controlled Copy</span><br>
              <span class="value" style="font-size: 8pt;">(Printed by ${controlCopyInfo.userFullName} and ${controlCopyInfo.userId}) / ${controlCopyInfo.date}</span>
            </td>
          </tr>
          ` : ''}
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
        const companyHeader = "NEELIKON FOOD DYES AND CHEMICALS LIMITED";
        p.drawText(companyHeader, { x: 45, y: height - 30, size: 10, font: boldFont });

        // Header Box
        p.drawRectangle({ x: 40, y: height - 145, width: width - 80, height: 105, borderColor: rgb(0, 0, 0), borderWidth: 1 });

        const location = (document as any).location || '-';
        const dateOfIssue = this.formatDate(document.dateOfIssue);
        const revNo = document.revisionNo || 0;
        const dateOfRev = this.formatDate((document as any).dateOfRevision);

        p.drawText(`Location: ${location} | Date of Issue: ${dateOfIssue}`, { x: 45, y: height - 60, size: 8, font });
        p.drawText(`Rev. No.: ${revNo} | Date of Rev.: ${dateOfRev}`, { x: 45, y: height - 75, size: 8, font });

        const dueDate = this.formatDate(document.reviewDueDate);
        p.drawText(`Due Date of Rev.: ${dueDate} | Page: 1 of 1`, { x: 45, y: height - 95, size: 8, font });

        const deptName = (document as any).departmentNames?.[0] || 'Management Representative';
        p.drawText(`Dept.: ${deptName.substring(0, 40)}`, { x: 45, y: height - 115, size: 8, font });
        p.drawText(`Title: ${document.docName.substring(0, 50)}`, { x: 45, y: height - 130, size: 8, font });
        p.drawText(`Doc. No.: ${document.docNumber}`, { x: width - 200, y: height - 130, size: 8, font });
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
