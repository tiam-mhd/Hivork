import { z } from 'zod';

import { phoneSchema } from '../common/phone.schema.js';

export const PreferredContactChannelSchema = z.enum(['telegram', 'bale', 'sms', 'phone']);

export type PreferredContactChannelDto = z.infer<typeof PreferredContactChannelSchema>;

export const TenantCustomerGenderSchema = z.enum(['male', 'female', 'other', 'unspecified']);

export type TenantCustomerGenderDto = z.infer<typeof TenantCustomerGenderSchema>;

export const TenantCustomerStatusSchema = z.enum(['active', 'suspended']);

export type TenantCustomerStatusDto = z.infer<typeof TenantCustomerStatusSchema>;

export const GlobalCustomerEmbedSchema = z.object({
  id: z.string().uuid(),
  phone: phoneSchema,
  name: z.string().nullable(),
});

export type GlobalCustomerEmbedDto = z.infer<typeof GlobalCustomerEmbedSchema>;
