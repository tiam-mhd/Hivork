import {
  DEFAULT_INSTALLMENTS_SETTINGS,
  type InstallmentsSettingsReadDto,
  UpdateInstallmentsSettingsSchema,
  type UpdateInstallmentsSettingsDto,
} from '@hivork/contracts/installments';
import { getGregorianPartsFromIso, getJalaliPartsFromIso } from '@hivork/i18n';

export type InstallmentsSettingsFormValues = InstallmentsSettingsReadDto;

export type InstallmentsSettingsFieldErrors = Partial<
  Record<keyof UpdateInstallmentsSettingsDto | 'contract_number_next_sequence', string>
>;

export const INSTALLMENTS_SETTINGS_VIEW_PERMISSION = 'core.settings.view';
export const INSTALLMENTS_SETTINGS_EDIT_PERMISSION = 'core.settings.edit';

export function toInstallmentsSettingsFormValues(
  settings: InstallmentsSettingsReadDto,
): InstallmentsSettingsFormValues {
  return {
    ...settings,
    reminder_days_before: [...settings.reminder_days_before],
    overdue_escalation_days: [...settings.overdue_escalation_days],
    default_reminder_channels: [...settings.default_reminder_channels],
    custom_holiday_dates: [...settings.custom_holiday_dates],
  };
}

export function installmentsSettingsAreEqual(
  left: InstallmentsSettingsFormValues,
  right: InstallmentsSettingsFormValues,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function toInstallmentsPatchPayload(
  values: InstallmentsSettingsFormValues,
  saved: InstallmentsSettingsFormValues,
): UpdateInstallmentsSettingsDto {
  const changedEntries = Object.entries(values).filter(([key, value]) => {
    if (key === 'contract_number_next_sequence') {
      return false;
    }
    return JSON.stringify(value) !== JSON.stringify(saved[key as keyof InstallmentsSettingsFormValues]);
  });

  return UpdateInstallmentsSettingsSchema.parse(Object.fromEntries(changedEntries));
}

const FIELD_ERROR_MESSAGES_FA: Record<string, string> = {
  PENALTY_FIXED_REQUIRED: 'برای جریمه ثابت، مبلغ ثابت روزانه الزامی است.',
  PENALTY_RATE_REQUIRED: 'برای جریمه درصدی، نرخ جریمه الزامی است.',
  ROUNDING_UNIT_INVALID: 'واحد گرد کردن فقط می‌تواند ۱، ۱۰، ۱۰۰، ۱۰۰۰ یا ۱۰۰۰۰ باشد.',
  DUPLICATE_HOLIDAY_DATES: 'تاریخ تعطیل تکراری مجاز نیست.',
  CONTRACT_NUMBER_PREFIX_REQUIRED: 'پیشوند شماره قرارداد الزامی است.',
  INVALID_DATE_FORMAT: 'فرمت تاریخ نامعتبر است.',
};

export function mapInstallmentsSettingsError(message: string): string {
  return FIELD_ERROR_MESSAGES_FA[message] ?? 'مقدار واردشده معتبر نیست.';
}

export function buildContractNumberPreview(values: InstallmentsSettingsFormValues): string {
  const sequence = String(values.contract_number_next_sequence).padStart(
    values.contract_number_pad_length,
    '0',
  );
  const parts: string[] = [values.contract_number_prefix.trim() || 'CTR'];

  if (values.contract_number_include_year) {
    const today = new Date().toISOString().slice(0, 10);
    const year =
      values.calendar_display_mode === 'gregorian'
        ? getGregorianPartsFromIso(today)?.year ?? new Date().getFullYear()
        : getJalaliPartsFromIso(today)?.year ?? getGregorianPartsFromIso(today)?.year ?? new Date().getFullYear();
    parts.push(String(year));
  }

  parts.push(sequence);

  if (values.contract_number_suffix?.trim()) {
    parts.push(values.contract_number_suffix.trim());
  }

  return parts.join('-');
}

export const DEFAULT_INSTALLMENTS_SETTINGS_FORM_VALUES: InstallmentsSettingsFormValues = {
  ...DEFAULT_INSTALLMENTS_SETTINGS,
  contract_number_next_sequence: 1,
};
