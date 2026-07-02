import type { ExportLocaleDto, TenantBrandingDto } from '@hivork/contracts/core';
import type { FilterAst } from '@hivork/contracts/ui';

import { EXPORT_BATCH_SIZE } from '../core/export/export.service.js';
import type { ExportColumnDef } from '../core/export/export.service.js';
import { formatPrintDateCell } from '../core/export/render-print-layout-html.js';
import { ApplicationError } from '../errors/application.error.js';
import type { ITenantRepository } from '../ports/tenant.repository.port.js';
import type {
  ITenantCustomerRepository,
  ListActiveTenantCustomersOptions,
  TenantCustomerListItem,
  TenantCustomerListLinkStatusFilter,
  TenantCustomerListSort,
} from '../ports/tenant-customer.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { buildCustomerListWhere, isCustomerSearchActionable } from './customer-list-query.config.js';
import { resolveCustomerExportColumns } from './customer-export.columns.js';
import {
  decodeTenantCustomerCursor,
  encodeTenantCustomerCursor,
} from './tenant-customer-cursor.js';

export const DEFAULT_PDF_MAX_ROWS = 500;

const ALLOWED_SORTS: TenantCustomerListSort[] = [
  'createdAt:desc',
  'createdAt:asc',
  'name:asc',
  'name:desc',
  'lastPurchaseAt:desc',
  'lastPurchaseAt:asc',
  'overdueCount:desc',
  'overdueCount:asc',
  'creditScore:desc',
  'creditScore:asc',
  'totalPurchaseRial:desc',
  'totalPurchaseRial:asc',
];

const DATE_COLUMN_IDS = new Set(['lastPurchaseAt', 'createdAt']);

export type CustomerListExportBaseInput = {
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
  locale?: ExportLocaleDto;
  maxRows: number;
  limitErrorCode?: 'EXPORT_LIMIT_EXCEEDED' | 'PDF_ROW_LIMIT';
};

export type CustomerListExportContext = {
  columns: ExportColumnDef<TenantCustomerListItem>[];
  listOptionsBase: Omit<ListActiveTenantCustomersOptions, 'limit' | 'cursor'>;
  total: number;
  tenantSlug: string;
  tenantBranding: TenantBrandingDto;
  locale: ExportLocaleDto;
};

export async function prepareCustomerListExport(
  input: CustomerListExportBaseInput,
  repository: ITenantCustomerRepository,
  tenants: ITenantRepository,
): Promise<CustomerListExportContext> {
  const sort = input.sort ?? 'createdAt:desc';
  if (!ALLOWED_SORTS.includes(sort)) {
    throw new ApplicationError('VALIDATION_ERROR', 'Invalid sort field.', 400);
  }

  const branchId = input.branchId ?? input.defaultBranchId;
  if (branchId) {
    assertBranchDataScope(input.staffContext, branchId);
  }

  if (
    input.staffContext.dataScope === 'branch' &&
    resolveEffectiveBranchIds(input.staffContext).length === 0
  ) {
    throw new ApplicationError('EXPORT_LIMIT_EXCEEDED', 'No rows in scope to export.', 403);
  }

  const columns = resolveCustomerExportColumns(input.columns);
  if (input.columns?.length && columns.length === 0) {
    throw new ApplicationError(
      'EXPORT_COLUMN_INVALID',
      'One or more export columns are invalid.',
      400,
    );
  }

  if (input.search?.trim() && !isCustomerSearchActionable(input.search)) {
    const tenantRecord = await tenants.findById(input.tenantId);
    const tenantDetail = await tenants.findDetailById(input.tenantId);
    return {
      columns,
      listOptionsBase: {
        sort,
        listWhere: { tenantId: input.tenantId, deletedAt: null },
        status: input.status ?? ('active' as const),
        scope: buildScope(input.staffContext, input.actorId),
        includeCount: true,
      },
      total: 0,
      tenantSlug: tenantRecord?.slug ?? 'tenant',
      tenantBranding: {
        name: tenantDetail?.name ?? tenantRecord?.name ?? 'Tenant',
        legalName: tenantDetail?.legalName ?? null,
        taxId: tenantDetail?.taxId ?? null,
        logoUrl: tenantDetail?.logoUrl ?? null,
      },
      locale: input.locale ?? 'fa-IR',
    };
  }

  const listWhere = buildCustomerListWhere({
    tenantId: input.tenantId,
    search: input.search,
    filter: input.filter,
  });

  const scope = buildScope(input.staffContext, input.actorId);
  const listOptionsBase = {
    sort,
    listWhere,
    tags: input.tags?.length ? input.tags : undefined,
    status: input.status ?? ('active' as const),
    branchId,
    categoryId: input.categoryId,
    isBlacklisted: input.isBlacklisted,
    assignedStaffId: input.assignedStaffId,
    linkStatus: input.linkStatus,
    createdAtFrom: input.createdAtFrom,
    createdAtTo: input.createdAtTo,
    lastPurchaseAtFrom: input.lastPurchaseAtFrom,
    lastPurchaseAtTo: input.lastPurchaseAtTo,
    includeArchived: input.includeArchived,
    scope,
    ids: input.ids?.length ? input.ids : undefined,
    includeCount: true,
  };

  const probe = await repository.listActive(input.tenantId, {
    ...listOptionsBase,
    limit: 1,
  });

  if ((probe.total ?? 0) > input.maxRows) {
    const code = input.limitErrorCode ?? 'EXPORT_LIMIT_EXCEEDED';
    const message =
      code === 'PDF_ROW_LIMIT'
        ? `PDF export supports up to ${input.maxRows} rows. Use Excel export or narrow filters.`
        : `Export exceeds maximum of ${input.maxRows} rows. Narrow your filters.`;

    throw new ApplicationError(code, message, 422, {
      total: probe.total ?? 0,
      maxRows: input.maxRows,
    });
  }

  const tenantRecord = await tenants.findById(input.tenantId);
  const tenantDetail = await tenants.findDetailById(input.tenantId);
  const tenantSlug = tenantRecord?.slug ?? 'tenant';

  const tenantBranding: TenantBrandingDto = {
    name: tenantDetail?.name ?? tenantRecord?.name ?? 'Tenant',
    legalName: tenantDetail?.legalName ?? null,
    taxId: tenantDetail?.taxId ?? null,
    logoUrl: tenantDetail?.logoUrl ?? null,
  };

  return {
    columns,
    listOptionsBase,
    total: probe.total ?? 0,
    tenantSlug,
    tenantBranding,
    locale: input.locale ?? 'fa-IR',
  };
}

export async function fetchAllCustomerExportRows(
  tenantId: string,
  listOptionsBase: Omit<ListActiveTenantCustomersOptions, 'limit' | 'cursor'>,
  maxRows: number,
  repository: ITenantCustomerRepository,
): Promise<TenantCustomerListItem[]> {
  const items: TenantCustomerListItem[] = [];
  let cursor: string | null = null;

  do {
    const batch = await fetchCustomerExportBatch(tenantId, listOptionsBase, cursor, repository);
    items.push(...batch.items);
    cursor = batch.nextCursor;
  } while (cursor && items.length < maxRows);

  return items.slice(0, maxRows);
}

export function mapCustomersToPrintRows(
  columns: ExportColumnDef<TenantCustomerListItem>[],
  items: TenantCustomerListItem[],
  locale: ExportLocaleDto,
): string[][] {
  return items.map((item) =>
    columns.map((column) => {
      const raw = column.accessor(item);
      const text =
        raw instanceof Date
          ? raw.toISOString().slice(0, 10)
          : raw === null || raw === undefined
            ? '—'
            : String(raw);

      if (DATE_COLUMN_IDS.has(column.id)) {
        return formatPrintDateCell(text, locale);
      }

      return text;
    }),
  );
}

export function mapCustomerColumnsToPrintHeaders(
  columns: ExportColumnDef<TenantCustomerListItem>[],
  locale: ExportLocaleDto,
): { id: string; header: string }[] {
  return columns.map((column) => ({
    id: column.id,
    header: locale === 'en' && column.headerEn ? column.headerEn : column.header,
  }));
}

export async function fetchCustomerExportBatch(
  tenantId: string,
  listOptions: Omit<ListActiveTenantCustomersOptions, 'limit' | 'cursor'>,
  cursor: string | null,
  repository: ITenantCustomerRepository,
) {
  const sort = listOptions.sort;
  const cursorPayload = cursor ? decodeTenantCustomerCursor(cursor, sort) : undefined;

  const result = await repository.listActive(tenantId, {
    ...listOptions,
    limit: EXPORT_BATCH_SIZE,
    cursor: cursorPayload
      ? {
          id: cursorPayload.id,
          createdAt: cursorPayload.createdAt ? new Date(cursorPayload.createdAt) : undefined,
          name: cursorPayload.name,
          lastPurchaseAt:
            cursorPayload.lastPurchaseAt === undefined
              ? undefined
              : cursorPayload.lastPurchaseAt
                ? new Date(cursorPayload.lastPurchaseAt)
                : null,
          overdueCount: cursorPayload.overdueCount,
          creditScore: cursorPayload.creditScore,
          totalPurchaseRial:
            cursorPayload.totalPurchaseRial !== undefined
              ? BigInt(cursorPayload.totalPurchaseRial)
              : undefined,
        }
      : undefined,
  });

  const lastItem = result.items[result.items.length - 1];
  const nextCursor =
    result.hasMore && lastItem
      ? encodeTenantCustomerCursor(sort, {
          id: lastItem.id,
          createdAt: lastItem.createdAt,
          globalCustomer: lastItem.globalCustomer,
          lastPurchaseAt: lastItem.lastPurchaseAt,
          overdueCount: lastItem.overdueCount,
          creditScore: lastItem.creditScore,
          totalPurchaseRial: lastItem.totalPurchaseRial,
        })
      : null;

  return { items: result.items, nextCursor };
}

function buildScope(staffContext: DataScopeStaffContext, actorId: string) {
  switch (staffContext.dataScope) {
    case 'all':
      return { dataScope: 'all' as const, actorId };
    case 'branch':
      return {
        dataScope: 'branch' as const,
        actorId,
        branchIds: resolveEffectiveBranchIds(staffContext),
      };
    case 'own':
      return { dataScope: 'own' as const, actorId };
  }
}

function assertBranchDataScope(ctx: DataScopeStaffContext, branchId: string): void {
  if (ctx.dataScope === 'all') {
    return;
  }

  const effective = resolveEffectiveBranchIds(ctx);
  if (effective.length > 0 && !effective.includes(branchId)) {
    throw new ApplicationError('BRANCH_NOT_ALLOWED', 'Branch is outside your data scope.', 403);
  }
}
