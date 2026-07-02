import { z } from 'zod';

import { bigintRialNonNegativeSchema, dateOnlySchema } from '../common/money.schema.js';
import { ContractAttachmentSchema } from './contract-attachment.schema.js';
import { ContractVersionSummarySchema } from './contract-version.schema.js';
import { SaleDetailSchema } from './sale.schema.js';

/** Enterprise sale statuses — extends Phase 1 active | completed | cancelled. */
export const SaleStatusSchema = z.enum([
  'active',
  'completed',
  'cancelled',
  'terminated',
  'closed',
  'archived',
]);

export type SaleStatusDto = z.infer<typeof SaleStatusSchema>;

export const ContractSignatureStatusSchema = z.enum(['unsigned', 'pending', 'signed']);

export type ContractSignatureStatusDto = z.infer<typeof ContractSignatureStatusSchema>;

const contractReasonSchema = z.string().trim().min(3).max(500);

export const SaleDetailEnterpriseSchema = SaleDetailSchema.extend({
  status: SaleStatusSchema,
  contractNumber: z.string().max(50).nullable(),
  customTerms: z.string().max(10000).nullable(),
  signatureStatus: ContractSignatureStatusSchema,
  signedAt: z.string().datetime().nullable(),
  insuranceRial: bigintRialNonNegativeSchema.nullable(),
  insuranceProvider: z.string().max(200).nullable(),
  insurancePolicyNumber: z.string().max(100).nullable(),
  insuranceExpiresAt: dateOnlySchema.nullable(),
  insuranceExpiredWarning: z.boolean().optional(),
  taxRateBps: z.number().int().min(0).max(10000).nullable(),
  taxInclusive: z.boolean(),
  extendedFromSaleId: z.string().uuid().nullable(),
  copiedFromSaleId: z.string().uuid().nullable(),
  terminatedAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
  archivedAt: z.string().datetime().nullable(),
  versions: z.array(ContractVersionSummarySchema).optional(),
  attachments: z.array(ContractAttachmentSchema).optional(),
});

export type SaleDetailEnterpriseDto = z.infer<typeof SaleDetailEnterpriseSchema>;

export const ExtendContractSchema = z.object({
  newLastDueDate: dateOnlySchema,
  additionalInstallmentCount: z.number().int().min(0).max(120).optional(),
  reason: contractReasonSchema,
  regenerateSchedule: z.boolean().default(false),
});

export type ExtendContractDto = z.infer<typeof ExtendContractSchema>;

export const CopyContractSchema = z.object({
  tenantCustomerId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  contractDate: dateOnlySchema,
  firstDueDate: dateOnlySchema,
  copyAttachments: z.boolean().default(false),
  copyGuarantors: z.boolean().default(true),
  reason: contractReasonSchema,
});

export type CopyContractDto = z.infer<typeof CopyContractSchema>;

export const TerminateContractSchema = z.object({
  reason: contractReasonSchema,
  effectiveDate: dateOnlySchema.optional(),
});

export type TerminateContractDto = z.infer<typeof TerminateContractSchema>;

export const CloseContractSchema = z.object({
  reason: contractReasonSchema,
  waiveRemaining: z.boolean().default(false),
});

export type CloseContractDto = z.infer<typeof CloseContractSchema>;

export const ArchiveContractSchema = z.object({
  reason: contractReasonSchema,
});

export type ArchiveContractDto = z.infer<typeof ArchiveContractSchema>;

export const SoftDeleteSaleSchema = z.object({
  reason: contractReasonSchema,
});

export type SoftDeleteSaleDto = z.infer<typeof SoftDeleteSaleSchema>;

export const ChangeSaleStatusSchema = z.object({
  targetStatus: SaleStatusSchema,
  reason: contractReasonSchema,
});

export type ChangeSaleStatusDto = z.infer<typeof ChangeSaleStatusSchema>;
