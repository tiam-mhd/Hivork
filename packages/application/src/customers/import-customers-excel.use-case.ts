import { normalizePhone } from '@hivork/contracts';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type {
  CustomerImportIdempotencyResult,
  ICustomerImportIdempotencyStore,
} from '../ports/customer-import-idempotency.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { CreateTenantCustomerUseCase } from './create-tenant-customer.use-case.js';
import { hashCustomerImportFile } from './excel/customer-import-file-hash.js';
import {
  parseCustomerImportExcel,
  type CustomerImportParsedRow,
} from './excel/customer-import.parser.js';

export type ImportCustomerRowError = {
  row: number;
  phone: string | null;
  error:
    | 'INVALID_PHONE'
    | 'CUSTOMER_PHONE_DUPLICATE_IN_FILE'
    | 'CUSTOMER_ALREADY_EXISTS'
    | 'TENANT_PLAN_LIMIT_EXCEEDED'
    | 'FIELD_REQUIRED';
};

export type ImportCustomersExcelInput = {
  tenantId: string;
  actorId: string;
  idempotencyKey: string;
  fileBuffer: Buffer;
  defaultBranchId?: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type ImportCustomersExcelOutput = CustomerImportIdempotencyResult;

export class ImportCustomersExcelUseCase
  implements UseCase<ImportCustomersExcelInput, ImportCustomersExcelOutput>
{
  constructor(
    private readonly createTenantCustomer: CreateTenantCustomerUseCase,
    private readonly idempotency: ICustomerImportIdempotencyStore,
    private readonly audit: AuditService,
  ) {}

  async execute(input: ImportCustomersExcelInput): Promise<ImportCustomersExcelOutput> {
    const requestHash = hashCustomerImportFile(input.fileBuffer);
    const cached = await this.idempotency.find(input.tenantId, input.idempotencyKey);

    if (cached) {
      if (cached.requestHash !== requestHash) {
        throw new ApplicationError(
          'IDEMPOTENCY_CONFLICT',
          'Idempotency key was already used with a different import file.',
          409,
        );
      }

      return cached.response;
    }

    const { rows } = await parseCustomerImportExcel(input.fileBuffer);
    const errors: ImportCustomerRowError[] = [];
    const seenPhones = new Set<string>();
    let successCount = 0;

    for (const row of rows) {
      const rowError = await this.processRow(row, input, seenPhones);
      if (rowError) {
        errors.push(rowError);
        continue;
      }

      successCount += 1;
    }

    const result: ImportCustomersExcelOutput = {
      totalRows: rows.length,
      successCount,
      errorCount: errors.length,
      errors,
    };

    if (rows.length > 0 && successCount === 0) {
      throw new ApplicationError(
        'CUSTOMER_IMPORT_FAILED',
        'Customer import failed for all rows.',
        422,
        { errors },
      );
    }

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'customer.import',
      entityType: 'tenant_customer',
      entityId: input.tenantId,
      newValue: {
        totalRows: result.totalRows,
        successCount: result.successCount,
        errorCount: result.errorCount,
        idempotencyKey: input.idempotencyKey,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    await this.idempotency.store(
      input.tenantId,
      input.idempotencyKey,
      requestHash,
      result,
    );

    return result;
  }

  private async processRow(
    row: CustomerImportParsedRow,
    input: ImportCustomersExcelInput,
    seenPhones: Set<string>,
  ): Promise<ImportCustomerRowError | null> {
    if (!row.phone) {
      return { row: row.rowNumber, phone: null, error: 'FIELD_REQUIRED' };
    }

    if (!row.name) {
      return { row: row.rowNumber, phone: row.phone, error: 'FIELD_REQUIRED' };
    }

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhone(row.phone);
    } catch {
      return { row: row.rowNumber, phone: row.phone, error: 'INVALID_PHONE' };
    }

    if (seenPhones.has(normalizedPhone)) {
      return {
        row: row.rowNumber,
        phone: normalizedPhone,
        error: 'CUSTOMER_PHONE_DUPLICATE_IN_FILE',
      };
    }

    seenPhones.add(normalizedPhone);

    try {
      await this.createTenantCustomer.execute({
        tenantId: input.tenantId,
        actorId: input.actorId,
        phone: normalizedPhone,
        name: row.name,
        localCode: row.localCode ?? undefined,
        notes: row.notes ?? undefined,
        defaultBranchId: input.defaultBranchId,
        staffContext: input.staffContext,
        ip: input.ip,
        userAgent: input.userAgent,
      });
    } catch (error) {
      const mapped = this.mapRowError(error, row.rowNumber, normalizedPhone);
      if (mapped) {
        return mapped;
      }

      throw error;
    }

    return null;
  }

  private mapRowError(
    error: unknown,
    rowNumber: number,
    phone: string,
  ): ImportCustomerRowError | null {
    if (!(error instanceof ApplicationError)) {
      return null;
    }

    switch (error.code) {
      case 'CUSTOMER_EXISTS':
        return { row: rowNumber, phone, error: 'CUSTOMER_ALREADY_EXISTS' };
      case 'PLAN_LIMIT':
        return { row: rowNumber, phone, error: 'TENANT_PLAN_LIMIT_EXCEEDED' };
      default:
        return null;
    }
  }
}
