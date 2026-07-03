import { randomUUID } from 'node:crypto';

import { JwtTokenService, PrismaAuditService, PrismaService } from '@hivork/infrastructure';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { issueToken } from './customers/customer-test.helpers.js';
import {
  createHttpClient,
  createIntegrationApp,
  DEFAULT_REDIS_URL,
  hasIntegrationRuntime,
  probeRedis,
  startHttpServer,
  stopHttpServer,
  type HttpRequestInit,
} from './helpers/integration-runtime.helper.js';
import {
  createSaleWithThreeInstallments,
  enablePartialPayments,
  loadPaymentVersions,
  loadSaleInstallments,
  markInstallmentOverdue,
  sumAmountRial,
  type InstallmentRef,
} from './helpers/phase05-seed.helper.js';
import { seedCrossTenantFixtures } from '../../src/test-utils/cross-tenant-seed.helper.js';
import {
  futureDateOnly,
  seedPhase1RbacFixtures,
  type Phase1RbacSeed,
} from '../../src/test-utils/rbac-seed.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const redisAvailable = await probeRedis();
const describeIfRuntime = hasIntegrationRuntime(databaseUrl) && redisAvailable ? describe : describe.skip;

function branchHeaders(branchId: string): HeadersInit {
  return { 'X-Branch-Id': branchId };
}

function asJson<T>(value: unknown): T {
  return value as T;
}

describeIfRuntime('Phase 05 installments advanced vertical slice (IFP-100)', () => {
  const redis = new Redis(DEFAULT_REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  const audit = new PrismaAuditService(prisma);
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let server: Awaited<ReturnType<typeof createIntegrationApp>>['server'];
  let request = createHttpClient('');
  let baseUrl = '';
  let tokens: JwtTokenService;
  let seed: Phase1RbacSeed;
  let ownerToken = '';
  let viewerToken = '';
  let tenantBToken = '';

  beforeAll(async () => {
    await redis.connect();
    const created = await createIntegrationApp();
    app = created.app;
    server = created.server;
    tokens = app.get(JwtTokenService);

    const started = await startHttpServer(server);
    baseUrl = started.baseUrl;
    request = createHttpClient(started.baseUrl);

    seed = await seedPhase1RbacFixtures(prisma, redis);
    const crossTenant = await seedCrossTenantFixtures(prisma, redis);
    ownerToken = await issueToken(tokens, seed.owner);
    viewerToken = await issueToken(tokens, seed.viewer);
    tenantBToken = await issueToken(tokens, crossTenant.tenantB.owner);
  });

  afterAll(async () => {
    if (redis.status === 'ready') {
      await redis.quit();
    }
    await prisma.$disconnect();
    await stopHttpServer(app, server);
  });

  async function requestWithBranch(
    path: string,
    token: string,
    branchId: string,
    init?: HttpRequestInit,
  ) {
    return request(path, {
      ...init,
      token,
      headers: {
        ...branchHeaders(branchId),
        ...(init?.headers ?? {}),
      },
    });
  }

  async function createPhase05Sale(title: string, totalAmountRial = '1500000') {
    return createSaleWithThreeInstallments(request, ownerToken, {
      tenantCustomerId: seed.customerId,
      branchId: seed.branchA.id,
      title,
      totalAmountRial,
    });
  }

  async function recordCashPayment(
    installment: InstallmentRef,
    amountRial: string,
    idempotencyKey?: string,
  ) {
    return requestWithBranch(
      `/v1/installments/${installment.id}/payments/cash`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        idempotencyKey: idempotencyKey ?? randomUUID(),
        body: JSON.stringify({ amountRial }),
      },
    );
  }

  async function confirmPayment(attemptId: string, expectedAttemptVersion: number, expectedInstallmentVersion: number) {
    return requestWithBranch(`/v1/payment-attempts/${attemptId}/confirm`, ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        expectedAttemptVersion,
        expectedInstallmentVersion,
      }),
    });
  }

  async function assertAuditAction(
    tenantId: string,
    action: string,
    entityId: string,
  ): Promise<void> {
    const rows = await audit.find({ tenantId, action, entityId, limit: 10 });
    expect(rows.length).toBeGreaterThan(0);
  }

  it('scenario A: reschedule → record cash → confirm → receipt PDF', async () => {
    const sale = await createPhase05Sale(`Phase05 Scenario A ${Date.now()}`);
    const installment = sale.installments[0]!;

    const reschedule = await requestWithBranch(
      `/v1/installments/${installment.id}/reschedule`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({
          newDueDate: futureDateOnly(60),
          reason: 'تغییر سررسید برای تست عمودی',
          expectedVersion: installment.version,
        }),
      },
    );
    expect(reschedule.response.status).toBe(200);

    const rescheduled = asJson<{ installment: { version: number } }>(reschedule.body).installment;
    const refreshed = (await loadSaleInstallments(request, ownerToken, sale.saleId))[0]!;

    const recorded = await recordCashPayment(refreshed, refreshed.amountRial);
    expect(recorded.response.status).toBe(201);
    const attemptId = asJson<{ paymentAttempt: { id: string } }>(recorded.body).paymentAttempt.id;

    const versions = await loadPaymentVersions(prisma, attemptId);
    const confirmed = await confirmPayment(
      attemptId,
      versions.attemptVersion,
      versions.installmentVersion,
    );
    expect(confirmed.response.status).toBe(200);
    expect(asJson<{ installment: { status: string } }>(confirmed.body).installment.status).toBe('paid');

    const pdfResponse = await fetch(`${baseUrl}/v1/payment-attempts/${attemptId}/receipt/pdf`, {
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        ...branchHeaders(seed.branchA.id),
      },
    });
    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers.get('content-type')).toContain('application/pdf');
    const pdfBytes = await pdfResponse.arrayBuffer();
    expect(pdfBytes.byteLength).toBeGreaterThan(100);

    const paidInstallment = (await loadSaleInstallments(request, ownerToken, sale.saleId))[0]!;
    expect(paidInstallment.status).toBe('paid');

    await assertAuditAction(seed.tenantId, 'installment.reschedule', installment.id);
    await assertAuditAction(seed.tenantId, 'payment.report', attemptId);
    await assertAuditAction(seed.tenantId, 'payment.confirm', attemptId);

    expect(rescheduled.version).toBe(installment.version + 1);
  });

  it('scenario B: merge installments → split → amount conservation', async () => {
    const sale = await createPhase05Sale(`Phase05 Scenario B ${Date.now()}`);
    const beforeMerge = sale.installments;
    const totalBefore = sumAmountRial(beforeMerge);

    const merge = await requestWithBranch(
      `/v1/sales/${sale.saleId}/installments/merge`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({
          installmentIds: [beforeMerge[0]!.id, beforeMerge[1]!.id],
          targetDueDate: futureDateOnly(50),
          reason: 'ادغام اقساط برای تست',
          expectedVersions: {
            [beforeMerge[0]!.id]: beforeMerge[0]!.version,
            [beforeMerge[1]!.id]: beforeMerge[1]!.version,
          },
        }),
      },
    );
    expect(merge.response.status).toBe(200);
    const mergedId = asJson<{ mergedInstallment: { id: string } }>(merge.body).mergedInstallment.id;

    const afterMerge = await loadSaleInstallments(request, ownerToken, sale.saleId);
    expect(sumAmountRial(afterMerge)).toBe(totalBefore);
    expect(afterMerge).toHaveLength(2);

    const merged = afterMerge.find((row) => row.id === mergedId)!;
    const split = await requestWithBranch(
      `/v1/installments/${merged.id}/split`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({
          partCount: 2,
          firstDueDate: futureDateOnly(55),
          intervalDays: 30,
          reason: 'تقسیم قسط ادغام‌شده',
          expectedVersion: merged.version,
        }),
      },
    );
    expect(split.response.status).toBe(200);

    const afterSplit = await loadSaleInstallments(request, ownerToken, sale.saleId);
    expect(afterSplit).toHaveLength(3);
    expect(sumAmountRial(afterSplit)).toBe(totalBefore);
  });

  it('scenario C: overdue → penalty → discount → partial pay → confirm', async () => {
    await enablePartialPayments(prisma, seed.tenantId, seed.owner.id);

    const sale = await createPhase05Sale(`Phase05 Scenario C ${Date.now()}`);
    const target = sale.installments[1]!;
    await markInstallmentOverdue(prisma, target.id, seed.tenantId);

    const overdueRow = (await loadSaleInstallments(request, ownerToken, sale.saleId)).find(
      (row) => row.id === target.id,
    )!;
    expect(overdueRow.status).toBe('overdue');

    const penalty = await requestWithBranch(
      `/v1/installments/${target.id}/penalty`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({
          mode: 'manual',
          amountRial: '100000',
          reason: 'جریمه تأخیر تست',
          expectedVersion: overdueRow.version,
        }),
      },
    );
    expect(penalty.response.status).toBe(200);

    const afterPenalty = (await loadSaleInstallments(request, ownerToken, sale.saleId)).find(
      (row) => row.id === target.id,
    )!;

    const discount = await requestWithBranch(
      `/v1/installments/${target.id}/discount`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({
          discountRial: '50000',
          reason: 'تخفیف تست',
          expectedVersion: afterPenalty.version,
        }),
      },
    );
    expect(discount.response.status).toBe(200);

    const afterDiscount = (await loadSaleInstallments(request, ownerToken, sale.saleId)).find(
      (row) => row.id === target.id,
    )!;
    const partialAmount = (BigInt(afterDiscount.amountRial) / 2n).toString();

    const recorded = await recordCashPayment(afterDiscount, partialAmount);
    expect(recorded.response.status).toBe(201);
    const attemptId = asJson<{ paymentAttempt: { id: string } }>(recorded.body).paymentAttempt.id;

    const versions = await loadPaymentVersions(prisma, attemptId);
    const confirmed = await confirmPayment(
      attemptId,
      versions.attemptVersion,
      versions.installmentVersion,
    );
    expect(confirmed.response.status).toBe(200);

    const afterConfirm = (await loadSaleInstallments(request, ownerToken, sale.saleId)).find(
      (row) => row.id === target.id,
    )!;
    expect(afterConfirm.status).toBe('overdue');
  });

  it('scenario D: waive with pending payment rejection', async () => {
    const sale = await createPhase05Sale(`Phase05 Scenario D ${Date.now()}`);
    const target = sale.installments[2]!;

    const recorded = await recordCashPayment(target, target.amountRial);
    expect(recorded.response.status).toBe(201);
    const attemptId = asJson<{ paymentAttempt: { id: string } }>(recorded.body).paymentAttempt.id;

    const pendingRow = (await loadSaleInstallments(request, ownerToken, sale.saleId)).find(
      (row) => row.id === target.id,
    )!;

    const waived = await requestWithBranch(
      `/v1/installments/${target.id}/waive`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({
          waiveReason: 'بخشودگی با رد پرداخت در انتظار',
          expectedVersion: pendingRow.version,
          rejectPendingPayments: true,
        }),
      },
    );
    expect(waived.response.status).toBe(200);

    const body = asJson<{ installment: { status: string }; rejectedPaymentAttemptIds: string[] }>(
      waived.body,
    );
    expect(body.installment.status).toBe('waived');
    expect(body.rejectedPaymentAttemptIds).toContain(attemptId);

    const attempt = await prisma.paymentAttempt.findFirstOrThrow({ where: { id: attemptId } });
    expect(attempt.status).toBe('REJECTED');
  });

  it('scenario E: confirm → void → installment reverted', async () => {
    const sale = await createPhase05Sale(`Phase05 Scenario E ${Date.now()}`);
    const target = sale.installments[0]!;

    const recorded = await recordCashPayment(target, target.amountRial);
    expect(recorded.response.status).toBe(201);
    const attemptId = asJson<{ paymentAttempt: { id: string } }>(recorded.body).paymentAttempt.id;

    let versions = await loadPaymentVersions(prisma, attemptId);
    const confirmed = await confirmPayment(
      attemptId,
      versions.attemptVersion,
      versions.installmentVersion,
    );
    expect(confirmed.response.status).toBe(200);

    const paidRow = (await loadSaleInstallments(request, ownerToken, sale.saleId)).find(
      (row) => row.id === target.id,
    )!;
    expect(paidRow.status).toBe('paid');

    versions = await loadPaymentVersions(prisma, attemptId);
    const voided = await requestWithBranch(
      `/v1/payment-attempts/${attemptId}/void`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({
          voidReason: 'ابطال پرداخت برای تست',
          expectedAttemptVersion: versions.attemptVersion,
          expectedInstallmentVersion: versions.installmentVersion,
        }),
      },
    );
    expect(voided.response.status).toBe(200);
    expect(asJson<{ paymentAttempt: { status: string } }>(voided.body).paymentAttempt.status).toBe(
      'voided',
    );

    const reverted = (await loadSaleInstallments(request, ownerToken, sale.saleId)).find(
      (row) => row.id === target.id,
    )!;
    expect(reverted.status).toBe('pending');
  });

  it('rbac: deny sensitive endpoints without permission (viewer)', async () => {
    const sale = await createPhase05Sale(`Phase05 RBAC ${Date.now()}`);
    const installment = sale.installments[0]!;

    const denyCases: Array<{ path: string; method: 'POST' | 'GET'; body?: unknown }> = [
      {
        path: `/v1/installments/${installment.id}/reschedule`,
        method: 'POST',
        body: {
          newDueDate: futureDateOnly(70),
          reason: 'تلاش بدون مجوز',
          expectedVersion: installment.version,
        },
      },
      {
        path: `/v1/installments/${installment.id}/payments/cash`,
        method: 'POST',
        body: { amountRial: installment.amountRial },
      },
      {
        path: `/v1/installments/${installment.id}/waive`,
        method: 'POST',
        body: {
          waiveReason: 'تلاش بدون مجوز',
          expectedVersion: installment.version,
          rejectPendingPayments: true,
        },
      },
      {
        path: `/v1/installments/${installment.id}/penalty`,
        method: 'POST',
        body: {
          mode: 'manual',
          amountRial: '10000',
          reason: 'تلاش بدون مجوز',
          expectedVersion: installment.version,
        },
      },
      {
        path: `/v1/installments/${installment.id}/discount`,
        method: 'POST',
        body: {
          discountRial: '10000',
          reason: 'تلاش بدون مجوز',
          expectedVersion: installment.version,
        },
      },
      {
        path: `/v1/sales/${sale.saleId}/installments/merge`,
        method: 'POST',
        body: {
          installmentIds: [sale.installments[0]!.id, sale.installments[1]!.id],
          targetDueDate: futureDateOnly(80),
          reason: 'تلاش بدون مجوز',
          expectedVersions: {
            [sale.installments[0]!.id]: sale.installments[0]!.version,
            [sale.installments[1]!.id]: sale.installments[1]!.version,
          },
        },
      },
    ];

    for (const denyCase of denyCases) {
      const result = await requestWithBranch(denyCase.path, viewerToken, seed.branchA.id, {
        method: denyCase.method,
        body: denyCase.body ? JSON.stringify(denyCase.body) : undefined,
      });
      expect(result.response.status).toBe(403);
      expect(asJson<{ code: string }>(result.body).code).toBe('PERMISSION_DENIED');
    }
  });

  it('cross-tenant: tenant B cannot access tenant A installment operations', async () => {
    const sale = await createPhase05Sale(`Phase05 CrossTenant ${Date.now()}`);
    const installment = sale.installments[0]!;

    const denied = await requestWithBranch(
      `/v1/installments/${installment.id}/reschedule`,
      tenantBToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({
          newDueDate: futureDateOnly(90),
          reason: 'تلاش cross-tenant',
          expectedVersion: installment.version,
        }),
      },
    );
    expect(denied.response.status).toBe(404);
    expect(asJson<{ code: string }>(denied.body).code).toBe('INSTALLMENT_NOT_FOUND');
  });
});
