import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  createSaleWithSingleInstallment,
  createSaleWithThreeInstallments,
  loadPaymentVersions,
  loadSaleInstallments,
  markCheckDueForTest,
  seedSettlementPeriodLedgerEntries,
  SETTLEMENT_PERIOD_FROM,
  SETTLEMENT_PERIOD_TO,
} from './helpers/phase06-seed.helper.js';
import { seedCrossTenantFixtures } from '../../src/test-utils/cross-tenant-seed.helper.js';
import { seedPhase1RbacFixtures, type Phase1RbacSeed } from '../../src/test-utils/rbac-seed.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const redisAvailable = await probeRedis();
const describeIfRuntime = hasIntegrationRuntime(databaseUrl) && redisAvailable ? describe : describe.skip;

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const bankStatementCsv = readFileSync(
  join(fixtureDir, 'fixtures/bank-statement-sample.csv'),
  'utf-8',
);

function branchHeaders(branchId: string): HeadersInit {
  return { 'X-Branch-Id': branchId };
}

function asJson<T>(value: unknown): T {
  return value as T;
}

type PaymentTransactionListItem = {
  id: string;
  entryType: string;
  direction: string;
  amountRial: string;
  status: string;
};

type UnifiedPaymentResponse = {
  paymentAttempt: { id: string; amountRial: string; version: number };
  idempotentReplay?: boolean;
};

describeIfRuntime('Phase 06 payments & checks vertical slice (IFP-118)', () => {
  const redis = new Redis(DEFAULT_REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  const audit = new PrismaAuditService(prisma);
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let server: Awaited<ReturnType<typeof createIntegrationApp>>['server'];
  let request = createHttpClient('');
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

  async function createSale(title: string, totalAmountRial = '30000000') {
    return createSaleWithThreeInstallments(request, ownerToken, {
      tenantCustomerId: seed.customerId,
      branchId: seed.branchA.id,
      title,
      totalAmountRial,
    });
  }

  async function unifiedCashPayment(
    installmentId: string,
    amountRial: string,
    idempotencyKey = randomUUID(),
  ) {
    return requestWithBranch('/v1/payments', ownerToken, seed.branchA.id, {
      method: 'POST',
      idempotencyKey,
      body: JSON.stringify({
        method: 'cash',
        installmentId,
        amountRial,
      }),
    });
  }

  async function confirmPayment(attemptId: string) {
    const versions = await loadPaymentVersions(prisma, attemptId);
    return requestWithBranch(`/v1/payment-attempts/${attemptId}/confirm`, ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        expectedAttemptVersion: versions.attemptVersion,
        expectedInstallmentVersion: versions.installmentVersion,
      }),
    });
  }

  async function listPostedTransactions() {
    const result = await requestWithBranch('/v1/payments/transactions?status=posted', ownerToken, seed.branchA.id);
    expect(result.response.status).toBe(200);
    return asJson<{ items: PaymentTransactionListItem[] }>(result.body).items;
  }

  async function assertAuditAction(tenantId: string, action: string, entityId: string) {
    const rows = await audit.find({ tenantId, action, entityId, limit: 10 });
    expect(rows.length).toBeGreaterThan(0);
  }

  async function postReconcileCsv(settlementId: string, csv: string) {
    const form = new FormData();
    form.append(
      'bankStatementFile',
      new Blob([csv], { type: 'text/csv' }),
      'bank-statement-sample.csv',
    );
    form.append('encoding', 'utf-8');

    return requestWithBranch(
      `/v1/payments/settlements/${settlementId}/reconcile`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: form,
      },
    );
  }

  it('scenario A: unified cash payment → confirm → ledger entry listed', async () => {
    const sale = await createSale(`Phase06 Scenario A ${Date.now()}`);
    const installment = sale.installments[0]!;
    const amountRial = installment.amountRial;

    const reported = await unifiedCashPayment(installment.id, amountRial);
    expect(reported.response.status).toBe(201);
    const attemptId = asJson<UnifiedPaymentResponse>(reported.body).paymentAttempt.id;

    await assertAuditAction(seed.tenantId, 'payment.report', attemptId);

    const confirmed = await confirmPayment(attemptId);
    expect(confirmed.response.status).toBe(200);

    await assertAuditAction(seed.tenantId, 'payment.confirm', attemptId);

    const transactions = await listPostedTransactions();
    const ledgerEntry = transactions.find(
      (row) => row.amountRial === amountRial && row.entryType === 'payment_in' && row.direction === 'credit',
    );
    expect(ledgerEntry).toBeTruthy();
    expect(ledgerEntry!.status).toBe('posted');

    const paid = (await loadSaleInstallments(request, ownerToken, sale.saleId))[0]!;
    expect(paid.status).toBe('paid');
  });

  it('scenario B: full refund → debit entry and installment not paid', async () => {
    const amountRial = '10000000';
    const sale = await createSaleWithSingleInstallment(request, ownerToken, {
      tenantCustomerId: seed.customerId,
      branchId: seed.branchA.id,
      title: `Phase06 Scenario B ${Date.now()}`,
      totalAmountRial: amountRial,
    });
    const installment = sale.installments[0]!;
    expect(installment.amountRial).toBe(amountRial);

    const reported = await unifiedCashPayment(installment.id, amountRial);
    expect(reported.response.status).toBe(201);
    const attemptId = asJson<UnifiedPaymentResponse>(reported.body).paymentAttempt.id;

    const confirmed = await confirmPayment(attemptId);
    expect(confirmed.response.status).toBe(200);

    const transactions = await listPostedTransactions();
    const originalEntry = transactions.find(
      (row) => row.amountRial === amountRial && row.entryType === 'payment_in',
    );
    expect(originalEntry).toBeTruthy();

    const refunded = await requestWithBranch(
      `/v1/payments/transactions/${originalEntry!.id}/refund`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        idempotencyKey: randomUUID(),
        body: JSON.stringify({
          refundAmountRial: amountRial,
          reason: 'استرداد کامل تست عمودی',
          refundMethod: 'original',
        }),
      },
    );
    expect(refunded.response.status).toBe(201);

    const refundBody = asJson<{ refundEntry: PaymentTransactionListItem }>(refunded.body);
    expect(refundBody.refundEntry.entryType).toBe('refund');
    expect(refundBody.refundEntry.direction).toBe('debit');
    expect(refundBody.refundEntry.amountRial).toBe(amountRial);
    expect(refundBody.refundEntry.status).toBe('posted');

    const reverted = (await loadSaleInstallments(request, ownerToken, sale.saleId))[0]!;
    expect(reverted.status).not.toBe('paid');
  });

  it('scenario C: settlement create → close → void blocked (SETTLEMENT_LOCKED)', async () => {
    const settlementSeed = await seedSettlementPeriodLedgerEntries(prisma, seed);

    const created = await requestWithBranch('/v1/payments/settlements', ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        branchId: seed.branchA.id,
        periodFrom: SETTLEMENT_PERIOD_FROM,
        periodTo: SETTLEMENT_PERIOD_TO,
        paymentMethods: ['card', 'online'],
        note: 'تسویه تست عمودی فاز ۰۶',
      }),
    });
    expect(created.response.status).toBe(201);
    const batch = asJson<{ settlement: { id: string; version: number; entryCount: number } }>(
      created.body,
    ).settlement;
    expect(batch.entryCount).toBeGreaterThan(0);

    const closed = await requestWithBranch(
      `/v1/payments/settlements/${batch.id}/close`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({ expectedVersion: batch.version }),
      },
    );
    expect(closed.response.status).toBe(200);

    const voidAttempt = await requestWithBranch(
      `/v1/payments/transactions/${settlementSeed.posEntryId}/void`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({
          voidReason: 'تلاش ابطال پس از تسویه',
          expectedVersion: settlementSeed.posEntryVersion,
        }),
      },
    );
    expect(voidAttempt.response.status).toBe(409);
    expect(asJson<{ code: string }>(voidAttempt.body).code).toBe('SETTLEMENT_LOCKED');
  });

  it('scenario D: reconciliation CSV → resolve discrepancy + audit', async () => {
    await seedSettlementPeriodLedgerEntries(prisma, seed);

    const created = await requestWithBranch('/v1/payments/settlements', ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        branchId: seed.branchA.id,
        periodFrom: SETTLEMENT_PERIOD_FROM,
        periodTo: SETTLEMENT_PERIOD_TO,
        paymentMethods: ['card', 'online'],
      }),
    });
    expect(created.response.status).toBe(201);
    const batch = asJson<{ settlement: { id: string; version: number } }>(created.body).settlement;

    const closed = await requestWithBranch(
      `/v1/payments/settlements/${batch.id}/close`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({ expectedVersion: batch.version }),
      },
    );
    expect(closed.response.status).toBe(200);

    const reconciled = await postReconcileCsv(batch.id, bankStatementCsv);
    expect(reconciled.response.status).toBe(201);
    const reconcileBody = asJson<{
      report: { id: string; discrepancyCount: number };
      discrepancies: Array<{ id: string; discrepancyType: string; status: string; version: number }>;
    }>(reconciled.body);
    expect(reconcileBody.report.discrepancyCount).toBeGreaterThanOrEqual(1);

    const openDiscrepancy =
      reconcileBody.discrepancies.find((row) => row.status === 'open') ??
      reconcileBody.discrepancies[0];
    expect(openDiscrepancy).toBeTruthy();

    const resolved = await requestWithBranch(
      `/v1/payments/reconciliations/discrepancies/${openDiscrepancy!.id}/resolve`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({
          resolveNote: 'مغایرت بانکی در تست عمودی برطرف شد',
          expectedVersion: openDiscrepancy!.version,
        }),
      },
    );
    expect(resolved.response.status).toBe(200);
    expect(asJson<{ discrepancy: { status: string } }>(resolved.body).discrepancy.status).toBe(
      'resolved',
    );

    await assertAuditAction(seed.tenantId, 'reconciliation.resolve', openDiscrepancy!.id);
  });

  it('scenario E: check received → due → collect → ledger', async () => {
    const sale = await createSale(`Phase06 Scenario E ${Date.now()}`);
    const installment = sale.installments[0]!;
    const checkNumber = `RCV-P06-${Date.now()}`;

    const registered = await requestWithBranch('/v1/checks/received', ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        checkNumber,
        bankName: 'ملت',
        amountRial: installment.amountRial,
        dueDate: '1405-12-01',
        drawerName: 'علی احمدی',
        installmentId: installment.id,
      }),
    });
    expect(registered.response.status).toBe(201);
    const check = asJson<{ check: { id: string; status: string } }>(registered.body).check;
    expect(check.status).toBe('registered');

    await markCheckDueForTest(prisma, check.id, seed.tenantId);

    const collected = await requestWithBranch(
      `/v1/checks/${check.id}/collect`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        idempotencyKey: randomUUID(),
        body: JSON.stringify({ confirmInstallment: true }),
      },
    );
    expect(collected.response.status).toBe(200);
    const collectBody = asJson<{
      check: { status: string };
      ledgerEntryId?: string;
      installment?: { status: string };
    }>(collected.body);
    expect(collectBody.check.status).toBe('collected');
    expect(collectBody.ledgerEntryId).toBeTruthy();
    expect(collectBody.installment?.status).toBe('paid');

    const transactions = await listPostedTransactions();
    expect(transactions.some((row) => row.id === collectBody.ledgerEntryId)).toBe(true);
  });

  it('scenario F: check bounce → installment not waived', async () => {
    const sale = await createSale(`Phase06 Scenario F ${Date.now()}`);
    const installment = sale.installments[0]!;
    const checkNumber = `RCV-BOUNCE-P06-${Date.now()}`;

    const recorded = await requestWithBranch(
      `/v1/installments/${installment.id}/payments/check`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({
          amountRial: installment.amountRial,
          checkNumber,
          bankName: 'صادرات',
          dueDate: '1405-12-01',
          drawerName: 'علی احمدی',
        }),
      },
    );
    expect(recorded.response.status).toBe(201);
    const attemptId = asJson<{ paymentAttempt: { id: string } }>(recorded.body).paymentAttempt.id;

    const registered = await requestWithBranch('/v1/checks/received', ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        checkNumber,
        bankName: 'صادرات',
        amountRial: installment.amountRial,
        dueDate: '1405-12-01',
        drawerName: 'علی احمدی',
        installmentId: installment.id,
        paymentAttemptId: attemptId,
      }),
    });
    expect(registered.response.status).toBe(201);
    const checkId = asJson<{ check: { id: string } }>(registered.body).check.id;

    await markCheckDueForTest(prisma, checkId, seed.tenantId);

    const bounced = await requestWithBranch(
      `/v1/checks/${checkId}/bounce`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({ bounceReason: 'موجودی ناکافی — تست عمودی' }),
      },
    );
    expect(bounced.response.status).toBe(200);
    expect(asJson<{ check: { status: string } }>(bounced.body).check.status).toBe('bounced');

    const installmentRow = await prisma.installment.findFirstOrThrow({
      where: { id: installment.id, tenantId: seed.tenantId },
    });
    expect(installmentRow.status).not.toBe('WAIVED');

    const attempt = await prisma.paymentAttempt.findFirstOrThrow({ where: { id: attemptId } });
    expect(['PENDING', 'REJECTED']).toContain(attempt.status);
  });

  it('edge: unified payment idempotency replays same attempt', async () => {
    const sale = await createSale(`Phase06 Idempotency ${Date.now()}`);
    const installment = sale.installments[0]!;
    const idempotencyKey = randomUUID();

    const first = await unifiedCashPayment(installment.id, installment.amountRial, idempotencyKey);
    expect(first.response.status).toBe(201);
    const attemptId = asJson<UnifiedPaymentResponse>(first.body).paymentAttempt.id;

    const second = await unifiedCashPayment(installment.id, installment.amountRial, idempotencyKey);
    expect(second.response.status).toBe(200);
    expect(asJson<UnifiedPaymentResponse>(second.body).paymentAttempt.id).toBe(attemptId);
    expect(asJson<UnifiedPaymentResponse>(second.body).idempotentReplay).toBe(true);
  });

  it('edge: duplicate collect returns 409', async () => {
    const checkNumber = `RCV-DUP-COLLECT-${Date.now()}`;
    const registered = await requestWithBranch('/v1/checks/received', ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        checkNumber,
        bankName: 'ملی',
        amountRial: '5000000',
        dueDate: '1405-12-01',
        drawerName: 'کاربر تست',
      }),
    });
    expect(registered.response.status).toBe(201);
    const checkId = asJson<{ check: { id: string } }>(registered.body).check.id;

    const first = await requestWithBranch(
      `/v1/checks/${checkId}/collect`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        idempotencyKey: randomUUID(),
        body: JSON.stringify({ confirmInstallment: false }),
      },
    );
    expect(first.response.status).toBe(200);

    const second = await requestWithBranch(
      `/v1/checks/${checkId}/collect`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        idempotencyKey: randomUUID(),
        body: JSON.stringify({ confirmInstallment: false }),
      },
    );
    expect(second.response.status).toBe(409);
    expect(asJson<{ code: string }>(second.body).code).toBe('CHECK_ALREADY_COLLECTED');
  });

  it('rbac: deny phase-06 sensitive endpoints without permission (viewer)', async () => {
    const sale = await createSale(`Phase06 RBAC ${Date.now()}`);
    const installment = sale.installments[0]!;

    const registered = await requestWithBranch('/v1/checks/received', ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        checkNumber: `RBAC-${Date.now()}`,
        bankName: 'ملت',
        amountRial: '1000000',
        dueDate: '1405-12-01',
        drawerName: 'تست',
      }),
    });
    const checkId = asJson<{ check: { id: string } }>(registered.body).check.id;

    const denyCases: Array<{ path: string; method: 'POST' | 'GET'; body?: unknown }> = [
      { path: '/v1/payments/transactions', method: 'GET' },
      { path: '/v1/payments/methods', method: 'GET' },
      {
        path: '/v1/payments',
        method: 'POST',
        body: { method: 'cash', installmentId: installment.id, amountRial: '1000' },
      },
      {
        path: `/v1/payments/transactions/${randomUUID()}/refund`,
        method: 'POST',
        body: { refundAmountRial: '1000', reason: 'test', refundMethod: 'original' },
      },
      {
        path: '/v1/payments/settlements',
        method: 'POST',
        body: {
          branchId: seed.branchA.id,
          periodFrom: SETTLEMENT_PERIOD_FROM,
          periodTo: SETTLEMENT_PERIOD_TO,
          paymentMethods: ['card'],
        },
      },
      {
        path: '/v1/checks/received',
        method: 'POST',
        body: {
          checkNumber: 'RBAC-DENY',
          bankName: 'ملت',
          amountRial: '1000',
          dueDate: '1405-12-01',
          drawerName: 'test',
        },
      },
      {
        path: `/v1/checks/${checkId}/bounce`,
        method: 'POST',
        body: { bounceReason: 'deny test' },
      },
      {
        path: `/v1/checks/${checkId}/collect`,
        method: 'POST',
        body: { confirmInstallment: false },
      },
    ];

    for (const denyCase of denyCases) {
      const needsIdempotency =
        denyCase.method === 'POST' &&
        (denyCase.path === '/v1/payments' ||
          denyCase.path.includes('/refund') ||
          denyCase.path.includes('/collect'));

      const result = await requestWithBranch(denyCase.path, viewerToken, seed.branchA.id, {
        method: denyCase.method,
        idempotencyKey: needsIdempotency ? randomUUID() : undefined,
        body: denyCase.body ? JSON.stringify(denyCase.body) : undefined,
      });
      expect(result.response.status).toBe(403);
      expect(asJson<{ code: string }>(result.body).code).toBe('PERMISSION_DENIED');
    }
  });

  it('cross-tenant: tenant B cannot mutate tenant A payment/check resources', async () => {
    const sale = await createSale(`Phase06 CrossTenant ${Date.now()}`);
    const installment = sale.installments[0]!;

    const reported = await unifiedCashPayment(installment.id, installment.amountRial);
    const attemptId = asJson<UnifiedPaymentResponse>(reported.body).paymentAttempt.id;
    await confirmPayment(attemptId);

    const transactions = await listPostedTransactions();
    const ledgerEntry = transactions.find((row) => row.amountRial === installment.amountRial)!;

    const registered = await requestWithBranch('/v1/checks/received', ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        checkNumber: `CT-${Date.now()}`,
        bankName: 'ملت',
        amountRial: '2000000',
        dueDate: '1405-12-01',
        drawerName: 'تست',
      }),
    });
    const checkId = asJson<{ check: { id: string } }>(registered.body).check.id;

    const crossTenantCases: Array<{ path: string; method: 'POST'; body?: unknown }> = [
      {
        path: `/v1/payments/transactions/${ledgerEntry.id}/refund`,
        method: 'POST',
        body: {
          refundAmountRial: '1000',
          reason: 'cross tenant',
          refundMethod: 'original',
        },
      },
      {
        path: `/v1/checks/${checkId}/collect`,
        method: 'POST',
        body: { confirmInstallment: false },
      },
      {
        path: `/v1/checks/${checkId}/bounce`,
        method: 'POST',
        body: { bounceReason: 'cross tenant' },
      },
    ];

    for (const crossCase of crossTenantCases) {
      const result = await requestWithBranch(crossCase.path, tenantBToken, seed.branchA.id, {
        method: crossCase.method,
        idempotencyKey: randomUUID(),
        body: crossCase.body ? JSON.stringify(crossCase.body) : undefined,
      });
      expect([403, 404]).toContain(result.response.status);
    }
  });
});
