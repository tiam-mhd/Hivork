import type { ISettingsSchemaRegistry } from '../ports/settings-schema-registry.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import { resolveEffectiveSettings } from '../settings/resolve-effective-settings.js';
import { CaptchaGuard } from './captcha.guard.js';
import {
  DEFAULT_CAPTCHA_AFTER_FAILURES,
  type IPasswordLoginFailureCounterPort,
} from './ports/password-login-failure.port.js';
import type { IIpAllowlistPort } from './ports/ip-allowlist.port.js';
import type { ILoginHardeningPort, LoginHardeningContext } from './ports/login-hardening.port.js';

export class LoginHardeningService implements ILoginHardeningPort {
  constructor(
    private readonly captchaGuard: CaptchaGuard,
    private readonly failureCounter: IPasswordLoginFailureCounterPort,
    private readonly settingsRepository: ITenantSettingsRepository,
    private readonly schemaRegistry: ISettingsSchemaRegistry,
    private readonly ipAllowlist: IIpAllowlistPort,
  ) {}

  async assertLoginAllowed(context: LoginHardeningContext): Promise<void> {
    const threshold = await this.resolveCaptchaAfterFailures(context.tenantId);
    const failures = context.clientIp ? await this.failureCounter.getCount(context.clientIp) : 0;
    const forceRequired = failures >= threshold;

    await this.captchaGuard.require({
      captchaToken: context.captchaToken,
      clientIp: context.clientIp,
      bypassToken: context.captchaBypassToken,
      forceRequired,
    });

    if (context.tenantId) {
      await this.ipAllowlist.assertStaffLoginAllowed({
        tenantId: context.tenantId,
        clientIp: context.clientIp,
        bypassToken: context.ipAllowlistBypassToken,
        auditMetadata: context.ipAllowlistAuditMetadata,
      });
    }
  }

  async recordPasswordLoginFailure(clientIp: string | undefined): Promise<void> {
    if (!clientIp) {
      return;
    }
    await this.failureCounter.recordFailure(clientIp);
  }

  private async resolveCaptchaAfterFailures(tenantId?: string): Promise<number> {
    if (!tenantId) {
      return DEFAULT_CAPTCHA_AFTER_FAILURES;
    }

    const schema = this.schemaRegistry.getSchema('core');
    if (!schema) {
      return DEFAULT_CAPTCHA_AFTER_FAILURES;
    }

    const stored = await this.settingsRepository.findByModule(tenantId, 'core');
    const settings = resolveEffectiveSettings(schema, stored);
    const configured = settings.security_captcha_after_failures;
    if (typeof configured === 'number' && configured >= 0) {
      return configured;
    }

    return DEFAULT_CAPTCHA_AFTER_FAILURES;
  }
}
