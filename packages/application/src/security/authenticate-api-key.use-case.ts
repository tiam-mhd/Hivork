import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import { hashApiKey, isApiKeyFormat } from './api-key.constants.js';
import type { IApiKeyRateLimiterPort } from './ports/api-key-rate-limiter.port.js';
import type { ITenantApiKeyRepository } from './ports/tenant-api-key.repository.port.js';

export type AuthenticateApiKeyInput = {
  rawKey: string;
  clientIp?: string;
  userAgent?: string;
  requiredScope?: string;
};

export type AuthenticateApiKeyOutput = {
  tenantId: string;
  apiKeyId: string;
  scopes: string[];
};

export class AuthenticateApiKeyUseCase
  implements UseCase<AuthenticateApiKeyInput, AuthenticateApiKeyOutput>
{
  constructor(
    private readonly apiKeys: ITenantApiKeyRepository,
    private readonly rateLimiter: IApiKeyRateLimiterPort,
    private readonly audit: AuditService,
  ) {}

  async execute(input: AuthenticateApiKeyInput): Promise<AuthenticateApiKeyOutput> {
    if (!isApiKeyFormat(input.rawKey)) {
      throw new ApplicationError('AUTH_API_KEY_INVALID', 'API key is invalid.', 401);
    }

    const record = await this.apiKeys.findByKeyHash(hashApiKey(input.rawKey));
    if (!record) {
      throw new ApplicationError('AUTH_API_KEY_INVALID', 'API key is invalid.', 401);
    }

    if (record.status === 'revoked') {
      throw new ApplicationError('AUTH_API_KEY_REVOKED', 'API key has been revoked.', 401);
    }

    const now = new Date();
    if (record.expiresAt && record.expiresAt.getTime() <= now.getTime()) {
      throw new ApplicationError('AUTH_API_KEY_EXPIRED', 'API key has expired.', 401);
    }

    if (record.status === 'expired') {
      throw new ApplicationError('AUTH_API_KEY_EXPIRED', 'API key has expired.', 401);
    }

    const allowed = await this.rateLimiter.checkAndRecord(record.id);
    if (!allowed) {
      throw new ApplicationError(
        'AUTH_API_KEY_RATE_LIMITED',
        'API key rate limit exceeded.',
        429,
      );
    }

    if (input.requiredScope && !record.scopes.includes(input.requiredScope)) {
      throw new ApplicationError('PERMISSION_DENIED', 'API key scope is insufficient.', 403);
    }

    await this.apiKeys.touchUsage(record.id, now, input.clientIp);

    await this.audit.log({
      tenantId: record.tenantId,
      actorType: 'system',
      actorId: record.id,
      action: 'security.apikey.used',
      entityType: 'tenant_api_key',
      entityId: record.id,
      ip: input.clientIp,
      userAgent: input.userAgent,
      metadata: {
        keyPrefix: record.keyPrefix,
      },
    });

    return {
      tenantId: record.tenantId,
      apiKeyId: record.id,
      scopes: record.scopes,
    };
  }
}
