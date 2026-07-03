import { z } from 'zod';

import { bigintRialNonNegativeSchema, bigintRialStringSchema, dateOnlySchema } from '../common/money.schema.js';

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

const calculationFormulaSchema = z.enum(['equal_installments', 'declining_balance', 'custom']);
const penaltyTypeSchema = z.enum(['none', 'fixed_daily', 'percent_daily', 'percent_monthly']);
const interestCalculationMethodSchema = z.enum(['simple', 'none']);
const calendarDisplayModeSchema = z.enum(['jalali', 'gregorian', 'both']);
const calendarInputModeSchema = z.enum(['jalali', 'gregorian']);

/** §15 enterprise keys — penalty, interest, calculation formula (IFP-072). */
export const installmentsPenaltyInterestSettingsShape = {
  calculation_formula: calculationFormulaSchema.default('equal_installments'),
  penalty_type: penaltyTypeSchema.default('none'),
  penalty_rate_bps: z.number().int().min(0).max(10000).default(0),
  penalty_fixed_rial: bigintRialNonNegativeSchema.default('0'),
  penalty_grace_days: z.number().int().min(0).max(30).default(0),
  penalty_max_rial: bigintRialNonNegativeSchema.default('0'),
  interest_rate_bps_annual: z.number().int().min(0).max(10000).default(0),
  interest_calculation_method: interestCalculationMethodSchema.default('none'),
} as const;

export const ALLOWED_ROUNDING_UNITS_RIAL = ['1', '10', '100', '1000', '10000'] as const;

const roundingUnitSchema = bigintRialStringSchema.refine(
  (value) => (ALLOWED_ROUNDING_UNITS_RIAL as readonly string[]).includes(value),
  { message: 'ROUNDING_UNIT_INVALID' },
);

const roundingModeSchema = z.enum(['none', 'floor', 'ceil', 'nearest']);
const holidayCalendarSourceSchema = z.enum([
  'jalali_official',
  'custom_only',
  'merge_official_and_custom',
]);

const customHolidayDatesSchema = z
  .array(dateOnlySchema)
  .max(100)
  .refine((values) => new Set(values).size === values.length, {
    message: 'DUPLICATE_HOLIDAY_DATES',
  });

/** §15 rounding + holiday keys (IFP-073). */
export const installmentsRoundingHolidaySettingsShape = {
  rounding_mode: roundingModeSchema.default('nearest'),
  rounding_unit_rial: roundingUnitSchema.default('1000'),
  skip_holidays_in_schedule: z.boolean().default(true),
  holiday_calendar_source: holidayCalendarSourceSchema.default('merge_official_and_custom'),
  custom_holiday_dates: customHolidayDatesSchema.default([]),
} as const;

/** Standalone schema for rounding + holiday settings (IFP-073). */
export const RoundingHolidaySettingsSchema = z.object(installmentsRoundingHolidaySettingsShape);

export type RoundingHolidaySettingsDto = z.infer<typeof RoundingHolidaySettingsSchema>;

/** §15 calendar + contract numbering keys (IFP-074). */
export const installmentsCalendarNumberingSettingsShape = {
  calendar_display_mode: calendarDisplayModeSchema.default('jalali'),
  calendar_input_mode: calendarInputModeSchema.default('jalali'),
  contract_numbering_enabled: z.boolean().default(true),
  contract_number_prefix: z.string().trim().min(1, 'CONTRACT_NUMBER_PREFIX_REQUIRED').max(20).default('CTR'),
  contract_number_suffix: z.string().trim().max(20).optional(),
  contract_number_pad_length: z.number().int().min(4).max(10).default(6),
  contract_number_include_year: z.boolean().default(true),
} as const;

/** Standalone schema for contract numbering + calendar settings (IFP-074). */
export const ContractNumberingSettingsSchema = z.object(installmentsCalendarNumberingSettingsShape);

export type ContractNumberingSettingsDto = z.infer<typeof ContractNumberingSettingsSchema>;

export const READONLY_INSTALLMENTS_SETTING_KEYS = ['contract_number_next_sequence'] as const;

/** Managed via GET/PATCH `/api/v1/settings/payment-methods` (IFP-106). */
export { PAYMENT_METHODS_SETTING_KEY } from '../settings/payment-method-settings.schema.js';

const contractNumberNextSequenceSchema = z.number().int().min(1);

function refinePenaltyInterestSettings(
  value: {
    penalty_type: z.infer<typeof penaltyTypeSchema>;
    penalty_rate_bps: number;
    penalty_fixed_rial: string;
  },
  ctx: z.RefinementCtx,
): void {
  if (value.penalty_type === 'fixed_daily' && BigInt(value.penalty_fixed_rial) === 0n) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'PENALTY_FIXED_REQUIRED',
      path: ['penalty_fixed_rial'],
    });
  }

  if (value.penalty_type.startsWith('percent') && value.penalty_rate_bps === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'PENALTY_RATE_REQUIRED',
      path: ['penalty_rate_bps'],
    });
  }
}

/** Field-level schema without cross-field refinements — used for per-key merge and partial PATCH. */
export const InstallmentsSettingsFieldsSchema = z.object({
  reminder_days_before: reminderDaysSchema.default([3, 1]),
  reminder_on_due_date: z.boolean().default(true),
  reminder_time: timeHHmmSchema.default('09:00'),
  overdue_escalation_days: escalationDaysSchema.default([1, 3, 7]),
  default_installment_count: z.number().int().min(1).max(120).default(12),
  block_customer_delete_with_active_sales: z.boolean().default(true),
  allow_customer_self_report_payment: z.boolean().default(true),
  require_seller_payment_confirmation: z.boolean().default(true),
  notify_seller_on_customer_payment_report: z.boolean().default(true),
  default_reminder_channels: z.array(reminderChannelSchema).min(1).default(['telegram']),
  customer_export_max_rows: z.number().int().min(1).max(100_000).default(5000),
  customer_document_max_bytes: z
    .number()
    .int()
    .min(1)
    .max(100 * 1024 * 1024)
    .default(10 * 1024 * 1024),
  customer_scoring_payment_confirmed_delta: z.number().int().min(-1000).max(1000).default(5),
  customer_scoring_installment_overdue_delta: z.number().int().min(-1000).max(1000).default(-10),
  customer_scoring_sale_completed_on_time_delta: z.number().int().min(-1000).max(1000).default(2),
  customer_auto_blacklist_score_threshold: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .nullable()
    .default(null),
  /** IFP-081 — max calendar days per defer request (default 30). */
  defer_max_days: z.number().int().min(1).max(365).default(30),
  /** IFP-087 — allow reporting less than installment remaining balance. */
  payment_allow_partial: z.boolean().default(false),
  /** IFP-087 — allow staff to set paidAt in the past on payment report. */
  payment_allow_backdate: z.boolean().default(false),
  /** IFP-098 — max discount as basis points of current installment amount (10000 = 100%). */
  discount_max_percent_bps: z.number().int().min(0).max(10_000).default(10_000),
  /** IFP-098 — minimum installment amount after discount is applied. */
  min_installment_rial: bigintRialNonNegativeSchema.default('0'),
  ...installmentsPenaltyInterestSettingsShape,
  ...installmentsRoundingHolidaySettingsShape,
  ...installmentsCalendarNumberingSettingsShape,
});

export const InstallmentsSettingsSchema = InstallmentsSettingsFieldsSchema.superRefine(
  refinePenaltyInterestSettings,
);

/** Alias for enterprise settings consumers (IFP-072 / IFP-075) — same keys as base schema. */
export const InstallmentsSettingsEnterpriseSchema = InstallmentsSettingsSchema;

export type InstallmentsSettingsDto = z.infer<typeof InstallmentsSettingsSchema>;

export const InstallmentsSettingsReadSchema = InstallmentsSettingsFieldsSchema.extend({
  contract_number_next_sequence: contractNumberNextSequenceSchema,
}).superRefine(refinePenaltyInterestSettings);

export type InstallmentsSettingsReadDto = z.infer<typeof InstallmentsSettingsReadSchema>;

export const UpdateInstallmentsSettingsSchema = InstallmentsSettingsFieldsSchema
  .partial()
  .strict()
  .superRefine((value, ctx) => {
    if (value.penalty_type === undefined) {
      return;
    }

    refinePenaltyInterestSettings(
      {
        penalty_type: value.penalty_type,
        penalty_rate_bps: value.penalty_rate_bps ?? 0,
        penalty_fixed_rial: value.penalty_fixed_rial ?? '0',
      },
      ctx,
    );
  });

export type UpdateInstallmentsSettingsDto = z.infer<typeof UpdateInstallmentsSettingsSchema>;

export const GetInstallmentsSettingsResponseSchema = z.object({
  installments: InstallmentsSettingsReadSchema,
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

export const INSTALLMENTS_SETTINGS_SCHEMA_VERSION = '1.5.0';
