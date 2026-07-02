import type {
  CustomerPaymentListRecord,
  CustomerPaymentScopeFilter,
  CustomerPaymentStatus,
  CustomerPaymentSummaryRecord,
  ICustomerPaymentsRepository,
  ListCustomerPaymentsOptions,
  SummarizeCustomerPaymentsOptions,
} from '@hivork/application';
import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';

type RawPaymentRow = {
  payment_id: string;
  amount_rial: bigint;
  status: string;
  method: string | null;
  confirmed_at: Date | null;
  sort_at: Date;
  installment_number: number;
  sale_title: string | null;
  sale_id: string;
};

const SORT_AT_SQL = Prisma.sql`COALESCE(pa.confirmed_at, pa.rejected_at, pa.created_at)`;

const STATUS_TO_DB: Record<CustomerPaymentStatus, string> = {
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  rejected: 'REJECTED',
};

const STATUS_FROM_DB: Record<string, CustomerPaymentStatus> = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
};

const VALID_METHODS = new Set([
  'manual',
  'cash',
  'bank_transfer',
  'online',
  'pos',
  'check',
]);

function resolveMethod(raw: string | null): string {
  if (raw && VALID_METHODS.has(raw)) {
    return raw;
  }
  return 'manual';
}

function buildScopeSql(scope: CustomerPaymentScopeFilter, saleAlias: string): Prisma.Sql {
  switch (scope.dataScope) {
    case 'all':
      return Prisma.empty;
    case 'branch':
      if (scope.branchIds.length === 0) {
        return Prisma.sql`AND 1 = 0`;
      }
      return Prisma.sql`AND ${Prisma.raw(saleAlias)}.branch_id IN (${Prisma.join(
        scope.branchIds.map((id) => Prisma.sql`${id}::uuid`),
      )})`;
    case 'own':
      return Prisma.sql`AND ${Prisma.raw(saleAlias)}.created_by_staff_id = ${scope.staffId}::uuid`;
  }
}

function buildDateFiltersSql(
  options: Pick<ListCustomerPaymentsOptions, 'occurredFrom' | 'occurredTo'>,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [];

  if (options.occurredFrom) {
    parts.push(Prisma.sql`AND ${SORT_AT_SQL} >= ${options.occurredFrom}`);
  }

  if (options.occurredTo) {
    parts.push(Prisma.sql`AND ${SORT_AT_SQL} <= ${options.occurredTo}`);
  }

  if (parts.length === 0) {
    return Prisma.empty;
  }

  return Prisma.join(parts, ' ');
}

function buildListFiltersSql(
  options: Pick<
    ListCustomerPaymentsOptions,
    'status' | 'occurredFrom' | 'occurredTo' | 'cursor'
  >,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [];

  if (options.status) {
    parts.push(Prisma.sql`AND pa.status = ${STATUS_TO_DB[options.status]}::payment_attempt_status`);
  }

  if (options.occurredFrom) {
    parts.push(Prisma.sql`AND ${SORT_AT_SQL} >= ${options.occurredFrom}`);
  }

  if (options.occurredTo) {
    parts.push(Prisma.sql`AND ${SORT_AT_SQL} <= ${options.occurredTo}`);
  }

  if (options.cursor) {
    parts.push(Prisma.sql`AND (
      ${SORT_AT_SQL} < ${options.cursor.sortAt}
      OR (
        ${SORT_AT_SQL} = ${options.cursor.sortAt}
        AND pa.id < ${options.cursor.id}::uuid
      )
    )`);
  }

  if (parts.length === 0) {
    return Prisma.empty;
  }

  return Prisma.join(parts, ' ');
}

function toRecord(row: RawPaymentRow): CustomerPaymentListRecord {
  return {
    paymentId: row.payment_id,
    amountRial: row.amount_rial,
    status: STATUS_FROM_DB[row.status] ?? 'pending',
    method: resolveMethod(row.method),
    confirmedAt: row.confirmed_at,
    sortAt: row.sort_at,
    installmentNumber: row.installment_number,
    saleTitle: row.sale_title,
    saleId: row.sale_id,
  };
}

@Injectable()
export class CustomerPaymentsQuery implements ICustomerPaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByCustomer(options: ListCustomerPaymentsOptions): Promise<CustomerPaymentListRecord[]> {
    const rows = await this.prisma.$queryRaw<RawPaymentRow[]>`
      SELECT
        pa.id AS payment_id,
        pa.amount_rial,
        pa.status::text AS status,
        pa.metadata->>'paymentMethod' AS method,
        pa.confirmed_at,
        ${SORT_AT_SQL} AS sort_at,
        i.sequence_number AS installment_number,
        s.title AS sale_title,
        s.id AS sale_id
      FROM payment_attempts pa
      INNER JOIN installments i ON i.id = pa.installment_id AND i.deleted_at IS NULL
      INNER JOIN sales s ON s.id = i.sale_id AND s.deleted_at IS NULL
      WHERE pa.tenant_id = ${options.tenantId}::uuid
        AND s.tenant_customer_id = ${options.tenantCustomerId}::uuid
        AND pa.deleted_at IS NULL
        ${buildScopeSql(options.scope, 's')}
        ${buildListFiltersSql(options)}
      ORDER BY sort_at DESC, pa.id DESC
      LIMIT ${options.limit}
    `;

    return rows.map(toRecord);
  }

  async summarizeByCustomer(
    options: SummarizeCustomerPaymentsOptions,
  ): Promise<CustomerPaymentSummaryRecord> {
    const rows = await this.prisma.$queryRaw<
      Array<{ total_paid_rial: bigint | null; pending_count: bigint | null }>
    >`
      SELECT
        COALESCE(SUM(CASE WHEN pa.status = 'CONFIRMED'::payment_attempt_status THEN pa.amount_rial ELSE 0 END), 0) AS total_paid_rial,
        COUNT(*) FILTER (WHERE pa.status = 'PENDING'::payment_attempt_status) AS pending_count
      FROM payment_attempts pa
      INNER JOIN installments i ON i.id = pa.installment_id AND i.deleted_at IS NULL
      INNER JOIN sales s ON s.id = i.sale_id AND s.deleted_at IS NULL
      WHERE pa.tenant_id = ${options.tenantId}::uuid
        AND s.tenant_customer_id = ${options.tenantCustomerId}::uuid
        AND pa.deleted_at IS NULL
        ${buildScopeSql(options.scope, 's')}
        ${buildDateFiltersSql(options)}
    `;

    const row = rows[0];
    return {
      totalPaidRial: row?.total_paid_rial ?? 0n,
      pendingCount: Number(row?.pending_count ?? 0n),
    };
  }
}
