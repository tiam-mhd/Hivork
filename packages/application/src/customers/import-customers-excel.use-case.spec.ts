import ExcelJS from 'exceljs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../errors/application.error.js';
import { ImportCustomersExcelUseCase } from './import-customers-excel.use-case.js';
import { CUSTOMER_IMPORT_TEMPLATE_HEADERS } from './excel/customer-import.parser.js';

async function buildCustomerImportWorkbook(
  rows: Array<Record<string, string | undefined>>,
  headers: string[] = [...CUSTOMER_IMPORT_TEMPLATE_HEADERS],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Customers');
  sheet.addRow(headers);

  for (const row of rows) {
    sheet.addRow(headers.map((header) => row[header] ?? ''));
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe('ImportCustomersExcelUseCase', () => {
  const createTenantCustomer = { execute: vi.fn() };
  const tenantCustomers = { countActive: vi.fn() };
  const tenantPlans = { getMaxCustomers: vi.fn() };
  const categories = { resolveBySlugOrName: vi.fn() };
  const idempotency = { find: vi.fn(), store: vi.fn() };
  const audit = { log: vi.fn() };

  const useCase = new ImportCustomersExcelUseCase(
    createTenantCustomer as never,
    tenantCustomers as never,
    tenantPlans as never,
    categories as never,
    idempotency as never,
    audit,
  );

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    activeBranchId: null,
  };

  const baseInput = {
    tenantId: 'tenant-1',
    actorId: 'staff-1',
    idempotencyKey: '00000000-0000-0000-0000-000000000001',
    staffContext,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    idempotency.find.mockResolvedValue(null);
    tenantPlans.getMaxCustomers.mockResolvedValue(10_000);
    tenantCustomers.countActive.mockResolvedValue(0);
    categories.resolveBySlugOrName.mockResolvedValue({ status: 'not_found' });
    createTenantCustomer.execute.mockResolvedValue({
      customer: { id: 'tc-1' },
      globalCustomer: { id: 'global-1' },
      restored: false,
    });
  });

  it('imports valid rows and audits aggregate result', async () => {
    const fileBuffer = await buildCustomerImportWorkbook([
      { phone: '09121111111', name: 'A' },
      { phone: '09122222222', name: 'B' },
    ]);

    const result = await useCase.execute({ ...baseInput, fileBuffer });

    expect(result).toEqual({
      totalRows: 2,
      successCount: 2,
      failedCount: 0,
      errorCount: 0,
      errors: [],
    });
    expect(createTenantCustomer.execute).toHaveBeenCalledTimes(2);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'customer.import',
        newValue: expect.objectContaining({
          totalRows: 2,
          successCount: 2,
          failedCount: 0,
          idempotencyKey: baseInput.idempotencyKey,
        }),
      }),
    );
    expect(idempotency.store).toHaveBeenCalledOnce();
  });

  it('passes enterprise fields to create use case', async () => {
    categories.resolveBySlugOrName.mockResolvedValue({
      status: 'found',
      categoryId: 'cat-1',
    });

    const fileBuffer = await buildCustomerImportWorkbook([
      {
        phone: '09121111111',
        name: 'Enterprise Customer',
        local_code: 'C-1',
        email: 'a@example.com',
        national_id: '1234567890',
        category: 'vip',
        tags: 'gold,vip',
        address_line: 'خیابان ۱',
        city: 'تهران',
        phone2: '09129876543',
        emergency_name: 'Contact',
        emergency_phone: '09127777777',
        notes: 'imported',
      },
    ]);

    await useCase.execute({ ...baseInput, fileBuffer });

    expect(createTenantCustomer.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '09121111111',
        name: 'Enterprise Customer',
        localCode: 'C-1',
        email: 'a@example.com',
        nationalId: '1234567890',
        categoryId: 'cat-1',
        tags: ['gold', 'vip'],
        notes: 'imported',
        addresses: [{ line1: 'خیابان ۱', city: 'تهران', isPrimary: true }],
        contactPhones: [{ phone: '09129876543', isPrimarySecondary: true }],
        emergencyContacts: [
          { name: 'Contact', phone: '09127777777', isPrimary: true },
        ],
      }),
    );
  });

  it('collects row-level errors and continues processing', async () => {
    createTenantCustomer.execute
      .mockResolvedValueOnce({ customer: { id: 'tc-1' }, restored: false })
      .mockRejectedValueOnce(new ApplicationError('CUSTOMER_EXISTS', 'exists', 409))
      .mockResolvedValueOnce({ customer: { id: 'tc-3' }, restored: false });

    const fileBuffer = await buildCustomerImportWorkbook([
      { phone: '09121111111', name: 'A' },
      { phone: '09122222222', name: 'B' },
      { phone: '09123333333', name: 'C' },
    ]);

    const result = await useCase.execute({ ...baseInput, fileBuffer });

    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(1);
    expect(result.errors[0]).toMatchObject({
      row: 3,
      phone: '09122222222',
      error: 'CUSTOMER_ALREADY_EXISTS',
    });
  });

  it('detects duplicate phones within the same file', async () => {
    const fileBuffer = await buildCustomerImportWorkbook([
      { phone: '09121111111', name: 'A' },
      { phone: '09121111111', name: 'B' },
    ]);

    const result = await useCase.execute({ ...baseInput, fileBuffer });

    expect(result.successCount).toBe(1);
    expect(result.errors).toEqual([
      {
        row: 3,
        phone: '09121111111',
        error: 'CUSTOMER_PHONE_DUPLICATE_IN_FILE',
      },
    ]);
  });

  it('fails early when batch exceeds remaining plan capacity', async () => {
    tenantPlans.getMaxCustomers.mockResolvedValue(100);
    tenantCustomers.countActive.mockResolvedValue(99);

    const fileBuffer = await buildCustomerImportWorkbook([
      { phone: '09121111111', name: 'A' },
      { phone: '09122222222', name: 'B' },
    ]);

    await expect(useCase.execute({ ...baseInput, fileBuffer })).rejects.toMatchObject({
      code: 'PLAN_LIMIT',
      httpStatus: 403,
    });
    expect(createTenantCustomer.execute).not.toHaveBeenCalled();
  });

  it('returns cached result for duplicate idempotency key', async () => {
    const cached = {
      totalRows: 1,
      successCount: 1,
      failedCount: 0,
      errorCount: 0,
      errors: [],
    };
    const fileBuffer = await buildCustomerImportWorkbook([
      { phone: '09121111111', name: 'A' },
    ]);

    const crypto = await import('node:crypto');
    const requestHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    idempotency.find.mockResolvedValue({ requestHash, response: cached });

    const result = await useCase.execute({ ...baseInput, fileBuffer });

    expect(result).toEqual(cached);
    expect(createTenantCustomer.execute).not.toHaveBeenCalled();
  });

  it('throws when all rows fail', async () => {
    createTenantCustomer.execute.mockRejectedValue(
      new ApplicationError('CUSTOMER_EXISTS', 'exists', 409),
    );

    const fileBuffer = await buildCustomerImportWorkbook([
      { phone: '09121111111', name: 'A' },
    ]);

    await expect(useCase.execute({ ...baseInput, fileBuffer })).rejects.toMatchObject({
      code: 'CUSTOMER_IMPORT_FAILED',
      httpStatus: 422,
    });
    expect(idempotency.store).not.toHaveBeenCalled();
  });

  it('includes base64 error file when requested', async () => {
    createTenantCustomer.execute
      .mockResolvedValueOnce({ customer: { id: 'tc-1' }, restored: false })
      .mockRejectedValueOnce(new ApplicationError('CUSTOMER_EXISTS', 'exists', 409));

    const fileBuffer = await buildCustomerImportWorkbook([
      { phone: '09121111111', name: 'A' },
      { phone: '09122222222', name: 'B' },
    ]);

    const result = await useCase.execute({
      ...baseInput,
      fileBuffer,
      includeErrorFile: true,
    });

    expect(result.errorFileBase64).toBeTruthy();
    expect(Buffer.from(result.errorFileBase64!, 'base64').length).toBeGreaterThan(0);
  });
});
