export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export type TenantApiKeyRecord = {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  status: ApiKeyStatus;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  version: number;
};

export type TenantApiKeyListItem = {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: ApiKeyStatus;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  createdAt: Date;
};

export type ListTenantApiKeysOptions = {
  tenantId: string;
  cursor?: string;
  limit: number;
  status?: ApiKeyStatus;
};

export type ListTenantApiKeysResult = {
  items: TenantApiKeyListItem[];
  hasNext: boolean;
};

export type CreateTenantApiKeyRecordInput = {
  tenantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  expiresAt: Date | null;
  createdById: string;
};

export interface ITenantApiKeyRepository {
  countActiveForTenant(tenantId: string): Promise<number>;
  existsByName(tenantId: string, name: string): Promise<boolean>;
  create(input: CreateTenantApiKeyRecordInput): Promise<TenantApiKeyRecord>;
  findByIdForTenant(tenantId: string, id: string): Promise<TenantApiKeyRecord | null>;
  findByKeyHash(keyHash: string): Promise<TenantApiKeyRecord | null>;
  listForTenant(options: ListTenantApiKeysOptions): Promise<ListTenantApiKeysResult>;
  revoke(
    tenantId: string,
    id: string,
    actorId: string,
    reason?: string,
  ): Promise<TenantApiKeyRecord | null>;
  touchUsage(id: string, usedAt: Date, ip?: string): Promise<void>;
  markExpiredKeys(before: Date): Promise<number>;
}
