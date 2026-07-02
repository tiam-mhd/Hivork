import { z } from 'zod';

import { bigintRialNonNegativeSchema } from '../common/money.schema.js';
import { CustomerAddressSchema } from './customer-address.schema.js';
import { ContactPhoneSchema } from './customer-contact-phone.schema.js';
import { EmergencyContactSchema } from './customer-emergency-contact.schema.js';
import {
  GlobalCustomerEmbedSchema,
  PreferredContactChannelSchema,
  TenantCustomerGenderSchema,
  TenantCustomerLinkStatusSchema,
} from './tenant-customer-base.schema.js';

export const TenantCustomerSalesSummarySchema = z.object({
  activeSalesCount: z.number().int().nonnegative(),
  completedSalesCount: z.number().int().nonnegative(),
  totalOverdueRial: bigintRialNonNegativeSchema,
  lastSaleAt: z.string().datetime().nullable(),
});

export type TenantCustomerSalesSummaryDto = z.infer<typeof TenantCustomerSalesSummarySchema>;

export const TenantCustomerGlobalProfileSchema = GlobalCustomerEmbedSchema.extend({
  email: z.string().nullable(),
  nationalId: z.string().nullable(),
  birthDate: z.string().nullable(),
  gender: TenantCustomerGenderSchema.nullable(),
  address: z.string().nullable(),
});

export type TenantCustomerGlobalProfileDto = z.infer<typeof TenantCustomerGlobalProfileSchema>;

export const CustomerCategoryEmbedSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string().nullable().optional(),
});

export type CustomerCategoryEmbedDto = z.infer<typeof CustomerCategoryEmbedSchema>;

export const GetTenantCustomerQuerySchema = z.object({
  include: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
        : [],
    )
    .pipe(z.array(z.enum(['salesSummary']))),
});

export type GetTenantCustomerQueryDto = z.infer<typeof GetTenantCustomerQuerySchema>;

export const TenantCustomerDetailResponseSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  globalCustomer: TenantCustomerGlobalProfileSchema,
  localCode: z.string().nullable(),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
  internalNotes: z.string().nullable(),
  creditScore: z.number().int().min(0).max(100),
  overdueCount: z.number().int().nonnegative(),
  totalPurchaseRial: bigintRialNonNegativeSchema,
  lastPurchaseAt: z.string().datetime().nullable(),
  preferredContactChannel: PreferredContactChannelSchema.nullable(),
  marketingOptIn: z.boolean().nullable(),
  defaultBranchId: z.string().uuid().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  categoryId: z.string().uuid().nullable().optional(),
  category: CustomerCategoryEmbedSchema.nullable().optional(),
  linkStatus: TenantCustomerLinkStatusSchema.optional(),
  status: TenantCustomerLinkStatusSchema.optional(),
  isBlacklisted: z.boolean().optional(),
  blacklistReason: z.string().nullable().optional(),
  assignedStaffId: z.string().uuid().nullable().optional(),
  addresses: z.array(CustomerAddressSchema).optional(),
  emergencyContacts: z.array(EmergencyContactSchema).optional(),
  contactPhones: z.array(ContactPhoneSchema).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  salesSummary: TenantCustomerSalesSummarySchema.optional(),
});

export type TenantCustomerDetailResponseDto = z.infer<typeof TenantCustomerDetailResponseSchema>;

/** Alias for OpenAPI / frontend — enterprise detail with nested relations */
export const TenantCustomerDetailSchema = TenantCustomerDetailResponseSchema;

export type TenantCustomerDetailDto = TenantCustomerDetailResponseDto;
