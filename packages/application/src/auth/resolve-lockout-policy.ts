import {
  DEFAULT_LOCKOUT_POLICY,
  type LockoutPolicy,
} from './ports/login-rate-limiter.port.js';
import type { ISettingsSchemaRegistry } from '../ports/settings-schema-registry.port.js';
import type { ITenantRepository } from '../ports/tenant.repository.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import { resolveEffectiveSettings } from '../settings/resolve-effective-settings.js';

export async function resolveLockoutPolicy(
  tenantRepository: ITenantRepository,
  settingsRepository: ITenantSettingsRepository,
  schemaRegistry: ISettingsSchemaRegistry,
  tenantSlug?: string,
): Promise<LockoutPolicy> {
  if (!tenantSlug) {
    return DEFAULT_LOCKOUT_POLICY;
  }

  const tenant = await tenantRepository.findBySlug(tenantSlug);
  if (!tenant) {
    return DEFAULT_LOCKOUT_POLICY;
  }

  const schema = schemaRegistry.getSchema('core');
  if (!schema) {
    return DEFAULT_LOCKOUT_POLICY;
  }

  const stored = await settingsRepository.findByModule(tenant.id, 'core');
  const settings = resolveEffectiveSettings(schema, stored);

  const maxAttempts = settings.security_lockout_max_attempts;
  const durationMinutes = settings.security_lockout_duration_minutes;
  const resetAfterSuccess = settings.security_lockout_reset_after_success;

  return {
    maxAttempts:
      typeof maxAttempts === 'number' && maxAttempts > 0 ? maxAttempts : DEFAULT_LOCKOUT_POLICY.maxAttempts,
    durationMinutes:
      typeof durationMinutes === 'number' && durationMinutes > 0
        ? durationMinutes
        : DEFAULT_LOCKOUT_POLICY.durationMinutes,
    resetAfterSuccess: resetAfterSuccess !== false,
  };
}
