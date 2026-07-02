import { randomUUID } from 'node:crypto';

import { JwtTokenService, PrismaAuditService, PrismaService } from '@hivork/infrastructure';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createCustomerViaApi,
  createSaleForCustomer,
  issueToken,
  uniquePhone,
} from './customers/customer-test.helpers.js';
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
import { seedCrossTenantFixtures } from '../../src/test-utils/cross-tenant-seed.helper.js';
import {
  futureDateOnly,
  seedPhase1RbacFixtures,
  type Phase1RbacSeed,
} from '../../src/test-utils/rbac-seed.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const redisAvailable = await probeRedis();
const describeIfRuntime = hasIntegrationRuntime(databaseUrl) && redisAvailable ? describe : describe.skip;

type SaleDetailBody = {
  data: {
    id: string;
    status: string;
    version: number;
    totalAmountRial: string;
    contractNumber: string | null;
    copiedFromSaleId: string | null;
    archivedAt: string | null;
  };
};

function branchHeaders(branchId: string): HeadersInit {
  return { 'X-Branch-Id': branchId };
}

function asJson<T>(value: unknown): T {
  return value as T;
}

describeIfRuntime('Phase 04 contract enterprise vertical slice (IFP-078)', () => {
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
  let tenantBId = '';

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
    tenantBId = crossTenant.tenantB.id;
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

  async function createEnterpriseSale(title: string, totalAmountRial = '1500000') {
    return createSaleForCustomer(request, ownerToken, {
      tenantCustomerId: seed.customerId,
      branchId: seed.branchA.id,
      title,
      totalAmountRial,
    });
  }

  async function getSaleDetail(saleId: string, token = ownerToken) {
    return request(`/v1/sales/${saleId}`, { token });
  }

  it('scenario A: create sale → line items → recalculate → guarantor/collateral/attachment', async () => {
    const created = await createEnterpriseSale(`Phase04 Financials ${Date.now()}`, '1500000');
    const saleId = created.saleId;

    const addPhone = uniquePhone('0914');
    const addGuarantor = await requestWithBranch(`/v1/sales/${saleId}/guarantors`, ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'ضامن تست فاز ۴',
        phone: addPhone,
        relationship: 'other',
        note: 'ضامن بیرونی برای تست عمودی',
      }),
    });
    expect(addGuarantor.response.status).toBe(201);
    const guarantorId = asJson<{ data: { id: string } }>(addGuarantor.body).data.id;

    const listGuarantors = await request(`/v1/sales/${saleId}/guarantors`, { token: ownerToken });
    expect(listGuarantors.response.status).toBe(200);
    expect(asJson<{ data: Array<{ id: string }> }>(listGuarantors.body).data.map((row) => row.id)).toContain(
      guarantorId,
    );

    const addCollateral = await requestWithBranch(`/v1/sales/${saleId}/collaterals`, ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        collateralType: 'cheque',
        title: 'چک ضمانت فاز ۴',
        estimatedValueRial: '900000',
        registrationNumber: `CHK-${Date.now()}`,
      }),
    });
    expect(addCollateral.response.status).toBe(201);

    const addItemOne = await requestWithBranch(`/v1/sales/${saleId}/line-items`, ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        title: 'گوشی',
        quantity: 1,
        unitPriceRial: '1200000',
      }),
    });
    expect(addItemOne.response.status).toBe(201);

    const addItemTwo = await requestWithBranch(`/v1/sales/${saleId}/line-items`, ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        title: 'لوازم جانبی',
        quantity: 1,
        unitPriceRial: '700000',
        discountRial: '100000',
      }),
    });
    expect(addItemTwo.response.status).toBe(201);

    const detailBeforeRecalc = await getSaleDetail(saleId);
    expect(detailBeforeRecalc.response.status).toBe(200);
    const currentVersion = asJson<SaleDetailBody>(detailBeforeRecalc.body).data.version;

    const recalculate = await requestWithBranch(
      `/v1/sales/${saleId}/financials/recalculate`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'POST',
        body: JSON.stringify({
          expectedVersion: currentVersion,
          regenerateInstallments: false,
          changeReason: 'هم‌ترازسازی با اقلام قرارداد',
        }),
      },
    );
    expect(recalculate.response.status).toBe(200);
    const recalcData = asJson<{
      data: {
        totalAmountRial: string;
        subtotalRial: string;
        version: number;
      };
    }>(recalculate.body).data;
    expect(recalcData.subtotalRial).toBe('1800000');
    expect(recalcData.totalAmountRial).toBe('1800000');

    const lineItems = await request(`/v1/sales/${saleId}/line-items`, { token: ownerToken });
    expect(lineItems.response.status).toBe(200);
    expect(asJson<{ data: Array<{ title: string }> }>(lineItems.body).data).toHaveLength(2);

    const attachment = await requestWithBranch(`/v1/sales/${saleId}/attachments`, ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        fileId: randomUUID(),
        attachmentType: 'other',
        label: 'متادیتای فایل تست',
      }),
    });
    expect(attachment.response.status).toBe(201);

    const listAttachments = await request(`/v1/sales/${saleId}/attachments`, { token: ownerToken });
    expect(listAttachments.response.status).toBe(200);
    expect(asJson<{ data: Array<{ label: string | null }> }>(listAttachments.body).data).toHaveLength(1);

    const deleteGuarantor = await requestWithBranch(
      `/v1/sales/${saleId}/guarantors/${guarantorId}`,
      ownerToken,
      seed.branchA.id,
      {
        method: 'DELETE',
        body: JSON.stringify({ deleteReason: 'حذف نرم برای تست' }),
      },
    );
    expect(deleteGuarantor.response.status).toBe(200);

    const guarantorsAfterDelete = await request(`/v1/sales/${saleId}/guarantors`, { token: ownerToken });
    expect(guarantorsAfterDelete.response.status).toBe(200);
    expect(asJson<{ data: Array<{ id: string }> }>(guarantorsAfterDelete.body).data).toHaveLength(0);
  });

  it('scenario B: lifecycle active → extended → terminated → closed → archived', async () => {
    const created = await createEnterpriseSale(`Phase04 Lifecycle ${Date.now()}`, '3000000');
    const saleId = created.saleId;

    const beforeExtend = await getSaleDetail(saleId);
    const versionBeforeExtend = asJson<SaleDetailBody>(beforeExtend.body).data.version;

    const extend = await requestWithBranch(`/v1/sales/${saleId}/extend`, ownerToken, seed.branchA.id, {
      method: 'POST',
      headers: { 'X-Sale-Version': String(versionBeforeExtend) },
      body: JSON.stringify({
        newLastDueDate: futureDateOnly(120),
        additionalInstallmentCount: 1,
        regenerateSchedule: false,
        reason: 'تمدید تست عمودی',
      }),
    });
    expect(extend.response.status).toBe(200);

    const terminate = await requestWithBranch(`/v1/sales/${saleId}/terminate`, ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        reason: 'فسخ پس از تمدید',
        effectiveDate: futureDateOnly(10),
      }),
    });
    expect(terminate.response.status).toBe(200);
    expect(asJson<SaleDetailBody>(terminate.body).data.status).toBe('terminated');

    const close = await requestWithBranch(`/v1/sales/${saleId}/close`, ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        reason: 'بستن پس از فسخ',
        waiveRemaining: false,
      }),
    });
    expect(close.response.status).toBe(200);
    expect(asJson<SaleDetailBody>(close.body).data.status).toBe('closed');

    const archive = await requestWithBranch(`/v1/sales/${saleId}/archive`, ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({ reason: 'بایگانی قرارداد تست' }),
    });
    expect(archive.response.status).toBe(200);
    const archived = asJson<SaleDetailBody>(archive.body).data;
    expect(archived.status).toBe('archived');
    expect(archived.archivedAt).toBeTruthy();
  });

  it('scenario C: copy contract creates lineage and a distinct contract number', async () => {
    const source = await createEnterpriseSale(`Phase04 Copy ${Date.now()}`, '4500000');
    const sourceDetail = await getSaleDetail(source.saleId);
    expect(sourceDetail.response.status).toBe(200);
    const sourceSale = asJson<SaleDetailBody>(sourceDetail.body).data;

    const customer = await createCustomerViaApi(request, ownerToken, {
      phone: uniquePhone('0915'),
      name: `Copy Target ${Date.now()}`,
      defaultBranchId: seed.branchA.id,
    });

    const copied = await requestWithBranch(`/v1/sales/${source.saleId}/copy`, ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({
        tenantCustomerId: customer.id,
        branchId: seed.branchA.id,
        contractDate: futureDateOnly(30),
        firstDueDate: futureDateOnly(45),
        copyAttachments: false,
        copyGuarantors: true,
        reason: 'کپی برای قرارداد جدید',
      }),
    });
    expect(copied.response.status).toBe(201);
    const copyBody = asJson<{
      data: {
        newSaleId: string;
        contractNumber: string;
        sale: { copiedFromSaleId: string | null; contractNumber: string | null };
      };
    }>(copied.body).data;
    expect(copyBody.newSaleId).not.toBe(source.saleId);
    expect(copyBody.sale.copiedFromSaleId).toBe(source.saleId);
    expect(copyBody.contractNumber).toBeTruthy();
    if (sourceSale.contractNumber) {
      expect(copyBody.contractNumber).not.toBe(sourceSale.contractNumber);
    }
  });

  it('scenario D: PATCH enterprise settings, GET reflects values, tenant B remains isolated', async () => {
    const prefix = `P4${String(Date.now()).slice(-4)}`;
    const patch = await request('/v1/settings/installments', {
      method: 'PATCH',
      token: ownerToken,
      body: JSON.stringify({
        penalty_type: 'percent_daily',
        penalty_rate_bps: 75,
        penalty_grace_days: 2,
        rounding_mode: 'up',
        rounding_unit_rial: '1000',
        calendar_display_mode: 'jalali',
        contract_number_prefix: prefix,
        contract_number_include_year: true,
      }),
    });
    expect(patch.response.status).toBe(200);

    const ownerGet = await request('/v1/settings/installments', { token: ownerToken });
    expect(ownerGet.response.status).toBe(200);
    const ownerInstallments = asJson<{
      data: { installments: { penalty_rate_bps: number; rounding_mode: string; contract_number_prefix: string } };
    }>(ownerGet.body).data.installments;
    expect(ownerInstallments.penalty_rate_bps).toBe(75);
    expect(ownerInstallments.rounding_mode).toBe('up');
    expect(ownerInstallments.contract_number_prefix).toBe(prefix);

    const tenantBGet = await request('/v1/settings/installments', { token: tenantBToken });
    expect(tenantBGet.response.status).toBe(200);
    const tenantBInstallments = asJson<{
      data: { installments: { contract_number_prefix: string; penalty_rate_bps: number } };
    }>(tenantBGet.body).data.installments;
    expect(tenantBInstallments.contract_number_prefix).not.toBe(prefix);
    expect(tenantBInstallments.penalty_rate_bps).not.toBe(75);

    const auditRows = await audit.find({
      tenantId: seed.tenantId,
      action: 'settings.change',
      entityType: 'TenantSettings',
      limit: 20,
    });
    expect(
      auditRows.some(
        (row) =>
          row.metadata?.key === 'penalty_rate_bps' &&
          row.newValue &&
          typeof row.newValue === 'object' &&
          'penalty_rate_bps' in row.newValue &&
          row.newValue.penalty_rate_bps === 75,
      ),
    ).toBe(true);

    await prisma.tenantSetting.updateMany({
      where: {
        tenantId: seed.tenantId,
        module: 'installments',
        key: {
          in: [
            'penalty_type',
            'penalty_rate_bps',
            'penalty_grace_days',
            'rounding_mode',
            'rounding_unit_rial',
            'calendar_display_mode',
            'contract_number_prefix',
            'contract_number_include_year',
          ],
        },
      },
      data: { deletedAt: new Date() },
    });

    const tenantBRows = await prisma.tenantSetting.findMany({
      where: {
        tenantId: tenantBId,
        module: 'installments',
        key: { in: ['penalty_rate_bps', 'contract_number_prefix'] },
        deletedAt: null,
      },
    });
    expect(tenantBRows.some((row) => row.value === 75 || row.value === prefix)).toBe(false);
  });

  it('rbac: deny terminate without permission; allow with owner token', async () => {
    const created = await createEnterpriseSale(`Phase04 RBAC ${Date.now()}`);

    const denied = await requestWithBranch(`/v1/sales/${created.saleId}/terminate`, viewerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({ reason: 'تلاش فسخ بدون مجوز' }),
    });
    expect(denied.response.status).toBe(403);
    expect(asJson<{ code: string }>(denied.body).code).toBe('PERMISSION_DENIED');

    const allowed = await requestWithBranch(`/v1/sales/${created.saleId}/terminate`, ownerToken, seed.branchA.id, {
      method: 'POST',
      body: JSON.stringify({ reason: 'فسخ مجاز برای تست' }),
    });
    expect(allowed.response.status).toBe(200);
    expect(asJson<SaleDetailBody>(allowed.body).data.status).toBe('terminated');
  });

  it('cross-tenant: tenant B cannot access tenant A sale or guarantor endpoints, and settings stay tenant-scoped', async () => {
    const sale = await createEnterpriseSale(`Phase04 CrossTenant ${Date.now()}`);

    const saleRead = await request(`/v1/sales/${sale.saleId}`, { token: tenantBToken });
    expect(saleRead.response.status).toBe(404);
    expect(asJson<{ code: string }>(saleRead.body).code).toBe('SALE_NOT_FOUND');

    const guarantorRead = await request(`/v1/sales/${sale.saleId}/guarantors`, { token: tenantBToken });
    expect(guarantorRead.response.status).toBe(404);
    expect(asJson<{ code: string }>(guarantorRead.body).code).toBe('SALE_NOT_FOUND');

    const tenantBSettings = await request('/v1/settings/installments', { token: tenantBToken });
    expect(tenantBSettings.response.status).toBe(200);
    expect(asJson<{ data: { installments: unknown } }>(tenantBSettings.body).data.installments).toBeTruthy();
  });
});
