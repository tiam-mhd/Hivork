import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type {
  CashflowMonthAggregate,
  CashflowWindowBounds,
  DashboardReportAggregates,
  DashboardReportScopeFilter,
  DashboardTimeBounds,
  IDashboardReportRepository,
} from '@hivork/application';
import { formatMonthKeyInTimezone } from '@hivork/application';

import { PrismaService } from '../prisma/prisma.service.js';

function buildSaleWhere(
  tenantId: string,
  scope: DashboardReportScopeFilter,
): Prisma.SaleWhereInput {
  return {
    tenantId,
    deletedAt: null,
    ...(scope.branchIds?.length ? { branchId: { in: scope.branchIds } } : {}),
    ...(scope.createdByStaffId ? { createdByStaffId: scope.createdByStaffId } : {}),
  };
}

function sumAmount(value: bigint | null | undefined): bigint {
  return value ?? 0n;
}

@Injectable()
export class PrismaInstallmentReportRepository implements IDashboardReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAggregates(
    tenantId: string,
    scope: DashboardReportScopeFilter,
    bounds: DashboardTimeBounds,
  ): Promise<DashboardReportAggregates> {
    const saleWhere = buildSaleWhere(tenantId, scope);
    const activeSaleWhere: Prisma.SaleWhereInput = {
      ...saleWhere,
      status: 'ACTIVE',
    };

    const installmentBase: Prisma.InstallmentWhereInput = {
      tenantId,
      deletedAt: null,
      sale: activeSaleWhere,
    };

    const [
      todayDue,
      overdue,
      pendingPayments,
      todayCollected,
      monthCollected,
      activeSalesCount,
      overdueCustomers,
    ] = await Promise.all([
      this.prisma.installment.aggregate({
        where: {
          ...installmentBase,
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { gte: bounds.todayFrom, lte: bounds.todayTo },
        },
        _count: { _all: true },
        _sum: { amountRial: true },
      }),
      this.prisma.installment.aggregate({
        where: {
          ...installmentBase,
          status: 'OVERDUE',
        },
        _count: { _all: true },
        _sum: { amountRial: true },
      }),
      this.prisma.paymentAttempt.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          status: 'PENDING',
          installment: installmentBase,
        },
        _count: { _all: true },
      }),
      this.prisma.installment.aggregate({
        where: {
          ...installmentBase,
          status: 'PAID',
          paidAt: { gte: bounds.todayFrom, lte: bounds.todayTo },
        },
        _sum: { amountRial: true },
      }),
      this.prisma.installment.aggregate({
        where: {
          ...installmentBase,
          status: 'PAID',
          paidAt: { gte: bounds.monthFrom, lte: bounds.monthTo },
        },
        _sum: { amountRial: true },
      }),
      this.prisma.sale.count({
        where: {
          ...saleWhere,
          status: 'ACTIVE',
        },
      }),
      this.prisma.installment.findMany({
        where: {
          ...installmentBase,
          status: 'OVERDUE',
        },
        select: {
          sale: {
            select: {
              tenantCustomerId: true,
            },
          },
        },
      }),
    ]);

    const customersWithDebtCount = new Set(
      overdueCustomers.map((row) => row.sale.tenantCustomerId),
    ).size;

    return {
      todayDueCount: todayDue._count._all,
      todayDueAmountRial: sumAmount(todayDue._sum.amountRial),
      overdueCount: overdue._count._all,
      overdueAmountRial: sumAmount(overdue._sum.amountRial),
      pendingPaymentCount: pendingPayments._count._all,
      todayCollectedRial: sumAmount(todayCollected._sum.amountRial),
      thisMonthCollectedRial: sumAmount(monthCollected._sum.amountRial),
      activeSalesCount,
      customersWithDebtCount,
    };
  }

  async getCashflowByMonth(
    tenantId: string,
    scope: DashboardReportScopeFilter,
    bounds: CashflowWindowBounds,
    timezone: string,
  ): Promise<CashflowMonthAggregate[]> {
    const saleWhere = buildSaleWhere(tenantId, scope);
    const activeSaleWhere: Prisma.SaleWhereInput = {
      ...saleWhere,
      status: 'ACTIVE',
    };

    const installments = await this.prisma.installment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { gte: bounds.from, lt: bounds.toExclusive },
        sale: activeSaleWhere,
      },
      select: {
        dueDate: true,
        amountRial: true,
      },
    });

    const buckets = new Map<string, { installmentCount: number; totalRial: bigint }>();

    for (const installment of installments) {
      const month = formatMonthKeyInTimezone(installment.dueDate, timezone);
      const current = buckets.get(month) ?? { installmentCount: 0, totalRial: 0n };
      current.installmentCount += 1;
      current.totalRial += installment.amountRial;
      buckets.set(month, current);
    }

    return [...buckets.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, values]) => ({
        month,
        installmentCount: values.installmentCount,
        totalRial: values.totalRial,
      }));
  }
}
