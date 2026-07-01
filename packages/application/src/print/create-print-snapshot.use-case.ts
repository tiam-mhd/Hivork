import { randomUUID } from 'node:crypto';

import type { PrintOrientationDto } from '@hivork/contracts/core';

import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IExportRateLimiterPort } from '../ports/export-rate-limiter.port.js';
import type {
  IPrintSnapshotStore,
  PrintSnapshotRecord,
} from '../ports/print-snapshot-store.port.js';
import { PRINT_SNAPSHOT_TTL_SECONDS } from '../ports/print-snapshot-store.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { ITenantRepository } from '../ports/tenant.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import type { FilterAst } from '@hivork/contracts/ui';
import type { TenantCustomerListSort } from '../ports/tenant-customer.repository.port.js';
import {
  DEFAULT_PDF_MAX_ROWS,
  fetchAllCustomerExportRows,
  mapCustomerColumnsToPrintHeaders,
  mapCustomersToPrintRows,
  prepareCustomerListExport,
} from '../customers/customer-list-export.helpers.js';
import { hashExportPayload } from '../customers/export-tenant-customers.use-case.js';

export type CreatePrintSnapshotInput = {
  tenantId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  resourceKey: 'customers';
  search?: string;
  filter?: FilterAst;
  sort?: TenantCustomerListSort;
  tags?: string[];
  status?: 'active' | 'suspended';
  defaultBranchId?: string;
  columns?: string[];
  ids?: string[];
  locale?: 'fa-IR' | 'en';
  orientation?: PrintOrientationDto;
  maxRows: number;
  ip?: string;
  userAgent?: string;
  filterHashPayload: unknown;
};

export type CreatePrintSnapshotOutput = {
  token: string;
  expiresAt: Date;
};

export class CreatePrintSnapshotUseCase
  implements UseCase<CreatePrintSnapshotInput, CreatePrintSnapshotOutput>
{
  constructor(
    private readonly repository: ITenantCustomerRepository,
    private readonly tenants: ITenantRepository,
    private readonly snapshotStore: IPrintSnapshotStore,
    private readonly audit: AuditService,
    private readonly rateLimiter: IExportRateLimiterPort,
  ) {}

  async execute(input: CreatePrintSnapshotInput): Promise<CreatePrintSnapshotOutput> {
    await this.rateLimiter.assertWithinLimit(input.actorId);

    const context = await prepareCustomerListExport(
      {
        ...input,
        limitErrorCode: 'PDF_ROW_LIMIT',
      },
      this.repository,
      this.tenants,
    );

    const items = await fetchAllCustomerExportRows(
      input.tenantId,
      context.listOptionsBase,
      input.maxRows,
      this.repository,
    );

    const printColumns = mapCustomerColumnsToPrintHeaders(context.columns, context.locale);
    const printRows = mapCustomersToPrintRows(context.columns, items, context.locale);
    const generatedAt = new Date();
    const expiresAt = new Date(generatedAt.getTime() + PRINT_SNAPSHOT_TTL_SECONDS * 1000);
    const token = randomUUID();

    const record: PrintSnapshotRecord = {
      tenantId: input.tenantId,
      staffId: input.actorId,
      expiresAt,
      payload: {
        resourceKey: 'customers',
        title: context.locale === 'fa-IR' ? 'لیست مشتریان' : 'Customer list',
        locale: context.locale,
        orientation: input.orientation ?? 'portrait',
        tenant: context.tenantBranding,
        generatedAt: generatedAt.toISOString(),
        columns: printColumns,
        rows: printRows,
        rowCount: context.total,
      },
    };

    await this.snapshotStore.save(token, record, PRINT_SNAPSHOT_TTL_SECONDS);

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'export.requested',
      entityType: 'customers',
      entityId: input.tenantId,
      newValue: {
        rowCount: context.total,
        filterHash: hashExportPayload(input.filterHashPayload),
        format: 'print',
        resourceKey: 'customers',
        selectedIds: input.ids?.length ?? 0,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return { token, expiresAt };
  }
}

export { DEFAULT_PDF_MAX_ROWS as PRINT_SNAPSHOT_MAX_ROWS };
