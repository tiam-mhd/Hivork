import { z } from 'zod';

export const GetSettingsQuerySchema = z.object({
  module: z.string().min(1),
});

export type GetSettingsQueryDto = z.infer<typeof GetSettingsQuerySchema>;

export const UpdateSettingBodySchema = z.object({
  value: z.unknown(),
});

export type UpdateSettingBodyDto = z.infer<typeof UpdateSettingBodySchema>;

export {
  DEFAULT_SECURITY_SETTINGS,
  GetSecuritySettingsResponseSchema,
  Ipv4OrCidrSchema,
  SecurityIpAllowlistSchema,
  SecuritySettingsSchema,
  UpdateSecuritySettingsSchema,
  type GetSecuritySettingsResponseDto,
  type SecurityIpAllowlistDto,
  type SecuritySettingsDto,
  type UpdateSecuritySettingsDto,
} from './security-settings.schema.js';
export {
  DEFAULT_PAYMENT_METHOD_CONFIGS,
  GetPaymentMethodSettingsApiResponseSchema,
  GetPaymentMethodSettingsResponseSchema,
  PAYMENT_METHODS_SETTING_KEY,
  PaymentMethodSettingsPatchItemSchema,
  PaymentMethodsSettingValueSchema,
  UpdatePaymentMethodSettingsSchema,
  type GetPaymentMethodSettingsApiResponseDto,
  type GetPaymentMethodSettingsResponseDto,
  type PaymentMethodSettingsPatchItemDto,
  type PaymentMethodsSettingValueDto,
  type UpdatePaymentMethodSettingsDto,
} from './payment-method-settings.schema.js';
export {
  API_KEY_PREFIX,
  API_KEY_RANDOM_LENGTH,
  TENANT_API_KEY_SCOPES,
  ApiKeyScopeSchema,
  ApiKeyStatusSchema,
  ListTenantApiKeysQuerySchema,
  TenantApiKeyListItemSchema,
  ListTenantApiKeysResponseSchema,
  CreateTenantApiKeySchema,
  CreateTenantApiKeyResponseSchema,
  RevokeTenantApiKeyResponseSchema,
  ApiKeyWhoamiResponseSchema,
  type ApiKeyScopeDto,
  type ApiKeyStatusDto,
  type ListTenantApiKeysQueryDto,
  type TenantApiKeyListItemDto,
  type ListTenantApiKeysResponseDto,
  type CreateTenantApiKeyDto,
  type CreateTenantApiKeyResponseDto,
  type RevokeTenantApiKeyResponseDto,
  type ApiKeyWhoamiResponseDto,
} from './api-key.schema.js';
