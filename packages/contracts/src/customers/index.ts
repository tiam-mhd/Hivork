import { z } from 'zod';

import { PaginationQuerySchema } from '../common/pagination.schema.js';
import { TenantCustomerDetailResponseSchema } from './tenant-customer-detail.schema.js';
import { customerValidationMessages } from './customer-validation-messages.js';

export {
  CreateTenantCustomerSchema,
  CustomerListQuerySchema,
  CustomerListResponseSchema,
  GlobalCustomerEmbedSchema,
  ImportCustomerErrorSchema,
  ImportCustomerRowErrorCodeSchema,
  ImportCustomersResultSchema,
  ImportCustomersQuerySchema,
  ListCustomersQuerySchema,
  ExportCustomersRequestSchema,
  ExportCustomersQuerySchema,
  PreferredContactChannelSchema,
  SalesSummaryEmbedSchema,
  TenantCustomerDetailSchema,
  TenantCustomerDetailResponseSchema,
  GetTenantCustomerQuerySchema,
  TenantCustomerGlobalProfileSchema,
  TenantCustomerSalesSummarySchema,
  CustomerCategoryEmbedSchema,
  TenantCustomerGenderSchema,
  TenantCustomerListItemSchema,
  TenantCustomerListResponseSchema,
  TenantCustomerListSortSchema,
  TenantCustomerListLinkStatusFilterSchema,
  TenantCustomerResponseSchema,
  TenantCustomerStatusSchema,
  TenantCustomerLinkStatusSchema,
  TenantCustomerSummarySchema,
  UpdateTenantCustomerSchema,
  CustomerAddressInputSchema,
  CustomerAddressSchema,
  CustomerAddressLabelSchema,
  type CustomerAddressLabelDto,
  CustomerEmergencyContactInputSchema,
  EmergencyContactSchema,
  CustomerContactPhoneInputSchema,
  ContactPhoneSchema,
  CustomerDocumentSchema,
  CustomerDocumentTypeSchema,
  UploadCustomerDocumentBodySchema,
  ListCustomerDocumentsQuerySchema,
  CustomerDocumentListResponseSchema,
  DeleteCustomerDocumentBodySchema,
  CustomerDocumentDownloadResponseSchema,
  MergeCustomersSchema,
  customerValidationMessages,
  type CreateTenantCustomerDto,
  type CustomerListQueryDto,
  type CustomerListResponseDto,
  type GlobalCustomerEmbedDto,
  type ImportCustomerErrorDto,
  type ImportCustomerRowErrorCodeDto,
  type ImportCustomersResultDto,
  type ImportCustomersQueryDto,
  type ListCustomersQueryDto,
  type ExportCustomersRequestDto,
  type ExportCustomersQueryDto,
  type PreferredContactChannelDto,
  type SalesSummaryEmbedDto,
  type TenantCustomerDetailDto,
  type TenantCustomerDetailResponseDto,
  type GetTenantCustomerQueryDto,
  type TenantCustomerGlobalProfileDto,
  type TenantCustomerSalesSummaryDto,
  type CustomerCategoryEmbedDto,
  type TenantCustomerGenderDto,
  type TenantCustomerListItemDto,
  type TenantCustomerListResponseDto,
  type TenantCustomerListSortDto,
  type TenantCustomerListLinkStatusFilterDto,
  type TenantCustomerResponseDto,
  type TenantCustomerStatusDto,
  type TenantCustomerLinkStatusDto,
  type TenantCustomerSummaryDto,
  type UpdateTenantCustomerDto,
  type CustomerAddressInputDto,
  type CustomerAddressDto,
  type CustomerEmergencyContactInputDto,
  type EmergencyContactDto,
  type CustomerContactPhoneInputDto,
  type ContactPhoneDto,
  type CustomerDocumentDto,
  type CustomerDocumentTypeDto,
  type UploadCustomerDocumentBodyDto,
  type ListCustomerDocumentsQueryDto,
  type CustomerDocumentListResponseDto,
  type DeleteCustomerDocumentBodyDto,
  type CustomerDocumentDownloadResponseDto,
  type MergeCustomersDto,
} from './tenant-customer.schema.js';

export {
  BulkTagCustomersSchema,
  BulkTagCustomersResponseSchema,
  BulkUntagCustomersSchema,
  type BulkTagCustomersDto,
  type BulkTagCustomersResponseDto,
  type BulkUntagCustomersDto,
} from './bulk-tag.schema.js';

export const SoftDeleteCustomerBodySchema = z.object({
  deleteReason: z
    .string()
    .trim()
    .max(500, customerValidationMessages.deleteReasonMax)
    .optional(),
});

export const DeleteCustomerSchema = SoftDeleteCustomerBodySchema;

export type SoftDeleteCustomerBodyDto = z.infer<typeof SoftDeleteCustomerBodySchema>;
export type DeleteCustomerDto = SoftDeleteCustomerBodyDto;

export const ArchiveCustomerSchema = z.object({}).strict();

export type ArchiveCustomerDto = z.infer<typeof ArchiveCustomerSchema>;

export const RestoreCustomerResponseSchema = z.object({
  id: z.string().uuid(),
  restoredAt: z.string().datetime(),
  customer: TenantCustomerDetailResponseSchema,
});

export type RestoreCustomerResponseDto = z.infer<typeof RestoreCustomerResponseSchema>;

export const ListDeletedCustomersQuerySchema = PaginationQuerySchema.pick({ limit: true }).extend({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListDeletedCustomersQueryDto = z.infer<typeof ListDeletedCustomersQuerySchema>;

export {
  CustomerTimelineEventTypeSchema,
  CustomerTimelineEntityRefSchema,
  CustomerTimelineActorSchema,
  CustomerTimelineEventSchema,
  ListCustomerTimelineQuerySchema,
  CustomerTimelineListResponseSchema,
  type CustomerTimelineEventTypeDto,
  type CustomerTimelineEntityRefDto,
  type CustomerTimelineActorDto,
  type CustomerTimelineEventDto,
  type ListCustomerTimelineQueryDto,
  type CustomerTimelineListResponseDto,
} from './customer-timeline.schema.js';

export {
  CustomerNoteAuthorSchema,
  CustomerNoteSchema,
  CreateCustomerNoteInputSchema,
  UpdateCustomerNoteInputSchema,
  DeleteCustomerNoteBodySchema,
  ListCustomerNotesQuerySchema,
  CustomerNoteListResponseSchema,
  DeleteCustomerNoteResponseSchema,
  type CustomerNoteAuthorDto,
  type CustomerNoteDto,
  type CreateCustomerNoteInputDto,
  type UpdateCustomerNoteInputDto,
  type DeleteCustomerNoteBodyDto,
  type ListCustomerNotesQueryDto,
  type CustomerNoteListResponseDto,
  type DeleteCustomerNoteResponseDto,
} from './customer-note.schema.js';

export {
  CustomerPaymentMethodSchema,
  CustomerPaymentListItemSchema,
  CustomerPaymentSummarySchema,
  ListCustomerPaymentsQuerySchema,
  CustomerPaymentListResponseSchema,
  type CustomerPaymentMethodDto,
  type CustomerPaymentListItemDto,
  type CustomerPaymentSummaryDto,
  type ListCustomerPaymentsQueryDto,
  type CustomerPaymentListResponseDto,
} from './list-customer-payments.schema.js';

export {
  CustomerContractStatusSchema,
  CustomerContractListItemSchema,
  ListCustomerContractsQuerySchema,
  CustomerContractListResponseSchema,
  type CustomerContractStatusDto,
  type CustomerContractListItemDto,
  type ListCustomerContractsQueryDto,
  type CustomerContractListResponseDto,
} from './list-customer-contracts.schema.js';

export {
  MergeCustomersResponseSchema,
  type MergeCustomersResponseDto,
} from './merge-customers.schema.js';

export {
  TransferCustomerOwnershipSchema,
  TransferCustomerOwnershipResponseSchema,
  type TransferCustomerOwnershipDto,
  type TransferCustomerOwnershipResponseDto,
} from './transfer-customer-ownership.schema.js';

export {
  AdjustCustomerScoreSchema,
  AdjustCustomerScoreResponseSchema,
  BlacklistCustomerSchema,
  BlacklistCustomerResponseSchema,
  UnblacklistCustomerSchema,
  UnblacklistCustomerResponseSchema,
  type AdjustCustomerScoreDto,
  type AdjustCustomerScoreResponseDto,
  type BlacklistCustomerDto,
  type BlacklistCustomerResponseDto,
  type UnblacklistCustomerDto,
  type UnblacklistCustomerResponseDto,
} from './customer-scoring.schema.js';
