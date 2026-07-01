import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { ITenantApiKeyRepository } from './ports/tenant-api-key.repository.port.js';

export type RevokeTenantApiKeyInput = {
  tenantId: string;
  apiKeyId: string;
  actorId: string;
  reason?: string;
  clientIp?: string;
  userAgent?: string;
};

export type RevokeTenantApiKeyOutput = {
  success: true;
};

export class RevokeTenantApiKeyUseCase
  implements UseCase<RevokeTenantApiKeyInput, RevokeTenantApiKeyOutput>
{
  constructor(
    private readonly apiKeys: ITenantApiKeyRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RevokeTenantApiKeyInput): Promise<RevokeTenantApiKeyOutput> {
    const revoked = await this.apiKeys.revoke(
      input.tenantId,
      input.apiKeyId,
      input.actorId,
      input.reason ?? 'revoked_by_staff',
    );

    if (!revoked) {
      throw new ApplicationError('API_KEY_NOT_FOUND', 'API key was not found.', 404);
    }

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'security.apikey.revoked',
      entityType: 'tenant_api_key',
      entityId: revoked.id,
      ip: input.clientIp,
      userAgent: input.userAgent,
      metadata: {
        name: revoked.name,
        keyPrefix: revoked.keyPrefix,
      },
    });

    return { success: true };
  }
}
