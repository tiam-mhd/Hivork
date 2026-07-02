import { z } from 'zod';

import { ThemeIdSchema } from '../theme/theme-definition.schema.js';

export const TenantSettingsSchema = z.object({
  themeId: ThemeIdSchema.optional(),
});

export type TenantSettingsDto = z.infer<typeof TenantSettingsSchema>;

export const TenantResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  legalName: z.string().nullable(),
  taxId: z.string().nullable(),
  logoUrl: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  status: z.enum(['trial', 'active', 'suspended']),
  timezone: z.string(),
  locale: z.enum(['fa_IR', 'en_US']),
  enabledModules: z.array(z.string()),
  trialEndsAt: z.string().datetime().nullable(),
  onboardingCompletedAt: z.string().datetime().nullable(),
  settings: TenantSettingsSchema.optional(),
});

export type TenantResponseDto = z.infer<typeof TenantResponseSchema>;
