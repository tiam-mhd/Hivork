import { z } from 'zod';

import { customerValidationMessages } from './customer-validation-messages.js';

export const CustomerDocumentTypeSchema = z.enum([
  'national_id',
  'birth_certificate',
  'contract',
  'photo',
  'other',
]);

export type CustomerDocumentTypeDto = z.infer<typeof CustomerDocumentTypeSchema>;

/** IFP-043 prep — document metadata response */
export const CustomerDocumentSchema = z.object({
  id: z.string().uuid(customerValidationMessages.uuid),
  documentType: CustomerDocumentTypeSchema,
  originalFileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.string().regex(/^\d+$/),
  description: z.string().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  uploadedById: z.string().uuid(customerValidationMessages.uuid),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
});

export type CustomerDocumentDto = z.infer<typeof CustomerDocumentSchema>;

export const UploadCustomerDocumentBodySchema = z.object({
  documentType: CustomerDocumentTypeSchema,
  description: z.string().trim().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
});

export type UploadCustomerDocumentBodyDto = z.infer<typeof UploadCustomerDocumentBodySchema>;

export const ListCustomerDocumentsQuerySchema = z.object({
  documentType: CustomerDocumentTypeSchema.optional(),
});

export type ListCustomerDocumentsQueryDto = z.infer<typeof ListCustomerDocumentsQuerySchema>;

export const CustomerDocumentListResponseSchema = z.object({
  data: z.array(CustomerDocumentSchema),
});

export type CustomerDocumentListResponseDto = z.infer<typeof CustomerDocumentListResponseSchema>;

export const DeleteCustomerDocumentBodySchema = z.object({
  deleteReason: z.string().trim().max(500).optional(),
});

export type DeleteCustomerDocumentBodyDto = z.infer<typeof DeleteCustomerDocumentBodySchema>;

export const CustomerDocumentDownloadResponseSchema = z.object({
  data: z.object({
    url: z.string().url(),
    expiresAt: z.string().datetime(),
  }),
});

export type CustomerDocumentDownloadResponseDto = z.infer<
  typeof CustomerDocumentDownloadResponseSchema
>;
