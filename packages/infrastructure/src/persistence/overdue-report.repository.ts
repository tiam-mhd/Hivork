import type {
  IOverdueReportRepository,
  OverdueReportListQuery,
  OverdueReportListResult,
  OverdueReportRow,
  OverdueReportSort,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import type { OverdueReportCursorPayload } from '@hivork/application';

type RawOverdueReportRow = {
  customer_id: string;
  display_name: string | null;
  phone: string;
  overdue_count: number;
  total_overdue_rial: bigint;
  oldest_due_date: Date;
  last_payment_at: Date | null;
  bot_linked: boolean;
};

@Injectable()
export class PrismaOverdueReportRepository implements IOverdueReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: OverdueReportListQuery): Promise<OverdueReportListResult> {
    const limit = query.limit + 1;
    const conditions: Prisma.Sql[] = [
      Prisma.sql`tc.tenant_id = ${tenantId}::uuid`,
      Prisma.sql`tc.deleted_at IS NULL`,
      Prisma.sql`gc.deleted_at IS NULL`,
      Prisma.sql`s.deleted_at IS NULL`,
      Prisma.sql`s.status = 'ACTIVE'`,
      Prisma.sql`i.deleted_at IS NULL`,
      Prisma.sql`i.status = 'OVERDUE'`,
    ];

    if (query.scope.branchIds?.length) {
      conditions.push(
        Prisma.sql`s.branch_id IN (${Prisma.join(
          query.scope.branchIds.map((id) => Prisma.sql`${id}::uuid`),
        )})`,
      );
    }

    if (query.scope.createdByStaffId) {
      conditions.push(Prisma.sql`s.created_by_staff_id = ${query.scope.createdByStaffId}::uuid`);
    }

    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(
        Prisma.sql`(gc.name ILIKE ${pattern} OR u.phone LIKE ${query.search})`,
      );
    }

    const havingConditions: Prisma.Sql[] = [];
    if (query.minAmountRial != null) {
      havingConditions.push(Prisma.sql`SUM(i.amount_rial) >= ${query.minAmountRial}`);
    }

    if (query.overdueDaysMin != null && query.overdueDaysMin > 0) {
      const maxDueDate = new Date(
        query.todayStart.getTime() - query.overdueDaysMin * 86_400_000,
      );
      havingConditions.push(Prisma.sql`MIN(i.due_date) <= ${maxDueDate}`);
    }

    if (query.overdueDaysMax != null && query.overdueDaysMax > 0) {
      const minDueDate = new Date(
        query.todayStart.getTime() - query.overdueDaysMax * 86_400_000,
      );
      havingConditions.push(Prisma.sql`MIN(i.due_date) >= ${minDueDate}`);
    }

    const cursor = query.cursor;

    const outerConditions: Prisma.Sql[] = [];
    if (cursor) {
      outerConditions.push(this.buildCursorCondition(query.sort, cursor));
    }

    const orderBy = this.buildOrderBy(query.sort);
    const whereSql =
      conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;
    const havingSql =
      havingConditions.length > 0
        ? Prisma.sql`HAVING ${Prisma.join(havingConditions, ' AND ')}`
        : Prisma.empty;
    const outerWhereSql =
      outerConditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(outerConditions, ' AND ')}`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<RawOverdueReportRow[]>`
      WITH overdue_by_customer AS (
        SELECT
          tc.id AS customer_id,
          gc.name AS display_name,
          u.phone AS phone,
          COUNT(i.id)::int AS overdue_count,
          SUM(i.amount_rial) AS total_overdue_rial,
          MIN(i.due_date) AS oldest_due_date,
          (
            SELECT MAX(inst.paid_at)
            FROM installments inst
            INNER JOIN sales s2 ON s2.id = inst.sale_id
            WHERE s2.tenant_customer_id = tc.id
              AND inst.deleted_at IS NULL
              AND inst.paid_at IS NOT NULL
              AND s2.deleted_at IS NULL
          ) AS last_payment_at,
          EXISTS (
            SELECT 1
            FROM bot_identities bi
            WHERE bi.customer_id = gc.id
              AND bi.deleted_at IS NULL
          ) AS bot_linked
        FROM tenant_customers tc
        INNER JOIN global_customers gc ON gc.id = tc.global_customer_id
        INNER JOIN users u ON u.id = gc.user_id
        INNER JOIN sales s ON s.tenant_customer_id = tc.id
        INNER JOIN installments i ON i.sale_id = s.id
        ${whereSql}
        GROUP BY tc.id, gc.id, gc.name, u.phone
        ${havingSql}
      )
      SELECT *
      FROM overdue_by_customer
      ${outerWhereSql}
      ORDER BY ${orderBy}
      LIMIT ${limit}
    `;

    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit).map((row) => this.toRow(row));

    return { items, hasMore };
  }

  private toRow(row: RawOverdueReportRow): OverdueReportRow {
    return {
      customerId: row.customer_id,
      displayName: row.display_name,
      phone: row.phone,
      overdueCount: row.overdue_count,
      totalOverdueRial: row.total_overdue_rial,
      oldestDueDate: row.oldest_due_date,
      lastPaymentAt: row.last_payment_at,
      botLinked: row.bot_linked,
    };
  }

  private buildOrderBy(sort: OverdueReportSort): Prisma.Sql {
    switch (sort) {
      case 'displayName:asc':
        return Prisma.sql`display_name ASC NULLS LAST, customer_id ASC`;
      case 'overdueDays:desc':
        return Prisma.sql`oldest_due_date ASC, customer_id ASC`;
      case 'totalOverdueRial:desc':
      default:
        return Prisma.sql`total_overdue_rial DESC, customer_id DESC`;
    }
  }

  private buildCursorCondition(
    sort: OverdueReportSort,
    cursor: OverdueReportCursorPayload,
  ): Prisma.Sql {
    switch (sort) {
      case 'displayName:asc':
        return Prisma.sql`(
          COALESCE(display_name, '') > COALESCE(${cursor.displayName ?? ''}, '')
          OR (
            COALESCE(display_name, '') = COALESCE(${cursor.displayName ?? ''}, '')
            AND customer_id > ${cursor.customerId}::uuid
          )
        )`;
      case 'overdueDays:desc':
        return Prisma.sql`(
          oldest_due_date > ${new Date(cursor.oldestDueDate ?? 0)}
          OR (
            oldest_due_date = ${new Date(cursor.oldestDueDate ?? 0)}
            AND customer_id > ${cursor.customerId}::uuid
          )
        )`;
      case 'totalOverdueRial:desc':
      default:
        return Prisma.sql`(
          total_overdue_rial < ${BigInt(cursor.totalOverdueRial ?? '0')}
          OR (
            total_overdue_rial = ${BigInt(cursor.totalOverdueRial ?? '0')}
            AND customer_id < ${cursor.customerId}::uuid
          )
        )`;
    }
  }
}
