/**
 * IFP-TASK-018 — Phase 01 vertical slice + RBAC integration tests (API / Testcontainers PG + Redis).
 */
import { JwtTokenService, PrismaService } from '@hivork/infrastructure';
import { ModuleRegistryService } from '@hivork/module-core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { authenticator } from 'otplib';
import Redis from 'ioredis';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../app.module.js';
import { STAFF_REFRESH_COOKIE } from '../auth/auth-cookies.js';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';
import { AppConfigService } from '../config/app-config.service.js';
import { seedCrossTenantFixtures } from '../test-utils/cross-tenant-seed.helper.js';
import { issueStaffAccessToken, seedPhase1RbacFixtures } from '../test-utils/rbac-seed.helper.js';
import {
  CAPTCHA_BYPASS_HEADERS,
  CAPTCHA_BYPASS_HEADER,
} from '../test-utils/phase-01-auth/captcha-bypass.js';
import {
  PHASE01_DEFAULT_PASSWORD,
  seedPhase01AuthFixture,
  softDeleteTestApiKeys,
  type Phase01Fixtures,
} from '../../../../prisma/seed/phase-01-auth.js';

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const hasDatabase = Boolean(databaseUrl) || process.env.CI === 'true';

async function probeRedis(url: string): Promise<boolean> {
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
  });
  try {
    await client.connect();
    await client.ping();
    await client.quit();
    return true;
  } catch {
    try {
      await client.quit();
    } catch {
      // ignore
    }
    return false;
  }
}

const redisAvailable = await probeRedis(redisUrl);
const describeIfRuntime = hasDatabase && redisAvailable ? describe : describe.skip;

function parseSetCookie(setCookie: string | null): string | undefined {
  if (!setCookie) return undefined;
  const [pair] = setCookie.split(';');
  return pair;
}

function cookieHeaderFromResponse(response: Response): string | undefined {
  const raw = response.headers.get('set-cookie');
  if (!raw) return undefined;
  const refresh = raw
    .split(/,(?=[^;]+?=)/)
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${STAFF_REFRESH_COOKIE}=`));
  return parseSetCookie(refresh ?? null);
}

describeIfRuntime('Phase 01 auth integration (IFP-018)', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createApp>>['app'];
  let server: Awaited<ReturnType<typeof createApp>>['server'];
  let tokens: JwtTokenService;
  let fixtures: Phase01Fixtures;
  let tenantBOwnerToken = '';

  beforeAll(async () => {
    await redis.connect();
    const created = await createApp();
    app = created.app;
    server = created.server;
    tokens = app.get(JwtTokenService);

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 4000;
    baseUrl = `http://127.0.0.1:${port}/api`;

    await seedPhase1RbacFixtures(prisma, redis);
    fixtures = await seedPhase01AuthFixture(prisma);
    const crossTenant = await seedCrossTenantFixtures(prisma, redis);
    tenantBOwnerToken = await issueStaffAccessToken(tokens, crossTenant.tenantB.owner);
  });

  afterEach(async () => {
    await softDeleteTestApiKeys(prisma, fixtures.tenantId);
    await redis.flushdb();
  });

  afterAll(async () => {
    if (redis.status === 'ready') {
      await redis.quit();
    }
    await prisma.$disconnect();
    if (app) {
      await app.close();
    }
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  async function request(path: string, init?: RequestInit & { token?: string; cookie?: string }) {
    const headers = new Headers(init?.headers);
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (init?.token) {
      headers.set('Authorization', `Bearer ${init.token}`);
    }
    if (init?.cookie) {
      headers.set('Cookie', init.cookie);
    }

    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    const text = await response.text();
    const body = text ? (JSON.parse(text) as unknown) : null;
    return { response, body };
  }

  async function passwordLogin(input: {
    phone: string;
    password: string;
    tenantSlug?: string;
    rememberMe?: boolean;
    extraHeaders?: Record<string, string>;
  }) {
    return request('/v1/auth/password/login', {
      method: 'POST',
      headers: { ...CAPTCHA_BYPASS_HEADERS, ...(input.extraHeaders ?? {}) },
      body: JSON.stringify({
        phone: input.phone,
        password: input.password,
        tenantSlug: input.tenantSlug ?? fixtures.tenantSlug,
        rememberMe: input.rememberMe ?? false,
      }),
    });
  }

  async function registerSetPasswordAndTenant(phone: string, password: string, slug: string) {
    await request('/v1/auth/otp/request', {
      method: 'POST',
      headers: CAPTCHA_BYPASS_HEADERS,
      body: JSON.stringify({ phone, actor: 'staff', intent: 'register' }),
    });

    const otpRecord = await redis.get(`otp:staff:${phone}`);
    if (!otpRecord) {
      throw new Error(`OTP missing for ${phone}`);
    }
    const code = JSON.parse(otpRecord).code as string;

    const verify = await request('/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code, actor: 'staff', intent: 'register' }),
    });
    expect(verify.response.status).toBe(200);
    const verifiedToken = (verify.body as { verifiedToken: string }).verifiedToken;

    const setInitial = await request('/v1/auth/password/set-initial', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${verifiedToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password, passwordConfirm: password }),
    });
    expect(setInitial.response.status).toBe(200);

    const registerTenant = await request('/v1/tenants/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Phase01 Auth Test Shop',
        slug,
        ownerName: 'Phase01 Owner',
        ownerPhone: phone,
        verifiedToken,
      }),
    });
    expect(registerTenant.response.status).toBe(201);

    return passwordLogin({ phone, password, tenantSlug: slug });
  }

  // ── Scenarios 1–12 ──────────────────────────────────────────────

  it('#1 register → set initial password → password login (IFP-001, 002)', async () => {
    const phone = `0912${String(Date.now()).slice(-7)}`;
    const password = 'Register1Pass!';
    const slug = `phase01-${Date.now()}`;

    const login = await registerSetPasswordAndTenant(phone, password, slug);
    expect(login.response.status).toBe(200);
    expect((login.body as { kind: string }).kind).toBe('session');
    expect((login.body as { accessToken: string }).accessToken).toBeTruthy();
  });

  it('#2 password login → MFA OTP step-up → session (IFP-004)', async () => {
    const login = await passwordLogin({
      phone: fixtures.mfaUser.phone,
      password: fixtures.mfaUser.password,
    });
    expect(login.response.status).toBe(200);
    expect((login.body as { kind: string }).kind).toBe('mfa_required');
    const mfaToken = (login.body as { mfaToken: string }).mfaToken;

    await request('/v1/auth/mfa/otp/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mfaToken}` },
      body: JSON.stringify({}),
    });

    const otpRecord = await redis.get(`otp:staff:${fixtures.mfaUser.phone}`);
    const code = JSON.parse(otpRecord!).code as string;

    const mfaVerify = await request('/v1/auth/mfa/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mfaToken}` },
      body: JSON.stringify({ method: 'otp', code }),
    });

    expect(mfaVerify.response.status).toBe(200);
    expect((mfaVerify.body as { accessToken: string }).accessToken).toBeTruthy();
  });

  it('#3 TOTP setup → login with TOTP (IFP-005)', async () => {
    const totpUser = fixtures.lockoutUser;
    const login = await passwordLogin({
      phone: totpUser.phone,
      password: totpUser.password,
    });
    expect(login.response.status).toBe(200);
    const accessToken = (login.body as { accessToken: string }).accessToken;

    const setup = await request('/v1/staff/me/mfa/totp/setup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(setup.response.status).toBe(200);
    const secret = (setup.body as { secret: string }).secret;
    const totpCode = authenticator.generate(secret);

    const verifySetup = await request('/v1/staff/me/mfa/totp/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ code: totpCode }),
    });
    expect(verifySetup.response.status).toBe(200);

    await prisma.user.update({
      where: { id: totpUser.userId },
      data: {
        metadata: {
          mfa: { otpEnabled: false, totpEnabled: true, requireMfaOnLogin: true },
        },
      },
    });

    const loginMfa = await passwordLogin({
      phone: totpUser.phone,
      password: totpUser.password,
    });
    expect((loginMfa.body as { kind: string }).kind).toBe('mfa_required');
    const mfaToken = (loginMfa.body as { mfaToken: string }).mfaToken;
    const stepUpCode = authenticator.generate(secret);

    const mfaVerify = await request('/v1/auth/mfa/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mfaToken}` },
      body: JSON.stringify({ method: 'totp', code: stepUpCode }),
    });
    expect(mfaVerify.response.status).toBe(200);
    expect((mfaVerify.body as { accessToken: string }).accessToken).toBeTruthy();

    await prisma.userMfaTotp.updateMany({
      where: { userId: totpUser.userId, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deleteReason: 'phase-01 test cleanup',
      },
    });
    await prisma.user.update({
      where: { id: totpUser.userId },
      data: { metadata: {} },
    });
    await upsertCredential(prisma, totpUser.userId, PHASE01_DEFAULT_PASSWORD);
  });

  it('#4 forgot password full flow (IFP-006)', async () => {
    const phone = fixtures.lockoutUser.phone;
    const newPassword = 'ForgotNew1Pass!';

    await request('/v1/auth/password/forgot/request', {
      method: 'POST',
      headers: CAPTCHA_BYPASS_HEADERS,
      body: JSON.stringify({ phone }),
    });

    const otpRecord = await redis.get(`otp:password_reset:staff:${phone}`);
    const code = JSON.parse(otpRecord!).code as string;

    const verifyOtp = await request('/v1/auth/password/forgot/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
    expect(verifyOtp.response.status).toBe(200);
    const resetToken = (verifyOtp.body as { resetToken: string }).resetToken;

    const reset = await request('/v1/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({
        resetToken,
        password: newPassword,
        passwordConfirm: newPassword,
      }),
    });
    expect(reset.response.status).toBe(200);

    const login = await passwordLogin({ phone, password: newPassword });
    expect(login.response.status).toBe(200);
    expect((login.body as { kind: string }).kind).toBe('session');

    await upsertCredential(prisma, fixtures.lockoutUser.userId, PHASE01_DEFAULT_PASSWORD);
  });

  it('#5 login creates StaffSession (IFP-008)', async () => {
    const login = await passwordLogin({
      phone: fixtures.owner.phone,
      password: fixtures.owner.password,
    });
    expect(login.response.status).toBe(200);
    const cookie = cookieHeaderFromResponse(login.response);
    expect(cookie).toBeTruthy();

    const accessToken = (login.body as { accessToken: string }).accessToken;
    const sessions = await request('/v1/staff/me/sessions?status=active&limit=10', {
      token: accessToken,
      cookie,
    });
    expect(sessions.response.status).toBe(200);
    const items = (sessions.body as { items: unknown[] }).items;
    expect(items.length).toBeGreaterThan(0);
  });

  it('#6 list + revoke session (IFP-009)', async () => {
    const login = await passwordLogin({
      phone: fixtures.owner.phone,
      password: fixtures.owner.password,
    });
    const accessToken = (login.body as { accessToken: string }).accessToken;
    const cookie = cookieHeaderFromResponse(login.response)!;

    const list = await request('/v1/staff/me/sessions?status=active&limit=20', {
      token: accessToken,
      cookie,
    });
    expect(list.response.status).toBe(200);
    const items = (list.body as { items: Array<{ id: string; isCurrent: boolean }> }).items;
    const otherSession = items.find((s) => !s.isCurrent) ?? items[0];
    expect(otherSession).toBeTruthy();

    const revoke = await request(`/v1/staff/me/sessions/${otherSession!.id}`, {
      method: 'DELETE',
      token: accessToken,
      cookie,
    });
    expect(revoke.response.status).toBe(200);
  });

  it('#7 last login previous in response (IFP-010)', async () => {
    await passwordLogin({ phone: fixtures.owner.phone, password: fixtures.owner.password });
    const second = await passwordLogin({
      phone: fixtures.owner.phone,
      password: fixtures.owner.password,
    });
    expect(second.response.status).toBe(200);
    const lastLogin = (second.body as { lastLogin?: { at: string } }).lastLogin;
    expect(lastLogin?.at).toBeTruthy();
  });

  it('#8 Remember Me TTL difference (IFP-011)', async () => {
    const normal = await passwordLogin({
      phone: fixtures.owner.phone,
      password: fixtures.owner.password,
      rememberMe: false,
    });
    const remember = await passwordLogin({
      phone: fixtures.owner.phone,
      password: fixtures.owner.password,
      rememberMe: true,
    });

    const normalCookie = cookieHeaderFromResponse(normal.response) ?? '';
    const rememberCookie = cookieHeaderFromResponse(remember.response) ?? '';
    const normalMaxAge = normalCookie.match(/Max-Age=(\d+)/)?.[1];
    const rememberMaxAge = rememberCookie.match(/Max-Age=(\d+)/)?.[1];

    expect(Number(rememberMaxAge)).toBeGreaterThan(Number(normalMaxAge));
  });

  it('#9 captcha bypass in test (IFP-012)', async () => {
    const login = await passwordLogin({
      phone: fixtures.owner.phone,
      password: fixtures.owner.password,
      extraHeaders: { [CAPTCHA_BYPASS_HEADER]: process.env.CAPTCHA_BYPASS_TOKEN ?? 'test-bypass' },
    });
    expect(login.response.status).toBe(200);
  });

  it('#10 lockout after 5 fails (IFP-013)', async () => {
    const phone = fixtures.lockoutUser.phone;
    await prisma.userCredential.updateMany({
      where: { userId: fixtures.lockoutUser.userId, deletedAt: null },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    for (let i = 0; i < 4; i += 1) {
      const fail = await passwordLogin({ phone, password: 'WrongPass1!' });
      expect(fail.response.status).toBe(401);
    }

    const fifth = await passwordLogin({ phone, password: 'WrongPass1!' });
    expect(fifth.response.status).toBe(423);
    expect((fifth.body as { code: string }).code).toBe('AUTH_ACCOUNT_LOCKED');

    await prisma.userCredential.updateMany({
      where: { userId: fixtures.lockoutUser.userId, deletedAt: null },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  });

  it('#11 change password in settings (IFP-015)', async () => {
    const login = await passwordLogin({
      phone: fixtures.owner.phone,
      password: fixtures.owner.password,
    });
    const accessToken = (login.body as { accessToken: string }).accessToken;
    const cookie = cookieHeaderFromResponse(login.response);
    const newPassword = 'Changed1Pass!';

    const change = await request('/v1/staff/me/password/change', {
      method: 'POST',
      token: accessToken,
      cookie,
      body: JSON.stringify({
        currentPassword: fixtures.owner.password,
        newPassword,
        newPasswordConfirm: newPassword,
        revokeOthers: false,
      }),
    });
    expect(change.response.status).toBe(200);

    const loginNew = await passwordLogin({ phone: fixtures.owner.phone, password: newPassword });
    expect(loginNew.response.status).toBe(200);

    await upsertCredential(prisma, fixtures.owner.userId, fixtures.owner.password);
  });

  it('#12 refresh token rotation + reuse detection (IFP-011)', async () => {
    const login = await passwordLogin({
      phone: fixtures.owner.phone,
      password: fixtures.owner.password,
    });
    const cookie = cookieHeaderFromResponse(login.response)!;

    const refresh1 = await request('/v1/auth/refresh', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: JSON.stringify({ actor: 'staff' }),
    });
    expect(refresh1.response.status).toBe(200);
    const newCookie = cookieHeaderFromResponse(refresh1.response)!;

    const refresh2 = await request('/v1/auth/refresh', {
      method: 'POST',
      headers: { Cookie: newCookie },
      body: JSON.stringify({ actor: 'staff' }),
    });
    expect(refresh2.response.status).toBe(200);

    const reuse = await request('/v1/auth/refresh', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: JSON.stringify({ actor: 'staff' }),
    });
    expect(reuse.response.status).toBe(401);
    expect((reuse.body as { code: string }).code).toBe('AUTH_REFRESH_COMPROMISED');
  });

  // ── RBAC R1–R6 ──────────────────────────────────────────────────

  it('R1 GET /staff/me/sessions — staff default → 200', async () => {
    const token = await issueStaffAccessToken(tokens, {
      id: fixtures.viewer.id,
      tenantId: fixtures.tenantId,
    });
    const res = await request('/v1/staff/me/sessions?limit=5', { token });
    expect(res.response.status).toBe(200);
  });

  it('R2 GET /staff/me/sessions — no auth → 401', async () => {
    const res = await request('/v1/staff/me/sessions?limit=5');
    expect(res.response.status).toBe(401);
  });

  it('R3 DELETE /staff/me/sessions/:id — other tenant token → 404', async () => {
    const login = await passwordLogin({
      phone: fixtures.owner.phone,
      password: fixtures.owner.password,
    });
    const accessToken = (login.body as { accessToken: string }).accessToken;
    const list = await request('/v1/staff/me/sessions?limit=5', { token: accessToken });
    const sessionId = (list.body as { items: Array<{ id: string }> }).items[0]!.id;

    const cross = await request(`/v1/staff/me/sessions/${sessionId}`, {
      method: 'DELETE',
      token: tenantBOwnerToken,
    });
    expect(cross.response.status).toBe(404);
  });

  it('R4 PATCH /settings/security — staff without settings.edit → 403', async () => {
    const token = await issueStaffAccessToken(tokens, {
      id: fixtures.viewer.id,
      tenantId: fixtures.tenantId,
    });
    const res = await request('/v1/settings/security', {
      method: 'PATCH',
      token,
      body: JSON.stringify({ ipAllowlist: { enabled: true } }),
    });
    expect(res.response.status).toBe(403);
    expect((res.body as { code: string }).code).toBe('PERMISSION_DENIED');
  });

  it('R5 POST /settings/api-keys — without apikey.create → 403', async () => {
    const token = await issueStaffAccessToken(tokens, {
      id: fixtures.viewer.id,
      tenantId: fixtures.tenantId,
    });
    const res = await request('/v1/settings/api-keys', {
      method: 'POST',
      token,
      body: JSON.stringify({ name: 'phase01-denied', scopes: ['installments.read'] }),
    });
    expect(res.response.status).toBe(403);
  });

  it('R6 POST /settings/api-keys — tenant owner → 201', async () => {
    const token = await issueStaffAccessToken(tokens, {
      id: fixtures.owner.id,
      tenantId: fixtures.tenantId,
    });
    const res = await request('/v1/settings/api-keys', {
      method: 'POST',
      token,
      body: JSON.stringify({
        name: `phase01-${Date.now()}`,
        scopes: ['installments.read'],
      }),
    });
    expect(res.response.status).toBe(201);
  });

  // ── Edge cases ──────────────────────────────────────────────────

  it('concurrent login same user — both sessions listed', async () => {
    const first = await passwordLogin({
      phone: fixtures.owner.phone,
      password: fixtures.owner.password,
    });
    const second = await passwordLogin({
      phone: fixtures.owner.phone,
      password: fixtures.owner.password,
    });
    expect(first.response.status).toBe(200);
    expect(second.response.status).toBe(200);

    const token = (second.body as { accessToken: string }).accessToken;
    const list = await request('/v1/staff/me/sessions?status=active&limit=20', { token });
    expect((list.body as { items: unknown[] }).items.length).toBeGreaterThanOrEqual(2);
  });

  it('expired mfaToken → 401', async () => {
    const res = await request('/v1/auth/mfa/verify', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid.mfa.token' },
      body: JSON.stringify({ method: 'otp', code: '12345' }),
    });
    expect(res.response.status).toBe(401);
  });
});

async function createApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  const appConfig = app.get(AppConfigService);

  app.use(cookieParser());
  app.enableCors({ origin: appConfig.corsOrigin, credentials: true });
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.get(ModuleRegistryService).bootstrap(app);

  await app.init();
  const server = app.getHttpServer() as import('node:http').Server;

  return { app, server };
}

async function upsertCredential(prisma: PrismaService, userId: string, password: string) {
  const argon2 = await import('argon2');
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
  await prisma.userCredential.updateMany({
    where: { userId, deletedAt: null },
    data: {
      passwordHash,
      mustChangePassword: false,
      status: 'active',
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
}
