import type { JwtTokenService, PrismaService } from '@hivork/infrastructure';
import type Redis from 'ioredis';

import {
  futureDateOnly,
  issueStaffAccessToken,
  type SeedStaff,
} from '../../../src/test-utils/rbac-seed.helper.js';

export type CreatedCustomer = {
  id: string;
  phone: string;
  name: string;
};

export type CreatedSale = {
  saleId: string;
  installmentId: string;
};

export type HttpRequestFn = (
  path: string,
  init?: RequestInit & { token?: string; idempotencyKey?: string },
) => Promise<{ response: Response; body: unknown }>;

export function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function loginDemoOwnerToken(
  redis: Redis,
  request: HttpRequestFn,
): Promise<string> {
  const ownerPhone = process.env.SEED_OWNER_PHONE ?? '09120000000';

  await request('/v1/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({
      phone: ownerPhone,
      actor: 'staff',
      intent: 'login',
      tenantSlug: 'demo-shop',
    }),
  });

  const otpRecord = await redis.get(`otp:staff:${ownerPhone}`);
  if (!otpRecord) {
    throw new Error('OTP record missing for demo owner');
  }

  const code = JSON.parse(otpRecord).code as string;
  const verify = await request('/v1/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({
      phone: ownerPhone,
      code,
      actor: 'staff',
      intent: 'login',
      tenantSlug: 'demo-shop',
    }),
  });

  if (verify.response.status !== 200) {
    throw new Error(`Owner login failed: ${JSON.stringify(verify.body)}`);
  }

  return (verify.body as { accessToken: string }).accessToken;
}

export async function issueToken(
  tokens: JwtTokenService,
  staff: Pick<SeedStaff, 'id' | 'tenantId'>,
): Promise<string> {
  return issueStaffAccessToken(tokens, staff);
}

export async function createCustomerViaApi(
  request: HttpRequestFn,
  token: string,
  input: {
    phone: string;
    name: string;
    localCode?: string;
    defaultBranchId?: string;
    tags?: string[];
  },
): Promise<CreatedCustomer> {
  const created = await request('/v1/customers', {
    method: 'POST',
    token,
    body: JSON.stringify({
      phone: input.phone,
      name: input.name,
      localCode: input.localCode,
      defaultBranchId: input.defaultBranchId,
      tags: input.tags,
    }),
  });

  if (created.response.status !== 201) {
    throw new Error(`Create customer failed: ${JSON.stringify(created.body)}`);
  }

  const body = created.body as { id: string; customer?: { phone?: string } };
  return {
    id: body.id,
    phone: input.phone,
    name: input.name,
  };
}

export async function createSaleForCustomer(
  request: HttpRequestFn,
  token: string,
  input: {
    tenantCustomerId: string;
    branchId: string;
    title: string;
    totalAmountRial?: string;
  },
): Promise<CreatedSale> {
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
      installmentCount: 2,
      firstDueDate: futureDateOnly(45),
      contractDate: futureDateOnly(30),
      intervalDays: 30,
    }),
  });

  if (created.response.status !== 201) {
    throw new Error(`Create sale failed: ${JSON.stringify(created.body)}`);
  }

  const body = created.body as { id: string; installments: Array<{ id: string }> };
  return {
    saleId: body.id,
    installmentId: body.installments[0]?.id ?? '',
  };
}

export async function createCustomerWithSale(
  request: HttpRequestFn,
  token: string,
  input: {
    phone: string;
    name: string;
    branchId: string;
    saleTitle: string;
    localCode?: string;
    defaultBranchId?: string;
  },
): Promise<CreatedCustomer & { saleId: string }> {
  const customer = await createCustomerViaApi(request, token, {
    phone: input.phone,
    name: input.name,
    localCode: input.localCode,
    defaultBranchId: input.defaultBranchId,
  });

  const sale = await createSaleForCustomer(request, token, {
    tenantCustomerId: customer.id,
    branchId: input.branchId,
    title: input.saleTitle,
  });

  return { ...customer, saleId: sale.saleId };
}

export async function countSalesForCustomer(
  prisma: PrismaService,
  tenantId: string,
  tenantCustomerId: string,
): Promise<number> {
  return prisma.sale.count({
    where: {
      tenantId,
      tenantCustomerId,
      deletedAt: null,
    },
  });
}

export function uniquePhone(prefix: string): string {
  const suffix = String(Date.now()).slice(-7);
  return `${prefix}${suffix}`;
}
