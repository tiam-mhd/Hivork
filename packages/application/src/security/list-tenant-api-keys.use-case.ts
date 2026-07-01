import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import { encodeTenantApiKeyCursor } from './tenant-api-key-cursor.js';
import type {
  ITenantApiKeyRepository,
  TenantApiKeyListItem,
} from './ports/tenant-api-key.repository.port.js';

export type ListTenantApiKeysInput = {
  tenantId: string;
  cursor?: string;
  limit?: number;
  status?: 'active' | 'revoked' | 'expired';
};

export type ListTenantApiKeysOutput = {
  items: Array<{
    id: string;
    name: string;
    keyPrefix: string;
    scopes: string[];
    status: TenantApiKeyListItem['status'];
    expiresAt: string | null;
    lastUsedAt: string | null;
    lastUsedIp: string | null;
    createdAt: string;
  }>;
  nextCursor: string | null;
};

export class ListTenantApiKeysUseCase
  implements UseCase<ListTenantApiKeysInput, ListTenantApiKeysOutput>
{
  constructor(private readonly apiKeys: ITenantApiKeyRepository) {}

  async execute(input: ListTenantApiKeysInput): Promise<ListTenantApiKeysOutput> {
    const limit = input.limit ?? 20;
    if (limit < 1 || limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    const page = await this.apiKeys.listForTenant({
      tenantId: input.tenantId,
      cursor: input.cursor,
      limit,
      status: input.status,
    });

    const items = page.items.map((row) => ({
      id: row.id,
      name: row.name,
      keyPrefix: row.keyPrefix,
      scopes: row.scopes,
      status: row.status,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      lastUsedIp: row.lastUsedIp,
      createdAt: row.createdAt.toISOString(),
    }));

    const last = page.items.at(-1);
    const nextCursor =
      page.hasNext && last ? encodeTenantApiKeyCursor(last.createdAt, last.id) : null;

    return { items, nextCursor };
  }
}
