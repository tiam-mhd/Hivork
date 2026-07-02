import { z } from 'zod';

import { CursorPaginationSchema } from '../common/pagination.schema.js';
import { customerValidationMessages } from './customer-validation-messages.js';

export const CustomerNoteAuthorSchema = z.object({
  id: z.string().uuid(customerValidationMessages.uuid),
  name: z.string().min(1),
});

export type CustomerNoteAuthorDto = z.infer<typeof CustomerNoteAuthorSchema>;

/** IFP-047 — structured staff-only internal note */
export const CustomerNoteSchema = z.object({
  id: z.string().uuid(customerValidationMessages.uuid),
  body: z.string().trim().min(1, customerValidationMessages.required).max(5000),
  isPinned: z.boolean(),
  authorStaffId: z.string().uuid(customerValidationMessages.uuid),
  author: CustomerNoteAuthorSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
});

export type CustomerNoteDto = z.infer<typeof CustomerNoteSchema>;

export const CreateCustomerNoteInputSchema = z.object({
  body: z.string().trim().min(1, customerValidationMessages.required).max(5000),
  isPinned: z.boolean().optional(),
});

export type CreateCustomerNoteInputDto = z.infer<typeof CreateCustomerNoteInputSchema>;

export const UpdateCustomerNoteInputSchema = z
  .object({
    body: z.string().trim().min(1, customerValidationMessages.required).max(5000).optional(),
    isPinned: z.boolean().optional(),
  })
  .refine((value) => value.body !== undefined || value.isPinned !== undefined, {
    message: customerValidationMessages.patchRequired,
  });

export type UpdateCustomerNoteInputDto = z.infer<typeof UpdateCustomerNoteInputSchema>;

export const DeleteCustomerNoteBodySchema = z.object({
  deleteReason: z
    .string()
    .trim()
    .max(500, customerValidationMessages.deleteReasonMax)
    .optional(),
});

export type DeleteCustomerNoteBodyDto = z.infer<typeof DeleteCustomerNoteBodySchema>;

export const ListCustomerNotesQuerySchema = CursorPaginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListCustomerNotesQueryDto = z.infer<typeof ListCustomerNotesQuerySchema>;

export const CustomerNoteListResponseSchema = z.object({
  data: z.array(CustomerNoteSchema),
  meta: z.object({
    hasNext: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type CustomerNoteListResponseDto = z.infer<typeof CustomerNoteListResponseSchema>;

export const DeleteCustomerNoteResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    deletedAt: z.string().datetime(),
  }),
});

export type DeleteCustomerNoteResponseDto = z.infer<typeof DeleteCustomerNoteResponseSchema>;
