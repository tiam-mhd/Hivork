import { z } from 'zod';

import {
  bigintRialNonNegativeSchema,
  bigintRialPositiveSchema,
  dateOnlySchema,
} from '../common/money.schema.js';
import { PaymentAttemptStatusSchema } from './payment.schema.js';

/** Payment method codes stored in PaymentAttempt.metadata.method (IFP-086 / EXCELLENCE §8). */
export const PaymentMethodSchema = z.enum([
  'cash',
  'manual',
  'bank_transfer',
  'online',
  'pos',
  'check',
  'fee',
]);

export type PaymentMethodDto = z.infer<typeof PaymentMethodSchema>;

export const ReportedByTypeSchema = z.enum(['staff', 'customer']);

export type ReportedByTypeDto = z.infer<typeof ReportedByTypeSchema>;

export const FeeTypeSchema = z.enum(['late_fee', 'service_fee', 'other']);

export type FeeTypeDto = z.infer<typeof FeeTypeSchema>;

/**
 * Shared request fields for recording a payment attempt (ADR-008: always creates pending).
 * `amountRial` is a positive decimal string (ADR-007) — never a JSON number.
 */
export const RecordPaymentBaseSchema = z.object({
  installmentId: z.string().uuid(),
  amountRial: bigintRialPositiveSchema,
  note: z.string().max(2000).optional(),
  evidenceFileId: z.string().uuid().optional(),
  idempotencyKey: z.string().uuid().optional(),
  paidAt: z.string().datetime().optional(),
});

export type RecordPaymentBaseDto = z.infer<typeof RecordPaymentBaseSchema>;

export const BankTransferDetailsSchema = z.object({
  bankName: z.string().trim().min(1).max(100),
  referenceNumber: z.string().trim().min(1).max(50),
  transferDate: dateOnlySchema,
  accountLast4: z.string().regex(/^\d{4}$/).optional(),
});

export type BankTransferDetailsDto = z.infer<typeof BankTransferDetailsSchema>;

export const PosDetailsSchema = z.object({
  terminalId: z.string().trim().min(1).max(50),
  traceNumber: z.string().trim().min(1).max(50),
  cardLast4: z.string().regex(/^\d{4}$/).optional(),
  batchNumber: z.string().trim().min(1).max(50).optional(),
});

export type PosDetailsDto = z.infer<typeof PosDetailsSchema>;

export const CheckPaymentDetailsSchema = z.object({
  checkNumber: z.string().max(20),
  bankName: z.string().max(100),
  branchCode: z.string().max(20).optional(),
  dueDate: dateOnlySchema,
  drawerName: z.string().max(200),
  sayadId: z.string().max(16).optional(),
});

export type CheckPaymentDetailsDto = z.infer<typeof CheckPaymentDetailsSchema>;

export const FeePaymentSchema = z.object({
  feeType: FeeTypeSchema,
  feeDescription: z.string().max(500),
});

export type FeePaymentDto = z.infer<typeof FeePaymentSchema>;

export const RecordCashPaymentSchema = RecordPaymentBaseSchema.extend({
  method: z.literal('cash'),
});

export type RecordCashPaymentDto = z.infer<typeof RecordCashPaymentSchema>;

export const RecordManualPaymentSchema = RecordPaymentBaseSchema.extend({
  method: z.literal('manual'),
});

export type RecordManualPaymentDto = z.infer<typeof RecordManualPaymentSchema>;

export const RecordBankTransferPaymentSchema = RecordPaymentBaseSchema.extend({
  method: z.literal('bank_transfer'),
}).merge(BankTransferDetailsSchema);

export type RecordBankTransferPaymentDto = z.infer<typeof RecordBankTransferPaymentSchema>;

export const RecordPosPaymentSchema = RecordPaymentBaseSchema.extend({
  method: z.literal('pos'),
}).merge(PosDetailsSchema);

export type RecordPosPaymentDto = z.infer<typeof RecordPosPaymentSchema>;

export const RecordCheckPaymentSchema = RecordPaymentBaseSchema.extend({
  method: z.literal('check'),
}).merge(CheckPaymentDetailsSchema);

export type RecordCheckPaymentDto = z.infer<typeof RecordCheckPaymentSchema>;

export const RecordFeePaymentSchema = RecordPaymentBaseSchema.extend({
  method: z.literal('fee'),
}).merge(FeePaymentSchema);

export type RecordFeePaymentDto = z.infer<typeof RecordFeePaymentSchema>;

/** Discriminated union for unified payment recording requests (IFP-105 prep). */
export const RecordPaymentRequestSchema = z.discriminatedUnion('method', [
  RecordCashPaymentSchema,
  RecordManualPaymentSchema,
  RecordBankTransferPaymentSchema,
  RecordPosPaymentSchema,
  RecordCheckPaymentSchema,
  RecordFeePaymentSchema,
]);

export type RecordPaymentRequestDto = z.infer<typeof RecordPaymentRequestSchema>;

/**
 * Online payment initiation — gateway callback handled separately (IFP-089).
 * `amountRial` is a positive decimal string (ADR-007).
 */
export const InitOnlinePaymentSchema = z.object({
  installmentId: z.string().uuid(),
  amountRial: bigintRialPositiveSchema,
  returnUrl: z.string().url().max(500),
});

export type InitOnlinePaymentDto = z.infer<typeof InitOnlinePaymentSchema>;

/** Alias for task naming consistency. */
export const OnlinePaymentInitSchema = InitOnlinePaymentSchema;

export type OnlinePaymentInitDto = InitOnlinePaymentDto;

/**
 * Validates partial payment amounts against installment remaining balance.
 * When `allowPartial` is false, `amountRial` must equal `remainingAmountRial`.
 */
export const PartialPaymentSchema = z
  .object({
    amountRial: bigintRialPositiveSchema,
    remainingAmountRial: bigintRialPositiveSchema,
    allowPartial: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const amount = BigInt(value.amountRial);
    const remaining = BigInt(value.remainingAmountRial);

    if (amount > remaining) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AMOUNT_EXCEEDS_REMAINING',
        path: ['amountRial'],
      });
      return;
    }

    if (!value.allowPartial && amount !== remaining) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PARTIAL_PAYMENT_NOT_ALLOWED',
        path: ['amountRial'],
      });
    }
  });

export type PartialPaymentDto = z.infer<typeof PartialPaymentSchema>;

/** Body for cash/manual payment endpoints — installment id comes from URL. */
export const RecordCashManualPaymentBodySchema = RecordPaymentBaseSchema.omit({
  installmentId: true,
  idempotencyKey: true,
}).extend({
  evidenceFileId: z.string().uuid().nullable().optional(),
});

export type RecordCashManualPaymentBodyDto = z.infer<typeof RecordCashManualPaymentBodySchema>;

/** Body for bank-transfer payment endpoint — installment id comes from URL. */
export const RecordBankTransferPaymentBodySchema = RecordPaymentBaseSchema.omit({
  installmentId: true,
  idempotencyKey: true,
})
  .merge(BankTransferDetailsSchema)
  .extend({
    evidenceFileId: z.string().uuid().nullable().optional(),
  });

export type RecordBankTransferPaymentBodyDto = z.infer<
  typeof RecordBankTransferPaymentBodySchema
>;

/** Body for POS payment endpoint — installment id comes from URL. */
export const RecordPosPaymentBodySchema = RecordPaymentBaseSchema.omit({
  installmentId: true,
  idempotencyKey: true,
})
  .merge(PosDetailsSchema)
  .extend({
    evidenceFileId: z.string().uuid().nullable().optional(),
  });

export type RecordPosPaymentBodyDto = z.infer<typeof RecordPosPaymentBodySchema>;

/** Body for check payment endpoint — installment id comes from URL. */
export const RecordCheckPaymentBodySchema = RecordPaymentBaseSchema.omit({
  installmentId: true,
  idempotencyKey: true,
})
  .merge(CheckPaymentDetailsSchema)
  .extend({
    evidenceFileId: z.string().uuid().nullable().optional(),
  });

export type RecordCheckPaymentBodyDto = z.infer<typeof RecordCheckPaymentBodySchema>;

/** Body for fee payment endpoint — installment id comes from URL. */
export const RecordFeePaymentBodySchema = RecordPaymentBaseSchema.omit({
  installmentId: true,
  idempotencyKey: true,
})
  .merge(FeePaymentSchema)
  .extend({
    note: z.string().max(2000).nullable().optional(),
    evidenceFileId: z.string().uuid().nullable().optional(),
  });

export type RecordFeePaymentBodyDto = z.infer<typeof RecordFeePaymentBodySchema>;

/** Non-negative rial string for API responses (ADR-007). */
export const bigintRialSchema = bigintRialNonNegativeSchema;

/**
 * Payment attempt detail response — aligned with Prisma PaymentAttempt + metadata.method.
 * New recordings always return `status: pending` until confirm/reject (ADR-008).
 */
export const PaymentAttemptDetailSchema = z.object({
  id: z.string().uuid(),
  installmentId: z.string().uuid(),
  amountRial: bigintRialSchema,
  status: PaymentAttemptStatusSchema,
  reportedByType: ReportedByTypeSchema,
  method: PaymentMethodSchema,
  methodDetails: z.record(z.unknown()).nullable(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
  confirmedAt: z.string().datetime().nullable(),
  version: z.number().int(),
});

export type PaymentAttemptDetailDto = z.infer<typeof PaymentAttemptDetailSchema>;

export const RecordPaymentResponseSchema = z.object({
  paymentAttempt: PaymentAttemptDetailSchema,
  redirectUrl: z.string().url().nullable().optional(),
});

export type RecordPaymentResponseDto = z.infer<typeof RecordPaymentResponseSchema>;

/** Body for online payment init — installment id comes from URL. */
export const InitOnlinePaymentBodySchema = InitOnlinePaymentSchema.omit({
  installmentId: true,
});

export type InitOnlinePaymentBodyDto = z.infer<typeof InitOnlinePaymentBodySchema>;

export const InitOnlinePaymentResponseSchema = z.object({
  paymentAttemptId: z.string().uuid(),
  redirectUrl: z.string().url(),
  gatewayToken: z.string().min(1),
  expiresAt: z.string().datetime(),
});

export type InitOnlinePaymentResponseDto = z.infer<typeof InitOnlinePaymentResponseSchema>;

export const PaymentGatewayWebhookSchema = z.object({
  transactionId: z.string().trim().min(1).max(100),
  status: z.enum(['success', 'failed']),
  amountRial: bigintRialPositiveSchema,
  referenceId: z.string().uuid(),
  cardMask: z.string().max(20).optional(),
});

export type PaymentGatewayWebhookDto = z.infer<typeof PaymentGatewayWebhookSchema>;
