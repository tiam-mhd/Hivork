import { z } from 'zod';

import { UnifiedPaymentMethodSchema } from './unified-payment.schema.js';

/** Minimum plan tier required to enable a payment method (IFP-106). */
export const PaymentMethodPlanTierSchema = z.enum(['basic', 'pro', 'enterprise']);

export type PaymentMethodPlanTierDto = z.infer<typeof PaymentMethodPlanTierSchema>;

export const PaymentMethodConfigSchema = z.object({
  method: UnifiedPaymentMethodSchema,
  enabled: z.boolean(),
  displayOrder: z.number().int().min(0),
  labelFa: z.string().trim().min(1).max(50),
  requiresPlan: PaymentMethodPlanTierSchema.optional(),
});

export type PaymentMethodConfigDto = z.infer<typeof PaymentMethodConfigSchema>;

export const PaymentMethodDisabledReasonSchema = z.enum([
  'plan_required',
  'tenant_disabled',
  'module_disabled',
]);

export type PaymentMethodDisabledReasonDto = z.infer<
  typeof PaymentMethodDisabledReasonSchema
>;

export const PaymentMethodListItemSchema = PaymentMethodConfigSchema.extend({
  disabledReason: PaymentMethodDisabledReasonSchema.optional(),
});

export type PaymentMethodListItemDto = z.infer<typeof PaymentMethodListItemSchema>;

export const ListEnabledPaymentMethodsResponseSchema = z.object({
  methods: z.array(PaymentMethodListItemSchema),
});

export type ListEnabledPaymentMethodsResponseDto = z.infer<
  typeof ListEnabledPaymentMethodsResponseSchema
>;
