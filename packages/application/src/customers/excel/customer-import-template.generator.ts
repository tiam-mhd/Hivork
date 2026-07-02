import ExcelJS from 'exceljs';

import {
  CUSTOMER_IMPORT_TEMPLATE_HEADERS,
  CUSTOMER_IMPORT_TEMPLATE_VERSION,
} from './customer-import.parser.js';

const TEMPLATE_SAMPLE_ROW = [
  '09121234567',
  'علی رضایی',
  'C-001',
  'ali@example.com',
  '1234567890',
  'vip',
  'vip,regular',
  'خیابان آزادی ۱۲',
  'تهران',
  '09129876543',
  'مریم رضایی',
  '09121112222',
  'یادداشت نمونه',
];

export async function buildCustomerImportTemplateWorkbook(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  (workbook as ExcelJS.Workbook & { custom?: Record<string, string> }).custom = {
    customerImportTemplateVersion: CUSTOMER_IMPORT_TEMPLATE_VERSION,
  };

  const sheet = workbook.addWorksheet('Customers', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.addRow([...CUSTOMER_IMPORT_TEMPLATE_HEADERS]);
  sheet.addRow(TEMPLATE_SAMPLE_ROW);

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle' };

  sheet.columns = CUSTOMER_IMPORT_TEMPLATE_HEADERS.map((header, index) => ({
    header,
    key: header,
    width: index === 1 ? 24 : header.length + 6,
  }));

  return workbook;
}

export async function buildCustomerImportTemplateBuffer(): Promise<Buffer> {
  const workbook = await buildCustomerImportTemplateWorkbook();
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
