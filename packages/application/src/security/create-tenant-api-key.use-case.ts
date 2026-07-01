import { ApiKeyScopeSchema } from '@hivork/contracts';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import {
  extractApiKeyPrefix,
  generateApiKeySecret,
  hashApiKey,
  MAX_TENANT_API_KEYS,
} from './api-key.constants.js';
import type { ITenantApiKeyRepository } from './ports/tenant-api-key.repository.port.js';

export type CreateTenantApiKeyInput = {
  tenantId: string;
  actorId: string;
  name: string;
  scopes: string[];
  expiresAt?: string;
  clientIp?: string;
  userAgent?: string;
};

export type CreateTenantApiKeyOutput = {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
};

export class CreateTenantApiKeyUseCase
  implements UseCase<CreateTenantApiKeyInput, CreateTenantApiKeyOutput>
{
  constructor(
    private readonly apiKeys: ITenantApiKeyRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CreateTenantApiKeyInput): Promise<CreateTenantApiKeyOutput> {
    const name = input.name.trim();
    if (!name) {
      throw new ApplicationError('VALIDATION_ERROR', 'API key name is required.', 400);
    }

    const scopes = [...new Set(input.scopes)];
    if (scopes.length === 0) {
      throw new ApplicationError('VALIDATION_ERROR', 'At least one scope is required.', 400);
    }

    for (const scope of scopes) {
      const parsed = ApiKeyScopeSchema.safeParse(scope);
      if (!parsed.success) {
        throw new ApplicationError('VALIDATION_ERROR', `Invalid scope: ${scope}`, 400);
      }
    }

    let expiresAt: Date | null = null;
    if (input.expiresAt) {
      expiresAt = new Date(input.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) {
        throw new ApplicationError('VALIDATION_ERROR', 'expiresAt must be a valid ISO datetime.', 400);
      }
      if (expiresAt.getTime() <= Date.now()) {
        throw new ApplicationError('VALIDATION_ERROR', 'expiresAt must be in the future.', 400);
      }
    }

    const activeCount = await this.apiKeys.countActiveForTenant(input.tenantId);
    if (activeCount >= MAX_TENANT_API_KEYS) {
      throw new ApplicationError(
        'PLAN_LIMIT_EXCEEDED',
        `Maximum of ${MAX_TENANT_API_KEYS} active API keys per tenant.`,
        403,
      );
    }

    if (await this.apiKeys.existsByName(input.tenantId, name)) {
      throw new ApplicationError('API_KEY_NAME_EXISTS', 'An API key with this name already exists.', 409);
    }

    const rawKey = generateApiKeySecret();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = extractApiKeyPrefix(rawKey);

    const created = await this.apiKeys.create({
      tenantId: input.tenantId,
      name,
      keyPrefix,
      keyHash,
      scopes,
      expiresAt,
      createdById: input.actorId,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'security.apikey.created',
      entityType: 'tenant_api_key',
      entityId: created.id,
      ip: input.clientIp,
      userAgent: input.userAgent,
      metadata: {
        name,
        keyPrefix,
        scopes,
        expiresAt: expiresAt?.toISOString() ?? null,
      },
    });

    return {
      id: created.id,
      name: created.name,
      key: rawKey,
      keyPrefix: created.keyPrefix,
      scopes: created.scopes,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
    };
  }
}
