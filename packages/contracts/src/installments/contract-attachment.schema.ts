import { z } from 'zod';

export const ContractAttachmentTypeSchema = z.enum([
  'contract_scan',
  'signed_contract',
  'identity_doc',
  'collateral_doc',
  'other',
]);

export type ContractAttachmentTypeDto = z.infer<typeof ContractAttachmentTypeSchema>;

export const ContractAttachmentSchema = z.object({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  fileId: z.string().uuid(),
  attachmentType: ContractAttachmentTypeSchema,
  label: z.string().max(200).nullable(),
  description: z.string().max(2000).nullable(),
  sortOrder: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdById: z.string().uuid().nullable(),
  version: z.number().int().positive(),
});

export type ContractAttachmentDto = z.infer<typeof ContractAttachmentSchema>;

export const CreateContractAttachmentSchema = z.object({
  fileId: z.string().uuid(),
  attachmentType: ContractAttachmentTypeSchema,
  label: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  sortOrder: z.number().int().nonnegative().max(9999).optional(),
});

export type CreateContractAttachmentDto = z.infer<typeof CreateContractAttachmentSchema>;

export const ContractAttachmentListResponseSchema = z.object({
  data: z.array(ContractAttachmentSchema),
});

export type ContractAttachmentListResponseDto = z.infer<typeof ContractAttachmentListResponseSchema>;

export const DeleteContractAttachmentBodySchema = z.object({
  deleteReason: z.string().trim().min(3).max(500).optional(),
});

export type DeleteContractAttachmentBodyDto = z.infer<typeof DeleteContractAttachmentBodySchema>;
