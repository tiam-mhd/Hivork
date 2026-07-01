import ExcelJS from 'exceljs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../errors/application.error.js';
import { ImportCustomersExcelUseCase } from './import-customers-excel.use-case.js';

async function buildCustomerImportWorkbook(
  rows: Array<{ phone?: string; name?: string; local_code?: string; notes?: string }>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Customers');
  sheet.addRow(['phone', 'name', 'local_code', 'notes']);

  for (const row of rows) {
    sheet.addRow([row.phone ?? '', row.name ?? '', row.local_code ?? '', row.notes ?? '']);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe('ImportCustomersExcelUseCase', () => {
  const createTenantCustomer = { execute: vi.fn() };
  const idempotency = { find: vi.fn(), store: vi.fn() };
  const audit = { log: vi.fn() };

  const useCase = new ImportCustomersExcelUseCase(
    createTenantCustomer as never,
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
          errorCount: 0,
          idempotencyKey: baseInput.idempotencyKey,
        }),
      }),
    );
    expect(idempotency.store).toHaveBeenCalledOnce();
  });

  it('collects row-level errors and continues processing', async () => {
    createTenantCustomer.execute
      .mockResolvedValueOnce({ customer: { id: 'tc-1' } })
      .mockRejectedValueOnce(
        new ApplicationError('CUSTOMER_EXISTS', 'exists', 409),
      )
      .mockResolvedValueOnce({ customer: { id: 'tc-3' } });

    const fileBuffer = await buildCustomerImportWorkbook([
      { phone: '09121111111', name: 'A' },
      { phone: '09122222222', name: 'B' },
      { phone: '09123333333', name: 'C' },
    ]);

    const result = await useCase.execute({ ...baseInput, fileBuffer });

    expect(result.successCount).toBe(2);
    expect(result.errorCount).toBe(1);
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

  it('returns cached result for duplicate idempotency key', async () => {
    const cached = {
      totalRows: 1,
      successCount: 1,
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

  it('maps plan limit errors per row', async () => {
    createTenantCustomer.execute
      .mockResolvedValueOnce({ customer: { id: 'tc-1' } })
      .mockRejectedValueOnce(new ApplicationError('PLAN_LIMIT', 'limit', 403));

    const fileBuffer = await buildCustomerImportWorkbook([
      { phone: '09121111111', name: 'A' },
      { phone: '09122222222', name: 'B' },
    ]);

    const result = await useCase.execute({ ...baseInput, fileBuffer });

    expect(result.successCount).toBe(1);
    expect(result.errors).toEqual([
      {
        row: 3,
        phone: '09122222222',
        error: 'TENANT_PLAN_LIMIT_EXCEEDED',
      },
    ]);
  });
});
