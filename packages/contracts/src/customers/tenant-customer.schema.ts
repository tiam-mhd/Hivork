import { z } from 'zod';

import { bigintRialNonNegativeSchema } from '../common/money.schema.js';
import {
  GlobalCustomerEmbedSchema,
  PreferredContactChannelSchema,
  TenantCustomerGenderSchema,
  TenantCustomerLinkStatusSchema,
  TenantCustomerStatusSchema,
} from './tenant-customer-base.schema.js';

export {
  CustomerAddressInputSchema,
  CustomerAddressSchema,
  CustomerAddressLabelSchema,
  type CustomerAddressInputDto,
  type CustomerAddressDto,
  type CustomerAddressLabelDto,
} from './customer-address.schema.js';

export {
  CustomerEmergencyContactInputSchema,
  EmergencyContactSchema,
  EmergencyContactRelationSchema,
  type CustomerEmergencyContactInputDto,
  type EmergencyContactDto,
  type EmergencyContactRelationDto,
} from './customer-emergency-contact.schema.js';

export {
  CustomerContactPhoneInputSchema,
  ContactPhoneSchema,
  CustomerContactPhoneLabelSchema,
  type CustomerContactPhoneInputDto,
  type ContactPhoneDto,
  type CustomerContactPhoneLabelDto,
} from './customer-contact-phone.schema.js';

export {
  CreateTenantCustomerEnterpriseFieldsSchema,
  type CreateTenantCustomerEnterpriseFieldsDto,
} from './customer-enterprise.schema.js';

export {
  GlobalCustomerEmbedSchema,
  PreferredContactChannelSchema,
  TenantCustomerGenderSchema,
  TenantCustomerStatusSchema,
  TenantCustomerLinkStatusSchema,
  type GlobalCustomerEmbedDto,
  type PreferredContactChannelDto,
  type TenantCustomerGenderDto,
  type TenantCustomerStatusDto,
  type TenantCustomerLinkStatusDto,
} from './tenant-customer-base.schema.js';

export { CreateTenantCustomerSchema, type CreateTenantCustomerDto } from './create-tenant-customer.schema.js';

export { UpdateTenantCustomerSchema, type UpdateTenantCustomerDto } from './update-tenant-customer.schema.js';

export {
  ImportCustomerErrorSchema,
  ImportCustomerRowErrorCodeSchema,
  ImportCustomersResultSchema,
  ImportCustomersQuerySchema,
  type ImportCustomerErrorDto,
  type ImportCustomerRowErrorCodeDto,
  type ImportCustomersResultDto,
  type ImportCustomersQueryDto,
} from './import-customers.schema.js';

export {
  ListCustomersQuerySchema,
  CustomerListQuerySchema,
  ExportCustomersRequestSchema,
  ExportCustomersQuerySchema,
  TenantCustomerListSortSchema,
  TenantCustomerListItemSchema,
  TenantCustomerListResponseSchema,
  TenantCustomerListLinkStatusFilterSchema,
  type ListCustomersQueryDto,
  type CustomerListQueryDto,
  type ExportCustomersRequestDto,
  type ExportCustomersQueryDto,
  type TenantCustomerListSortDto,
  type TenantCustomerListItemDto,
  type TenantCustomerListResponseDto,
  type TenantCustomerListLinkStatusFilterDto,
} from './list-customers-query.schema.js';

export const TenantCustomerSummarySchema = z.object({
  id: z.string().uuid(),
  globalCustomer: GlobalCustomerEmbedSchema,
  localCode: z.string().nullable().optional(),
  tags: z.array(z.string()),
  creditScore: z.number().int().min(0).max(100).nullable().optional(),
  overdueCount: z.number().int().nonnegative().optional(),
  totalPurchaseRial: bigintRialNonNegativeSchema.optional(),
  lastPurchaseAt: z.string().datetime().nullable().optional(),
  preferredContactChannel: PreferredContactChannelSchema.nullable().optional(),
  defaultBranchId: z.string().uuid().nullable().optional(),
  linkStatus: TenantCustomerLinkStatusSchema.optional(),
  status: TenantCustomerStatusSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  version: z.number().int().positive().optional(),
});

export type TenantCustomerSummaryDto = z.infer<typeof TenantCustomerSummarySchema>;

export const SalesSummaryEmbedSchema = z.object({
  activeSaleCount: z.number().int().nonnegative(),
  totalOutstandingRial: bigintRialNonNegativeSchema,
  lastSaleAt: z.string().datetime().nullable(),
});

export type SalesSummaryEmbedDto = z.infer<typeof SalesSummaryEmbedSchema>;

/** @deprecated Phase 0 list item — use `TenantCustomerListItemSchema` from list-customers-query.schema */
export const LegacyCustomerListItemSchema = z.object({
  id: z.string().uuid(),
  localCode: z.string().nullable(),
  defaultBranchId: z.string().uuid().nullable(),
  creditScore: z.number().int(),
  overdueCount: z.number().int(),
  createdAt: z.string().datetime(),
  customer: GlobalCustomerEmbedSchema,
});

export type LegacyCustomerListItemDto = z.infer<typeof LegacyCustomerListItemSchema>;

/** @deprecated Phase 0 list response — use `TenantCustomerListResponseSchema` */
export const CustomerListResponseSchema = z.object({
  items: z.array(LegacyCustomerListItemSchema),
  nextCursor: z.string().nullable(),
});

export type CustomerListResponseDto = z.infer<typeof CustomerListResponseSchema>;

/** Full create/get response — enterprise shape with nested `customer` */
export const TenantCustomerResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  globalCustomerId: z.string().uuid(),
  localCode: z.string().nullable(),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
  internalNotes: z.string().nullable(),
  defaultBranchId: z.string().uuid().nullable(),
  preferredContactChannel: PreferredContactChannelSchema.nullable(),
  marketingOptIn: z.boolean().nullable(),
  creditScore: z.number().int().min(0).max(100),
  overdueCount: z.number().int().nonnegative(),
  totalPurchaseRial: bigintRialNonNegativeSchema,
  lastPurchaseAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  version: z.number().int().positive().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  linkStatus: TenantCustomerLinkStatusSchema.optional(),
  status: TenantCustomerLinkStatusSchema.optional(),
  isBlacklisted: z.boolean().optional(),
  blacklistReason: z.string().nullable().optional(),
  assignedStaffId: z.string().uuid().nullable().optional(),
  addresses: z
    .array(
      z.object({
        id: z.string().uuid(),
        label: z.enum(['home', 'work', 'billing', 'other']).optional(),
        line1: z.string(),
        line2: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        province: z.string().nullable().optional(),
        postalCode: z.string().nullable().optional(),
        isPrimary: z.boolean(),
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
      }),
    )
    .optional(),
  emergencyContacts: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        phone: z.string(),
        relation: z.enum(['parent', 'spouse', 'sibling', 'other']).optional(),
        isPrimary: z.boolean(),
      }),
    )
    .optional(),
  contactPhones: z
    .array(
      z.object({
        id: z.string().uuid(),
        phone: z.string(),
        label: z.enum(['mobile', 'home', 'work', 'other']).optional(),
        isWhatsApp: z.boolean(),
        isPrimarySecondary: z.boolean(),
        notes: z.string().nullable().optional(),
      }),
    )
    .optional(),
  customer: GlobalCustomerEmbedSchema.extend({
    email: z.string().nullable().optional(),
    nationalId: z.string().nullable().optional(),
    birthDate: z.string().nullable().optional(),
    gender: TenantCustomerGenderSchema.nullable().optional(),
    address: z.string().nullable().optional(),
    preferredContactChannel: PreferredContactChannelSchema.nullable().optional(),
    marketingOptIn: z.boolean().optional(),
    status: TenantCustomerStatusSchema.optional(),
  }),
});

export type TenantCustomerResponseDto = z.infer<typeof TenantCustomerResponseSchema>;

export {
  GetTenantCustomerQuerySchema,
  TenantCustomerDetailResponseSchema,
  TenantCustomerDetailSchema,
  TenantCustomerGlobalProfileSchema,
  TenantCustomerSalesSummarySchema,
  CustomerCategoryEmbedSchema,
  type GetTenantCustomerQueryDto,
  type TenantCustomerDetailResponseDto,
  type TenantCustomerDetailDto,
  type TenantCustomerGlobalProfileDto,
  type TenantCustomerSalesSummaryDto,
  type CustomerCategoryEmbedDto,
} from './tenant-customer-detail.schema.js';

export {
  CustomerDocumentSchema,
  CustomerDocumentTypeSchema,
  UploadCustomerDocumentBodySchema,
  ListCustomerDocumentsQuerySchema,
  CustomerDocumentListResponseSchema,
  DeleteCustomerDocumentBodySchema,
  CustomerDocumentDownloadResponseSchema,
  type CustomerDocumentDto,
  type CustomerDocumentTypeDto,
  type UploadCustomerDocumentBodyDto,
  type ListCustomerDocumentsQueryDto,
  type CustomerDocumentListResponseDto,
  type DeleteCustomerDocumentBodyDto,
  type CustomerDocumentDownloadResponseDto,
} from './customer-document.schema.js';

export {
  CustomerNoteSchema,
  CreateCustomerNoteInputSchema,
  type CustomerNoteDto,
  type CreateCustomerNoteInputDto,
} from './customer-note.schema.js';

export { MergeCustomersSchema, type MergeCustomersDto } from './merge-customers.schema.js';

export { customerValidationMessages } from './customer-validation-messages.js';
