import {
  DEFAULT_INSTALLMENTS_SETTINGS,
  InstallmentsSettingsSchema,
  UpdateInstallmentsSettingsSchema,
  type InstallmentsSettingsDto,
} from '@hivork/contracts/installments';

export {
  DEFAULT_INSTALLMENTS_SETTINGS,
  InstallmentsSettingsSchema,
  UpdateInstallmentsSettingsSchema,
};

export const REMINDER_DAYS_BEFORE_OPTIONS = [0, 1, 2, 3, 5, 7, 14, 30] as const;
export const OVERDUE_ESCALATION_DAY_OPTIONS = [1, 2, 3, 5, 7, 14, 30] as const;

export const REMINDER_CHANNEL_OPTIONS = [
  { value: 'telegram' as const, label: 'تلگرام' },
  { value: 'bale' as const, label: 'بله' },
  { value: 'sms' as const, label: 'پیامک' },
];

export const RemindersSettingsFormSchema = InstallmentsSettingsSchema.pick({
  reminder_days_before: true,
  reminder_on_due_date: true,
  overdue_escalation_days: true,
  reminder_time: true,
  default_reminder_channels: true,
});

export type RemindersSettingsFormValues = Pick<
  InstallmentsSettingsDto,
  | 'reminder_days_before'
  | 'reminder_on_due_date'
  | 'overdue_escalation_days'
  | 'reminder_time'
  | 'default_reminder_channels'
>;

export type RemindersFieldErrors = Partial<Record<keyof RemindersSettingsFormValues, string>>;

export const REMINDERS_SETTINGS_PERMISSION = 'installments.reminder.configure';

export function toRemindersFormValues(settings: InstallmentsSettingsDto): RemindersSettingsFormValues {
  return {
    reminder_days_before: [...settings.reminder_days_before],
    reminder_on_due_date: settings.reminder_on_due_date,
    overdue_escalation_days: [...settings.overdue_escalation_days],
    reminder_time: settings.reminder_time,
    default_reminder_channels: [...settings.default_reminder_channels],
  };
}

export function remindersFormsAreEqual(
  a: RemindersSettingsFormValues,
  b: RemindersSettingsFormValues,
): boolean {
  return (
    a.reminder_on_due_date === b.reminder_on_due_date &&
    a.reminder_time === b.reminder_time &&
    arraysEqual(a.reminder_days_before, b.reminder_days_before) &&
    arraysEqual(a.overdue_escalation_days, b.overdue_escalation_days) &&
    arraysEqual(a.default_reminder_channels, b.default_reminder_channels)
  );
}

function arraysEqual<T>(left: T[], right: T[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

const FIELD_ERROR_MESSAGES_FA: Record<string, string> = {
  MIN_ONE_DAY_REQUIRED: 'حداقل یک روز انتخاب کنید.',
  DUPLICATE_VALUES: 'مقادیر تکراری مجاز نیست.',
  INVALID_TIME_FORMAT: 'فرمت ساعت نامعتبر است. مثال: 09:00',
};

export function mapZodIssueToFieldError(message: string): string {
  return FIELD_ERROR_MESSAGES_FA[message] ?? 'مقدار وارد‌شده معتبر نیست.';
}

export function validateRemindersForm(values: RemindersSettingsFormValues): RemindersFieldErrors {
  const errors: RemindersFieldErrors = {};

  if (values.reminder_days_before.length === 0) {
    errors.reminder_days_before = FIELD_ERROR_MESSAGES_FA.MIN_ONE_DAY_REQUIRED;
  }

  if (values.overdue_escalation_days.length === 0) {
    errors.overdue_escalation_days = FIELD_ERROR_MESSAGES_FA.MIN_ONE_DAY_REQUIRED;
  }

  const result = RemindersSettingsFormSchema.safeParse(values);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !errors[field as keyof RemindersFieldErrors]) {
        errors[field as keyof RemindersFieldErrors] = mapZodIssueToFieldError(issue.message);
      }
    }
  }

  return errors;
}

export function toRemindersPatchPayload(
  values: RemindersSettingsFormValues,
): Pick<
  InstallmentsSettingsDto,
  | 'reminder_days_before'
  | 'reminder_on_due_date'
  | 'overdue_escalation_days'
  | 'reminder_time'
  | 'default_reminder_channels'
> {
  return RemindersSettingsFormSchema.parse(values);
}
