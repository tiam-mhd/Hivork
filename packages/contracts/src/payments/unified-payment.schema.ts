import { z } from 'zod';

import { bigintRialPositiveSchema, bigintRialStringSchema } from '../common/money.schema.js';
import { PaymentAttemptStatusSchema } from '../installments/payment.schema.js';
import {
  BankTransferDetailsSchema,
  CheckPaymentDetailsSchema,
  PaymentMethodSchema,
  PosDetailsSchema,
  type PaymentMethodDto,
} from '../installments/payment-recording.schema.js';

/**
 * Product-facing payment methods (IFP-104 / §۶).
 * Differs from IFP-086 internal `PaymentMethodSchema` storage codes.
 */
export const UnifiedPaymentMethodSchema = z.enum([
  'online',
  'in_person',
  'cash',
  'card',
  'check',
  'bank_transfer',
  'wallet',
]);

export type UnifiedPaymentMethodDto = z.infer<typeof UnifiedPaymentMethodSchema>;

const unifiedPaymentBaseSchema = z.object({
  installmentId: z.string().uuid(),
  amountRial: bigintRialPositiveSchema,
});

export const CreateUnifiedCashPaymentSchema = unifiedPaymentBaseSchema.extend({
  method: z.literal('cash'),
  note: z.string().max(2000).optional(),
});

export const CreateUnifiedInPersonPaymentSchema = unifiedPaymentBaseSchema.extend({
  method: z.literal('in_person'),
  receivedAt: z.string().datetime(),
  note: z.string().max(2000).optional(),
});

export const CreateUnifiedBankTransferPaymentSchema = unifiedPaymentBaseSchema
  .extend({
    method: z.literal('bank_transfer'),
    note: z.string().max(2000).optional(),
  })
  .merge(BankTransferDetailsSchema);

export const CreateUnifiedCardPaymentSchema = unifiedPaymentBaseSchema
  .extend({
    method: z.literal('card'),
    note: z.string().max(2000).optional(),
  })
  .merge(PosDetailsSchema);

export const CreateUnifiedOnlinePaymentSchema = unifiedPaymentBaseSchema.extend({
  method: z.literal('online'),
  returnUrl: z.string().url().max(500),
});

export const CreateUnifiedCheckPaymentSchema = unifiedPaymentBaseSchema
  .extend({
    method: z.literal('check'),
    note: z.string().max(2000).optional(),
  })
  .merge(CheckPaymentDetailsSchema);

export const CreateUnifiedWalletPaymentSchema = unifiedPaymentBaseSchema.extend({
  method: z.literal('wallet'),
  walletProvider: z.string().trim().min(1).max(100),
});

/**
 * Unified create-payment body — discriminated union dispatched by IFP-105.
 * `installmentId` is in the URL for legacy per-method endpoints; required here for POST /payments.
 */
export const CreateUnifiedPaymentSchema = z.discriminatedUnion('method', [
  CreateUnifiedCashPaymentSchema,
  CreateUnifiedInPersonPaymentSchema,
  CreateUnifiedBankTransferPaymentSchema,
  CreateUnifiedCardPaymentSchema,
  CreateUnifiedOnlinePaymentSchema,
  CreateUnifiedCheckPaymentSchema,
  CreateUnifiedWalletPaymentSchema,
]);

export type CreateUnifiedPaymentDto = z.infer<typeof CreateUnifiedPaymentSchema>;

export const UnifiedPaymentAttemptSchema = z.object({
  id: z.string().uuid(),
  installmentId: z.string().uuid(),
  amountRial: bigintRialStringSchema,
  status: PaymentAttemptStatusSchema,
  method: UnifiedPaymentMethodSchema,
  createdAt: z.string().datetime(),
  version: z.number().int(),
});

export type UnifiedPaymentAttemptDto = z.infer<typeof UnifiedPaymentAttemptSchema>;

export const UnifiedPaymentResponseSchema = z.object({
  paymentAttempt: UnifiedPaymentAttemptSchema,
  ledgerEntryId: z.string().uuid().optional(),
  redirectUrl: z.string().url().nullable().optional(),
});

export type UnifiedPaymentResponseDto = z.infer<typeof UnifiedPaymentResponseSchema>;

/**
 * IFP-104 mapping — unified (product) → internal IFP-086 persistence codes.
 *
 * | Unified     | Internal (PaymentAttempt.metadata.method) |
 * |-------------|-------------------------------------------|
 * | cash        | cash                                      |
 * | in_person   | manual                                    |
 * | card        | pos                                       |
 * | bank_transfer | bank_transfer                           |
 * | online      | online                                    |
 * | check       | check                                     |
 * | wallet      | wallet (IFP-105 stub until gateway)       |
 */
export const UNIFIED_TO_INTERNAL_PAYMENT_METHOD: Record<
  UnifiedPaymentMethodDto,
  PaymentMethodDto | 'wallet'
> = {
  cash: 'cash',
  in_person: 'manual',
  card: 'pos',
  bank_transfer: 'bank_transfer',
  online: 'online',
  check: 'check',
  wallet: 'wallet',
};

/**
 * Reverse mapping for read APIs. `manual` maps to `cash` by default;
 * `in_person` is stored as `manual` with metadata `unifiedMethod: 'in_person'`.
 */
export const INTERNAL_TO_UNIFIED_PAYMENT_METHOD: Partial<
  Record<PaymentMethodDto | 'wallet', UnifiedPaymentMethodDto>
> = {
  cash: 'cash',
  manual: 'cash',
  pos: 'card',
  bank_transfer: 'bank_transfer',
  online: 'online',
  check: 'check',
  wallet: 'wallet',
};

export function mapUnifiedMethodToInternal(
  method: UnifiedPaymentMethodDto,
): PaymentMethodDto | 'wallet' {
  return UNIFIED_TO_INTERNAL_PAYMENT_METHOD[method];
}

export function mapInternalMethodToUnified(
  method: PaymentMethodDto | 'wallet',
  unifiedMethodHint?: UnifiedPaymentMethodDto,
): UnifiedPaymentMethodDto | undefined {
  if (unifiedMethodHint && UnifiedPaymentMethodSchema.safeParse(unifiedMethodHint).success) {
    return unifiedMethodHint;
  }

  return INTERNAL_TO_UNIFIED_PAYMENT_METHOD[method];
}

/** Validates internal method codes used by IFP-086 record endpoints. */
export { PaymentMethodSchema };
