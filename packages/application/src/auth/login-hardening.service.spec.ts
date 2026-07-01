import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../errors/application.error.js';
import { LoginHardeningService } from './login-hardening.service.js';

describe('LoginHardeningService — IP allowlist', () => {
  const captchaGuard = { require: vi.fn().mockResolvedValue(undefined) };
  const failureCounter = { getCount: vi.fn().mockResolvedValue(0), recordFailure: vi.fn() };
  const settingsRepository = { findByModule: vi.fn().mockResolvedValue({}) };
  const schemaRegistry = { getSchema: vi.fn().mockReturnValue(null) };
  const ipAllowlist = { assertStaffLoginAllowed: vi.fn().mockResolvedValue(undefined) };

  const service = new LoginHardeningService(
    captchaGuard as never,
    failureCounter as never,
    settingsRepository as never,
    schemaRegistry as never,
    ipAllowlist as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks IP allowlist when tenantId is present', async () => {
    await service.assertLoginAllowed({
      tenantId: 'tenant-1',
      clientIp: '1.2.3.4',
      ipAllowlistBypassToken: 'bypass',
    });

    expect(ipAllowlist.assertStaffLoginAllowed).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      clientIp: '1.2.3.4',
      bypassToken: 'bypass',
      auditMetadata: undefined,
    });
  });

  it('skips IP allowlist when tenantId is absent', async () => {
    await service.assertLoginAllowed({ clientIp: '1.2.3.4' });
    expect(ipAllowlist.assertStaffLoginAllowed).not.toHaveBeenCalled();
  });

  it('propagates IP allowlist denial', async () => {
    ipAllowlist.assertStaffLoginAllowed.mockRejectedValue(
      new ApplicationError('AUTH_IP_NOT_ALLOWED', 'denied', 403),
    );

    await expect(
      service.assertLoginAllowed({ tenantId: 'tenant-1', clientIp: '9.9.9.9' }),
    ).rejects.toMatchObject({ code: 'AUTH_IP_NOT_ALLOWED' });
  });
});
