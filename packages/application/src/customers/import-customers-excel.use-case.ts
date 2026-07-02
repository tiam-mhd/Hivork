import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type {
  CustomerImportIdempotencyResult,
  ICustomerImportIdempotencyStore,
} from '../ports/customer-import-idempotency.port.js';
import type { ICustomerCategoryReader } from '../ports/customer-category.reader.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { ITenantPlanReader } from '../ports/tenant-plan.reader.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { CreateTenantCustomerUseCase } from './create-tenant-customer.use-case.js';
import { buildCustomerImportErrorReportBuffer } from './excel/customer-import-error-report.js';
import { hashCustomerImportFile } from './excel/customer-import-file-hash.js';
import { parseCustomerImportExcel } from './excel/customer-import.parser.js';
import {
  ImportRowValidator,
  type ImportCustomerRowError,
} from './import-row-validator.js';

export type { ImportCustomerRowError } from './import-row-validator.js';

export type ImportCustomersExcelInput = {
  tenantId: string;
  actorId: string;
  idempotencyKey: string;
  fileBuffer: Buffer;
  defaultBranchId?: string;
  includeErrorFile?: boolean;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type ImportCustomersExcelOutput = CustomerImportIdempotencyResult;

export class ImportCustomersExcelUseCase
  implements UseCase<ImportCustomersExcelInput, ImportCustomersExcelOutput>
{
  private readonly rowValidator: ImportRowValidator;

  constructor(
    private readonly createTenantCustomer: CreateTenantCustomerUseCase,
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly tenantPlans: ITenantPlanReader,
    categories: ICustomerCategoryReader,
    private readonly idempotency: ICustomerImportIdempotencyStore,
    private readonly audit: AuditService,
  ) {
    this.rowValidator = new ImportRowValidator(categories);
  }

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
    await this.assertBatchPlanCapacity(input.tenantId, rows.length);

    const errors: ImportCustomerRowError[] = [];
    const seenPhones = new Set<string>();
    let successCount = 0;
    let planLimitReached = false;

    for (const row of rows) {
      if (planLimitReached) {
        errors.push({
          row: row.rowNumber,
          phone: row.phone,
          error: 'TENANT_PLAN_LIMIT_EXCEEDED',
        });
        continue;
      }

      const validated = await this.rowValidator.validateRow(row, {
        tenantId: input.tenantId,
        seenPhones,
      });

      if (!validated.ok) {
        errors.push(validated.error);
        continue;
      }

      try {
        const created = await this.createTenantCustomer.execute({
          tenantId: input.tenantId,
          actorId: input.actorId,
          defaultBranchId: input.defaultBranchId,
          staffContext: input.staffContext,
          ip: input.ip,
          userAgent: input.userAgent,
          ...validated.value.createInput,
        });

        if (created.restored) {
          successCount += 1;
          continue;
        }

        successCount += 1;
      } catch (error) {
        const mapped = this.mapRowError(error, row.rowNumber, validated.value.normalizedPhone);
        if (!mapped) {
          throw error;
        }

        if (mapped.error === 'TENANT_PLAN_LIMIT_EXCEEDED') {
          planLimitReached = true;
        }

        errors.push(mapped);
      }
    }

    const failedCount = errors.length;
    const result: ImportCustomersExcelOutput = {
      totalRows: rows.length,
      successCount,
      failedCount,
      errorCount: failedCount,
      errors,
      ...(input.includeErrorFile && failedCount > 0
        ? {
            errorFileBase64: (
              await buildCustomerImportErrorReportBuffer(rows, errors)
            ).toString('base64'),
          }
        : {}),
    };

    if (rows.length > 0 && successCount === 0) {
      throw new ApplicationError(
        'CUSTOMER_IMPORT_FAILED',
        'Customer import failed for all rows.',
        422,
        { errors, failedCount },
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
        failedCount: result.failedCount,
        errorCount: result.failedCount,
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

  private async assertBatchPlanCapacity(tenantId: string, rowCount: number): Promise<void> {
    if (rowCount === 0) {
      return;
    }

    const maxCustomers = await this.tenantPlans.getMaxCustomers(tenantId);
    const activeCount = await this.tenantCustomers.countActive(tenantId);
    const remaining = maxCustomers - activeCount;

    if (rowCount > remaining) {
      throw new ApplicationError(
        'PLAN_LIMIT',
        'Import batch exceeds remaining customer capacity for the current plan.',
        403,
        { rowCount, remaining, maxCustomers, activeCount },
      );
    }
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
      case 'INVALID_PHONE':
        return { row: rowNumber, phone, error: 'INVALID_PHONE' };
      case 'VALIDATION_ERROR':
        return {
          row: rowNumber,
          phone,
          error: 'FIELD_REQUIRED',
          message: error.message,
        };
      default:
        return null;
    }
  }
}
