import type {
  CustomerContractListRecord,
  CustomerContractScopeFilter,
  CustomerContractStatus,
  ICustomerContractsRepository,
  ListCustomerContractsOptions,
} from '@hivork/application';
import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';

type RawContractRow = {
  sale_id: string;
  title: string | null;
  display_status: string;
  total_amount_rial: bigint;
  paid_amount_rial: bigint;
  installment_count: number;
  contract_date: Date;
  branch_name: string;
  seller_name: string;
  overdue_count: bigint;
};

const DISPLAY_STATUS_SQL = Prisma.sql`
  CASE
    WHEN s.status = 'CANCELLED'::sale_status THEN 'cancelled'
    WHEN s.status = 'COMPLETED'::sale_status THEN 'closed'
    WHEN EXISTS (
      SELECT 1
      FROM installments i
      WHERE i.sale_id = s.id
        AND i.deleted_at IS NULL
        AND i.status = 'OVERDUE'::installment_status
    ) THEN 'overdue'
    ELSE 'active'
  END
`;

const PAID_AMOUNT_SQL = Prisma.sql`(
  SELECT COALESCE(SUM(pa.amount_rial), 0)
  FROM installments i
  INNER JOIN payment_attempts pa
    ON pa.installment_id = i.id
    AND pa.deleted_at IS NULL
    AND pa.status = 'CONFIRMED'::payment_attempt_status
  WHERE i.sale_id = s.id
    AND i.deleted_at IS NULL
)`;

const OVERDUE_COUNT_SQL = Prisma.sql`(
  SELECT COUNT(*)::bigint
  FROM installments i
  WHERE i.sale_id = s.id
    AND i.deleted_at IS NULL
    AND i.status = 'OVERDUE'::installment_status
)`;

const STATUS_FROM_DB: Record<string, CustomerContractStatus> = {
  active: 'active',
  cancelled: 'cancelled',
  closed: 'closed',
  overdue: 'overdue',
};

function buildScopeSql(scope: CustomerContractScopeFilter): Prisma.Sql {
  switch (scope.dataScope) {
    case 'all':
      return Prisma.empty;
    case 'branch':
      if (scope.branchIds.length === 0) {
        return Prisma.sql`AND 1 = 0`;
      }
      return Prisma.sql`AND s.branch_id IN (${Prisma.join(
        scope.branchIds.map((id) => Prisma.sql`${id}::uuid`),
      )})`;
    case 'own':
      return Prisma.sql`AND s.created_by_staff_id = ${scope.staffId}::uuid`;
  }
}

function buildListFiltersSql(
  options: Pick<ListCustomerContractsOptions, 'status' | 'cursor'>,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [];

  if (options.status) {
    parts.push(Prisma.sql`AND (${DISPLAY_STATUS_SQL}) = ${options.status}`);
  }

  if (options.cursor) {
    parts.push(Prisma.sql`AND (
      s.contract_date < ${options.cursor.contractDate}::date
      OR (
        s.contract_date = ${options.cursor.contractDate}::date
        AND s.id < ${options.cursor.id}::uuid
      )
    )`);
  }

  if (parts.length === 0) {
    return Prisma.empty;
  }

  return Prisma.join(parts, ' ');
}

function toRecord(row: RawContractRow): CustomerContractListRecord {
  return {
    saleId: row.sale_id,
    title: row.title,
    status: STATUS_FROM_DB[row.display_status] ?? 'active',
    totalAmountRial: row.total_amount_rial,
    paidAmountRial: row.paid_amount_rial,
    installmentCount: row.installment_count,
    contractDate: row.contract_date,
    branchName: row.branch_name,
    sellerName: row.seller_name,
    overdueCount: Number(row.overdue_count),
  };
}

@Injectable()
export class CustomerContractsQuery implements ICustomerContractsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByCustomer(
    options: ListCustomerContractsOptions,
  ): Promise<CustomerContractListRecord[]> {
    const rows = await this.prisma.$queryRaw<RawContractRow[]>`
      SELECT
        s.id AS sale_id,
        s.title,
        (${DISPLAY_STATUS_SQL})::text AS display_status,
        s.total_amount_rial,
        ${PAID_AMOUNT_SQL} AS paid_amount_rial,
        s.installment_count,
        s.contract_date,
        b.name AS branch_name,
        st.name AS seller_name,
        ${OVERDUE_COUNT_SQL} AS overdue_count
      FROM sales s
      INNER JOIN branches b ON b.id = s.branch_id AND b.deleted_at IS NULL
      INNER JOIN staff st ON st.id = s.created_by_staff_id AND st.deleted_at IS NULL
      WHERE s.tenant_id = ${options.tenantId}::uuid
        AND s.tenant_customer_id = ${options.tenantCustomerId}::uuid
        AND s.deleted_at IS NULL
        ${buildScopeSql(options.scope)}
        ${buildListFiltersSql(options)}
      ORDER BY s.contract_date DESC, s.id DESC
      LIMIT ${options.limit}
    `;

    return rows.map(toRecord);
  }
}
