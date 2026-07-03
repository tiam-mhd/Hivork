import { randomUUID } from 'node:crypto';

import type { PrismaService } from '@hivork/infrastructure';

import { futureDateOnly, type Phase1RbacSeed } from '../../../src/test-utils/rbac-seed.helper.js';
import type { HttpRequestFn } from '../customers/customer-test.helpers.js';
import type { Phase05SaleFixture } from './phase05-seed.helper.js';

export {
  createSaleWithThreeInstallments,
  enablePartialPayments,
  loadPaymentVersions,
  loadSaleInstallments,
  markInstallmentOverdue,
  sumAmountRial,
  type InstallmentRef,
  type Phase05SaleFixture,
} from './phase05-seed.helper.js';

export const SETTLEMENT_PERIOD_FROM = '1405-07-01';
export const SETTLEMENT_PERIOD_TO = '1405-07-31';
export const SETTLEMENT_TRACE_REFERENCE = 'TRACE-PHASE06';

export type SettlementPeriodFixture = {
  saleId: string;
  installmentId: string;
  posEntryId: string;
  posEntryVersion: number;
  onlineEntryId: string;
};

export async function createSaleWithSingleInstallment(
  request: HttpRequestFn,
  token: string,
  input: {
    tenantCustomerId: string;
    branchId: string;
    title: string;
    totalAmountRial: string;
  },
): Promise<Phase05SaleFixture> {
  const created = await request('/v1/sales', {
    method: 'POST',
    token,
    idempotencyKey: randomUUID(),
    body: JSON.stringify({
      tenantCustomerId: input.tenantCustomerId,
      branchId: input.branchId,
      title: input.title,
      totalAmountRial: input.totalAmountRial,
      downPaymentRial: '0',
      installmentCount: 1,
      firstDueDate: futureDateOnly(45),
      contractDate: futureDateOnly(30),
      intervalDays: 30,
    }),
  });

  if (created.response.status !== 201) {
    throw new Error(`Create sale failed: ${JSON.stringify(created.body)}`);
  }

  const body = created.body as {
    data: { id: string; installments: Array<{ id: string; sequenceNumber: number; amountRial: string; status: string; version: number }> };
  };

  return {
    saleId: body.data.id,
    installments: body.data.installments.map((row) => ({
      id: row.id,
      sequenceNumber: row.sequenceNumber,
      amountRial: row.amountRial,
      status: row.status,
      version: row.version,
    })),
  };
}

export async function markCheckDueForTest(
  prisma: PrismaService,
  checkId: string,
  tenantId: string,
): Promise<void> {
  await prisma.check.updateMany({
    where: { id: checkId, tenantId, status: 'REGISTERED' },
    data: { status: 'DUE' },
  });
}

/**
 * Seeds POSTED card/online ledger rows inside the settlement Jalali window (IFP-109/110).
 */
export async function seedSettlementPeriodLedgerEntries(
  prisma: PrismaService,
  seed: Pick<Phase1RbacSeed, 'tenantId' | 'branchA' | 'customerId' | 'owner'>,
): Promise<SettlementPeriodFixture> {
  const occurredAt = new Date('2026-10-07T10:00:00.000Z');

  const sale = await prisma.sale.create({
    data: {
      tenantId: seed.tenantId,
      branchId: seed.branchA.id,
      tenantCustomerId: seed.customerId,
      createdByStaffId: seed.owner.id,
      totalAmountRial: 20_000_000n,
      downPaymentRial: 0n,
      installmentCount: 1,
      firstDueDate: new Date('2026-10-01T12:00:00.000Z'),
      contractDate: new Date('2026-07-01'),
      status: 'ACTIVE',
      createdById: seed.owner.id,
      updatedById: seed.owner.id,
    },
  });

  const installment = await prisma.installment.create({
    data: {
      tenantId: seed.tenantId,
      saleId: sale.id,
      sequenceNumber: 1,
      dueDate: new Date('2026-10-01T12:00:00.000Z'),
      amountRial: 20_000_000n,
      status: 'PENDING',
    },
  });

  const posAmount = 7_000_000n;
  const onlineAmount = 3_000_000n;

  const posAttempt = await prisma.paymentAttempt.create({
    data: {
      tenantId: seed.tenantId,
      installmentId: installment.id,
      amountRial: posAmount,
      status: 'CONFIRMED',
      reportedByType: 'STAFF',
      reportedById: seed.owner.id,
      confirmedByStaffId: seed.owner.id,
      confirmedAt: occurredAt,
      idempotencyKey: randomUUID(),
      metadata: { method: 'pos', traceNumber: SETTLEMENT_TRACE_REFERENCE },
      createdById: seed.owner.id,
      updatedById: seed.owner.id,
    },
  });

  const posEntry = await prisma.paymentLedgerEntry.create({
    data: {
      tenantId: seed.tenantId,
      branchId: seed.branchA.id,
      entryType: 'PAYMENT_IN',
      direction: 'CREDIT',
      amountRial: posAmount,
      status: 'POSTED',
      occurredAt,
      paymentMethod: 'pos',
      saleId: sale.id,
      installmentId: installment.id,
      paymentAttemptId: posAttempt.id,
      createdById: seed.owner.id,
      updatedById: seed.owner.id,
    },
  });

  const onlineEntry = await prisma.paymentLedgerEntry.create({
    data: {
      tenantId: seed.tenantId,
      branchId: seed.branchA.id,
      entryType: 'PAYMENT_IN',
      direction: 'CREDIT',
      amountRial: onlineAmount,
      status: 'POSTED',
      occurredAt,
      paymentMethod: 'online',
      saleId: sale.id,
      installmentId: installment.id,
      metadata: { referenceNumber: 'ONLINE-PHASE06' },
      createdById: seed.owner.id,
      updatedById: seed.owner.id,
    },
  });

  return {
    saleId: sale.id,
    installmentId: installment.id,
    posEntryId: posEntry.id,
    posEntryVersion: posEntry.version,
    onlineEntryId: onlineEntry.id,
  };
}
