import { describe, expect, it } from 'vitest';

import { JwtTokenService } from './jwt-token.service.js';

describe('JwtTokenService', () => {
  const config = {
    accessSecret: 'access-secret-at-least-32-characters-long',
    refreshSecret: 'refresh-secret-at-least-32-characters-long',
    accessTtlSeconds: 900,
    refreshTtlSeconds: 2_592_000,
    verifiedTtlSeconds: 300,
  };

  const service = new JwtTokenService(config);

  it('issues and verifies staff access token', async () => {
    const token = await service.signAccessToken({
      sub: 'staff-1',
      actor: 'staff',
      tenantId: 'tenant-1',
    });

    const payload = await service.verifyAccessToken(token);
    expect(payload).toMatchObject({
      sub: 'staff-1',
      actor: 'staff',
      tenantId: 'tenant-1',
      type: 'access',
    });
  });

  it('issues verified token for register flow', async () => {
    const token = await service.signVerifiedToken({
      phone: '09123456789',
      actor: 'staff',
      purpose: 'register',
    });

    const payload = await service.verifyVerifiedToken(token);
    expect(payload).toMatchObject({
      phone: '09123456789',
      actor: 'staff',
      purpose: 'register',
      type: 'verified',
    });
  });

  it('issues and verifies refresh token with jti', async () => {
    const { token } = await service.signRefreshToken({
      sub: 'staff-1',
      actor: 'staff',
    });

    const payload = await service.verifyRefreshToken(token);
    expect(payload).toMatchObject({
      sub: 'staff-1',
      actor: 'staff',
      type: 'refresh',
    });
    expect(payload?.jti).toEqual(expect.any(String));
  });

  it('issues and verifies mfa pending token', async () => {
    const token = await service.signMfaPendingToken({
      sub: 'user-1',
      actor: 'staff',
      tenantId: 'tenant-1',
      staffId: 'staff-1',
    });

    const payload = await service.verifyMfaPendingToken(token);
    expect(payload).toMatchObject({
      sub: 'user-1',
      actor: 'staff',
      tenantId: 'tenant-1',
      staffId: 'staff-1',
      type: 'mfa_pending',
    });
  });

  it('issues and verifies change password token', async () => {
    const token = await service.signChangePasswordToken({
      sub: 'user-1',
      actor: 'staff',
    });

    const payload = await service.verifyChangePasswordToken(token);
    expect(payload).toMatchObject({
      sub: 'user-1',
      actor: 'staff',
      type: 'change_password',
    });
  });
});
