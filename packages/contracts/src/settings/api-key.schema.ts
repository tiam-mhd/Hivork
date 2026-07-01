import { z } from 'zod';

export const API_KEY_PREFIX = 'hivork_live_';
export const API_KEY_RANDOM_LENGTH = 32;

export const TENANT_API_KEY_SCOPES = [
  'installments.read',
  'customers.read',
  'webhooks.receive',
] as const;

export const ApiKeyScopeSchema = z.enum(TENANT_API_KEY_SCOPES);

export type ApiKeyScopeDto = z.infer<typeof ApiKeyScopeSchema>;

export const ApiKeyStatusSchema = z.enum(['active', 'revoked', 'expired']);

export type ApiKeyStatusDto = z.infer<typeof ApiKeyStatusSchema>;

export const ListTenantApiKeysQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: ApiKeyStatusSchema.optional(),
});

export type ListTenantApiKeysQueryDto = z.infer<typeof ListTenantApiKeysQuerySchema>;

export const TenantApiKeyListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  keyPrefix: z.string(),
  scopes: z.array(z.string()),
  status: ApiKeyStatusSchema,
  expiresAt: z.string().datetime().nullable(),
  lastUsedAt: z.string().datetime().nullable(),
  lastUsedIp: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type TenantApiKeyListItemDto = z.infer<typeof TenantApiKeyListItemSchema>;

export const ListTenantApiKeysResponseSchema = z.object({
  items: z.array(TenantApiKeyListItemSchema),
  nextCursor: z.string().nullable(),
});

export type ListTenantApiKeysResponseDto = z.infer<typeof ListTenantApiKeysResponseSchema>;

export const CreateTenantApiKeySchema = z.object({
  name: z.string().trim().min(1).max(120),
  scopes: z.array(ApiKeyScopeSchema).min(1),
  expiresAt: z.string().datetime().optional(),
});

export type CreateTenantApiKeyDto = z.infer<typeof CreateTenantApiKeySchema>;

export const CreateTenantApiKeyResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  key: z.string().min(1),
  keyPrefix: z.string(),
  scopes: z.array(z.string()),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type CreateTenantApiKeyResponseDto = z.infer<typeof CreateTenantApiKeyResponseSchema>;

export const RevokeTenantApiKeyResponseSchema = z.object({
  success: z.literal(true),
});

export type RevokeTenantApiKeyResponseDto = z.infer<typeof RevokeTenantApiKeyResponseSchema>;

export const ApiKeyWhoamiResponseSchema = z.object({
  tenantId: z.string().uuid(),
  apiKeyId: z.string().uuid(),
  scopes: z.array(z.string()),
});

export type ApiKeyWhoamiResponseDto = z.infer<typeof ApiKeyWhoamiResponseSchema>;
