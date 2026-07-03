import { z } from 'zod';

import {
  PaymentMethodConfigSchema,
  type PaymentMethodConfigDto,
} from '../payments/payment-method-config.schema.js';
import { UnifiedPaymentMethodSchema } from '../payments/unified-payment.schema.js';

/** Installments module tenant setting key (IFP-106). */
export const PAYMENT_METHODS_SETTING_KEY = 'payment.methods';

export const DEFAULT_PAYMENT_METHOD_CONFIGS: PaymentMethodConfigDto[] = [
  { method: 'cash', enabled: true, displayOrder: 0, labelFa: 'نقدی' },
  { method: 'bank_transfer', enabled: true, displayOrder: 1, labelFa: 'انتقال بانکی' },
  { method: 'in_person', enabled: true, displayOrder: 2, labelFa: 'حضوری' },
  { method: 'card', enabled: false, displayOrder: 3, labelFa: 'کارتخوان' },
  { method: 'check', enabled: false, displayOrder: 4, labelFa: 'چک' },
  {
    method: 'online',
    enabled: false,
    displayOrder: 5,
    labelFa: 'آنلاین',
    requiresPlan: 'pro',
  },
  {
    method: 'wallet',
    enabled: false,
    displayOrder: 6,
    labelFa: 'کیف پول',
    requiresPlan: 'pro',
  },
];

export const PaymentMethodsSettingValueSchema = z.object({
  methods: z.array(PaymentMethodConfigSchema),
});

export type PaymentMethodsSettingValueDto = z.infer<typeof PaymentMethodsSettingValueSchema>;

export const PaymentMethodSettingsPatchItemSchema = z.object({
  method: UnifiedPaymentMethodSchema,
  enabled: z.boolean(),
  displayOrder: z.number().int().min(0),
  labelFa: z.string().trim().min(1).max(50).optional(),
});

export type PaymentMethodSettingsPatchItemDto = z.infer<
  typeof PaymentMethodSettingsPatchItemSchema
>;

function refineUniqueMethodsAndDisplayOrders(
  methods: Array<{ method: z.infer<typeof UnifiedPaymentMethodSchema>; displayOrder: number }>,
  ctx: z.RefinementCtx,
): void {
  const seenMethods = new Set<string>();
  const seenOrders = new Set<number>();

  for (const item of methods) {
    if (seenMethods.has(item.method)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DUPLICATE_METHOD',
        path: ['methods'],
      });
      return;
    }
    seenMethods.add(item.method);

    if (seenOrders.has(item.displayOrder)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DUPLICATE_DISPLAY_ORDER',
        path: ['methods'],
      });
      return;
    }
    seenOrders.add(item.displayOrder);
  }
}

export const UpdatePaymentMethodSettingsSchema = z
  .object({
    methods: z.array(PaymentMethodSettingsPatchItemSchema).min(1),
  })
  .superRefine((value, ctx) => {
    refineUniqueMethodsAndDisplayOrders(value.methods, ctx);
  });

export type UpdatePaymentMethodSettingsDto = z.infer<typeof UpdatePaymentMethodSettingsSchema>;

export const GetPaymentMethodSettingsResponseSchema = z.object({
  methods: z.array(PaymentMethodConfigSchema),
  warnings: z.array(z.string()).optional(),
});

export type GetPaymentMethodSettingsResponseDto = z.infer<
  typeof GetPaymentMethodSettingsResponseSchema
>;

export const GetPaymentMethodSettingsApiResponseSchema = z.object({
  data: GetPaymentMethodSettingsResponseSchema,
});

export type GetPaymentMethodSettingsApiResponseDto = z.infer<
  typeof GetPaymentMethodSettingsApiResponseSchema
>;
