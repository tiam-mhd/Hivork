import type { IPdfExportPort } from '@hivork/application';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PuppeteerPdfExportService implements IPdfExportPort {
  async htmlToPdf(
    html: string,
    options: { orientation: 'portrait' | 'landscape' },
  ): Promise<Buffer> {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });

      const footerTemplate = `
        <div style="width:100%;font-size:9px;color:#666;font-family:Tahoma,sans-serif;text-align:center;padding:0 12mm;">
          <span>صفحه </span><span class="pageNumber"></span><span> از </span><span class="totalPages"></span>
        </div>`;

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        landscape: options.orientation === 'landscape',
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate,
        margin: {
          top: '12mm',
          bottom: '18mm',
          left: '12mm',
          right: '12mm',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
