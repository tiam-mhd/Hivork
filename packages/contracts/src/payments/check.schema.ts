import { z } from 'zod';

import { bigintRialStringSchema } from '../common/money.schema.js';

const jalaliDateInputSchema = z
  .string()
  .trim()
  .regex(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/, 'Invalid Jalali date format');

export const CheckTypeDtoSchema = z.enum(['received', 'payable']);
export type CheckTypeDto = z.infer<typeof CheckTypeDtoSchema>;

export const CheckStatusDtoSchema = z.enum([
  'registered',
  'due',
  'collected',
  'bounced',
  'transferred',
  'cancelled',
]);
export type CheckStatusDto = z.infer<typeof CheckStatusDtoSchema>;

export const CheckSummarySchema = z.object({
  id: z.string().uuid(),
  checkType: CheckTypeDtoSchema,
  status: CheckStatusDtoSchema,
  checkNumber: z.string(),
  bankName: z.string(),
  amountRial: bigintRialStringSchema,
  dueDate: z.string().datetime(),
  branchId: z.string().uuid().optional(),
  installmentId: z.string().uuid().nullable().optional(),
  paymentAttemptId: z.string().uuid().nullable().optional(),
  drawerName: z.string().optional(),
  bankBranchCode: z.string().nullable().optional(),
  sayadId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export type CheckSummaryDto = z.infer<typeof CheckSummarySchema>;

export const RegisterReceivedCheckBodySchema = z.object({
  checkNumber: z.string().trim().min(1).max(64),
  bankName: z.string().trim().min(1).max(128),
  bankBranchCode: z.string().trim().max(32).optional(),
  amountRial: bigintRialStringSchema,
  dueDate: jalaliDateInputSchema,
  drawerName: z.string().trim().min(1).max(128),
  sayadId: z.string().trim().max(32).optional(),
  installmentId: z.string().uuid().optional(),
  paymentAttemptId: z.string().uuid().optional(),
  note: z.string().trim().max(500).optional(),
});

export type RegisterReceivedCheckBodyDto = z.infer<typeof RegisterReceivedCheckBodySchema>;

export const RegisterReceivedCheckResponseSchema = z.object({
  check: CheckSummarySchema.pick({
    id: true,
    checkType: true,
    status: true,
    checkNumber: true,
    amountRial: true,
    dueDate: true,
  }),
});

export type RegisterReceivedCheckResponseDto = z.infer<
  typeof RegisterReceivedCheckResponseSchema
>;

export const ListChecksQuerySchema = z.object({
  checkType: CheckTypeDtoSchema.optional(),
  status: CheckStatusDtoSchema.optional(),
  dueFrom: jalaliDateInputSchema.optional(),
  dueTo: jalaliDateInputSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListChecksQueryDto = z.infer<typeof ListChecksQuerySchema>;

export const ListChecksResponseSchema = z.object({
  items: z.array(CheckSummarySchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type ListChecksResponseDto = z.infer<typeof ListChecksResponseSchema>;

export const RegisterPayableCheckBodySchema = z.object({
  checkNumber: z.string().trim().min(1).max(64),
  bankName: z.string().trim().min(1).max(128),
  bankBranchCode: z.string().trim().max(32).optional(),
  amountRial: bigintRialStringSchema,
  dueDate: jalaliDateInputSchema,
  payeeName: z.string().trim().min(1).max(128),
  sayadId: z.string().trim().max(32).optional(),
  note: z.string().trim().max(500).optional(),
});

export type RegisterPayableCheckBodyDto = z.infer<typeof RegisterPayableCheckBodySchema>;

export const RegisterPayableCheckResponseSchema = RegisterReceivedCheckResponseSchema;
export type RegisterPayableCheckResponseDto = RegisterReceivedCheckResponseDto;

export const MarkCheckBouncedBodySchema = z.object({
  bounceReason: z.string().trim().min(1).max(500),
  bouncedAt: z.string().datetime().optional(),
});

export type MarkCheckBouncedBodyDto = z.infer<typeof MarkCheckBouncedBodySchema>;

export const MarkCheckBouncedResponseSchema = z.object({
  check: CheckSummarySchema,
});

export type MarkCheckBouncedResponseDto = z.infer<typeof MarkCheckBouncedResponseSchema>;

export const CollectCheckBodySchema = z.object({
  collectedAt: z.string().datetime().optional(),
  bankDepositRef: z.string().trim().max(128).optional(),
  confirmInstallment: z.boolean().default(true),
});

export type CollectCheckBodyDto = z.infer<typeof CollectCheckBodySchema>;

export const CollectCheckResponseSchema = z.object({
  check: CheckSummarySchema,
  ledgerEntryId: z.string().uuid().optional(),
  installment: z
    .object({
      id: z.string().uuid(),
      status: z.string(),
      paidAt: z.string().datetime().nullable().optional(),
    })
    .optional(),
  idempotentReplay: z.boolean().optional(),
});

export type CollectCheckResponseDto = z.infer<typeof CollectCheckResponseSchema>;

export const TransferCheckBodySchema = z.object({
  transferredTo: z.string().trim().min(1).max(128),
  transferReason: z.string().trim().max(500).optional(),
  transferredAt: z.string().datetime().optional(),
});

export type TransferCheckBodyDto = z.infer<typeof TransferCheckBodySchema>;

export const TransferCheckResponseSchema = z.object({
  check: CheckSummarySchema,
});

export type TransferCheckResponseDto = z.infer<typeof TransferCheckResponseSchema>;
