import { createHash } from 'node:crypto';
import { PassThrough } from 'node:stream';

import type { FilterAst } from '@hivork/contracts/ui';

import { UseCase } from '../core/use-case.js';
import { mergeInstallmentsSettings } from '../installments/settings/merge-installments-settings.js';
import type { AuditService } from '../ports/audit.port.js';
import type {
  ICustomerPdfExportWriter,
  ICustomerXlsxExportWriter,
} from '../ports/customer-export-writer.port.js';
import type { IExportRateLimiterPort } from '../ports/export-rate-limiter.port.js';
import type { ITenantRepository } from '../ports/tenant.repository.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import type {
  ITenantCustomerRepository,
  TenantCustomerListLinkStatusFilter,
  TenantCustomerListSort,
} from '../ports/tenant-customer.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import {
  DEFAULT_PDF_MAX_ROWS,
  fetchAllCustomerExportRows,
  fetchCustomerExportBatch,
  mapCustomerColumnsToPrintHeaders,
  mapCustomersToPrintRows,
  prepareCustomerListExport,
} from './customer-list-export.helpers.js';
import { resolveCustomerExportColumns } from './customer-export.columns.js';

export const DEFAULT_EXPORT_MAX_ROWS = 50_000;

export type ExportTenantCustomersInput = {
  tenantId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  search?: string;
  filter?: FilterAst;
  sort?: TenantCustomerListSort;
  tags?: string[];
  status?: 'active' | 'suspended';
  branchId?: string;
  defaultBranchId?: string;
  categoryId?: string;
  isBlacklisted?: boolean;
  assignedStaffId?: string;
  linkStatus?: TenantCustomerListLinkStatusFilter;
  createdAtFrom?: Date;
  createdAtTo?: Date;
  lastPurchaseAtFrom?: Date;
  lastPurchaseAtTo?: Date;
  includeArchived?: boolean;
  columns?: string[];
  ids?: string[];
  locale?: 'fa-IR' | 'en';
  format?: 'xlsx' | 'pdf';
  maxRows: number;
  pdfMaxRows?: number;
  ip?: string;
  userAgent?: string;
  filterHashPayload: unknown;
};

export type ExportTenantCustomersOutput =
  | {
      format: 'xlsx';
      stream: PassThrough;
      filename: string;
      rowCount: number;
    }
  | {
      format: 'pdf';
      buffer: Buffer;
      filename: string;
      rowCount: number;
    };

export class ExportTenantCustomersUseCase
  implements UseCase<ExportTenantCustomersInput, ExportTenantCustomersOutput>
{
  constructor(
    private readonly repository: ITenantCustomerRepository,
    private readonly tenants: ITenantRepository,
    private readonly settings: ITenantSettingsRepository,
    private readonly xlsxWriter: ICustomerXlsxExportWriter,
    private readonly pdfWriter: ICustomerPdfExportWriter,
    private readonly audit: AuditService,
    private readonly rateLimiter: IExportRateLimiterPort,
  ) {}

  async execute(input: ExportTenantCustomersInput): Promise<ExportTenantCustomersOutput> {
    await this.rateLimiter.assertWithinLimit(input.actorId);

    const format = input.format ?? 'xlsx';
    const isPdf = format === 'pdf';
    const tenantMaxRows = await this.resolveTenantExportMaxRows(input.tenantId);
    const effectiveMaxRows = Math.min(input.maxRows, tenantMaxRows);
    const rowLimit = isPdf ? Math.min(input.pdfMaxRows ?? DEFAULT_PDF_MAX_ROWS, effectiveMaxRows) : effectiveMaxRows;

    const context = await prepareCustomerListExport(
      {
        ...input,
        branchId: input.branchId ?? input.defaultBranchId,
        maxRows: rowLimit,
        limitErrorCode: isPdf ? 'PDF_ROW_LIMIT' : 'EXPORT_LIMIT_EXCEEDED',
      },
      this.repository,
      this.tenants,
    );

    const filename = buildExportFilename(format);

    if (isPdf) {
      const items = await fetchAllCustomerExportRows(
        input.tenantId,
        context.listOptionsBase,
        rowLimit,
        this.repository,
      );

      const printColumns = mapCustomerColumnsToPrintHeaders(context.columns, context.locale);
      const printRows = mapCustomersToPrintRows(context.columns, items, context.locale);

      const buffer = await this.pdfWriter.exportCustomers({
        locale: context.locale,
        tenant: context.tenantBranding,
        generatedAt: new Date(),
        columns: printColumns,
        rows: printRows,
      });

      await this.logExportAudit(input, context.total, 'pdf');

      return {
        format: 'pdf',
        buffer,
        filename,
        rowCount: context.total,
      };
    }

    const columns = resolveCustomerExportColumns(input.columns);
    const { stream } = await this.xlsxWriter.exportCustomers({
      columns,
      maxRows: rowLimit,
      fetchBatch: async (cursor) =>
        this.fetchBatch(input.tenantId, context.listOptionsBase, cursor),
    });

    await this.logExportAudit(input, context.total, 'xlsx');

    return { stream, filename, rowCount: context.total, format: 'xlsx' };
  }

  private async resolveTenantExportMaxRows(tenantId: string): Promise<number> {
    const stored = await this.settings.findByModule(tenantId, 'installments');
    const installments = mergeInstallmentsSettings(stored);
    return installments.customer_export_max_rows;
  }

  private async logExportAudit(
    input: ExportTenantCustomersInput,
    rowCount: number,
    format: 'xlsx' | 'pdf',
  ): Promise<void> {
    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'customer.export',
      entityType: 'tenant_customer',
      entityId: input.tenantId,
      newValue: {
        rowCount,
        filterHash: hashExportPayload(input.filterHashPayload),
        format,
        selectedIds: input.ids?.length ?? 0,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });
  }

  private async fetchBatch(
    tenantId: string,
    listOptions: Parameters<typeof fetchAllCustomerExportRows>[1],
    cursor: string | null,
  ) {
    return fetchCustomerExportBatch(tenantId, listOptions, cursor, this.repository);
  }
}

export function buildExportFilename(format: 'xlsx' | 'pdf' = 'xlsx'): string {
  const date = new Date().toISOString().slice(0, 10);
  const extension = format === 'pdf' ? 'pdf' : 'xlsx';
  return `customers-${date}.${extension}`;
}

/** @deprecated Use `buildExportFilename(format)` */
export function buildLegacyExportFilename(
  resourceKey: string,
  tenantSlug: string,
  format: 'xlsx' | 'pdf' = 'xlsx',
): string {
  const date = new Date().toISOString().slice(0, 10);
  const extension = format === 'pdf' ? 'pdf' : 'xlsx';
  return `${resourceKey}-${tenantSlug}-${date}.${extension}`;
}

export function hashExportPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
