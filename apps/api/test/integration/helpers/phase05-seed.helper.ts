import type { PrismaService } from '@hivork/infrastructure';

import { futureDateOnly } from '../../../src/test-utils/rbac-seed.helper.js';
import { markInstallmentOverdueForTest } from '../../../src/test-utils/overdue-test.helper.js';
import type { HttpRequestFn } from '../customers/customer-test.helpers.js';

export type InstallmentRef = {
  id: string;
  sequenceNumber: number;
  amountRial: string;
  status: string;
  version: number;
};

export type Phase05SaleFixture = {
  saleId: string;
  installments: InstallmentRef[];
};

type SaleDetailResponse = {
  data: {
    id: string;
    installments: InstallmentRef[];
  };
};

export function sumAmountRial(installments: Array<{ amountRial: string }>): bigint {
  return installments.reduce((total, row) => total + BigInt(row.amountRial), 0n);
}

export async function createSaleWithThreeInstallments(
  request: HttpRequestFn,
  token: string,
  input: {
    tenantCustomerId: string;
    branchId: string;
    title: string;
    totalAmountRial?: string;
  },
): Promise<Phase05SaleFixture> {
  const created = await request('/v1/sales', {
    method: 'POST',
    token,
    idempotencyKey: crypto.randomUUID(),
    body: JSON.stringify({
      tenantCustomerId: input.tenantCustomerId,
      branchId: input.branchId,
      title: input.title,
      totalAmountRial: input.totalAmountRial ?? '1500000',
      downPaymentRial: '0',
      installmentCount: 3,
      firstDueDate: futureDateOnly(45),
      contractDate: futureDateOnly(30),
      intervalDays: 30,
    }),
  });

  if (created.response.status !== 201) {
    throw new Error(`Create sale failed: ${JSON.stringify(created.body)}`);
  }

  const body = created.body as SaleDetailResponse;
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

export async function loadSaleInstallments(
  request: HttpRequestFn,
  token: string,
  saleId: string,
): Promise<InstallmentRef[]> {
  const detail = await request(`/v1/sales/${saleId}`, { token });
  if (detail.response.status !== 200) {
    throw new Error(`Load sale failed: ${JSON.stringify(detail.body)}`);
  }

  const body = detail.body as SaleDetailResponse;
  return body.data.installments.map((row) => ({
    id: row.id,
    sequenceNumber: row.sequenceNumber,
    amountRial: row.amountRial,
    status: row.status,
    version: row.version,
  }));
}

export async function markInstallmentOverdue(
  prisma: PrismaService,
  installmentId: string,
  tenantId: string,
  daysAgo = 7,
): Promise<void> {
  await markInstallmentOverdueForTest(prisma, installmentId, tenantId, daysAgo);
}

export async function enablePartialPayments(
  prisma: PrismaService,
  tenantId: string,
  staffId: string,
): Promise<void> {
  await prisma.tenantSetting.upsert({
    where: {
      tenantId_module_key: {
        tenantId,
        module: 'installments',
        key: 'payment_allow_partial',
      },
    },
    create: {
      tenantId,
      module: 'installments',
      key: 'payment_allow_partial',
      value: true,
      createdById: staffId,
      updatedById: staffId,
    },
    update: {
      value: true,
      updatedById: staffId,
    },
  });
}

export async function loadPaymentVersions(
  prisma: PrismaService,
  attemptId: string,
): Promise<{ attemptVersion: number; installmentVersion: number; installmentId: string }> {
  const attempt = await prisma.paymentAttempt.findFirstOrThrow({
    where: { id: attemptId },
    select: { version: true, installmentId: true },
  });
  const installment = await prisma.installment.findFirstOrThrow({
    where: { id: attempt.installmentId },
    select: { version: true },
  });

  return {
    attemptVersion: attempt.version,
    installmentVersion: installment.version,
    installmentId: attempt.installmentId,
  };
}
