import { z } from 'zod';

const timeHHmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'INVALID_TIME_FORMAT');

const reminderDaysSchema = z
  .array(z.number().int().min(0).max(30))
  .max(10)
  .refine((values) => new Set(values).size === values.length, { message: 'DUPLICATE_VALUES' })
  .transform((values) => [...values].sort((a, b) => b - a));

const escalationDaysSchema = z
  .array(z.number().int().min(1).max(90))
  .max(10)
  .refine((values) => new Set(values).size === values.length, { message: 'DUPLICATE_VALUES' })
  .transform((values) => [...values].sort((a, b) => a - b));

const reminderChannelSchema = z.enum(['telegram', 'bale', 'sms']);

export const InstallmentsSettingsSchema = z.object({
  reminder_days_before: reminderDaysSchema.default([3, 1]),
  reminder_on_due_date: z.boolean().default(true),
  reminder_time: timeHHmmSchema.default('09:00'),
  overdue_escalation_days: escalationDaysSchema.default([1, 3, 7]),
  default_installment_count: z.number().int().min(1).max(120).default(12),
  allow_customer_self_report_payment: z.boolean().default(true),
  require_seller_payment_confirmation: z.boolean().default(true),
  notify_seller_on_customer_payment_report: z.boolean().default(true),
  default_reminder_channels: z.array(reminderChannelSchema).min(1).default(['telegram']),
});

export type InstallmentsSettingsDto = z.infer<typeof InstallmentsSettingsSchema>;

export const UpdateInstallmentsSettingsSchema = InstallmentsSettingsSchema.partial().strict();

export type UpdateInstallmentsSettingsDto = z.infer<typeof UpdateInstallmentsSettingsSchema>;

export const GetInstallmentsSettingsResponseSchema = z.object({
  installments: InstallmentsSettingsSchema,
});

export type GetInstallmentsSettingsResponseDto = z.infer<typeof GetInstallmentsSettingsResponseSchema>;

export const GetInstallmentsSettingsApiResponseSchema = z.object({
  data: GetInstallmentsSettingsResponseSchema,
  meta: z
    .object({
      requestId: z.string().uuid().optional(),
    })
    .optional(),
});

export type GetInstallmentsSettingsApiResponseDto = z.infer<
  typeof GetInstallmentsSettingsApiResponseSchema
>;

export const DEFAULT_INSTALLMENTS_SETTINGS: InstallmentsSettingsDto =
  InstallmentsSettingsSchema.parse({});

export const INSTALLMENTS_SETTINGS_SCHEMA_VERSION = '1.0.0';
