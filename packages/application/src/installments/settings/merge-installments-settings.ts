import {
  DEFAULT_INSTALLMENTS_SETTINGS,
  InstallmentsSettingsFieldsSchema,
  InstallmentsSettingsSchema,
  type InstallmentsSettingsDto,
} from '@hivork/contracts';

export function mergeInstallmentsSettings(
  stored: Record<string, unknown>,
): InstallmentsSettingsDto {
  const merged: Record<string, unknown> = { ...DEFAULT_INSTALLMENTS_SETTINGS };

  for (const [key, fieldSchema] of Object.entries(InstallmentsSettingsFieldsSchema.shape)) {
    if (!(key in stored)) {
      continue;
    }

    const parsed = fieldSchema.safeParse(stored[key]);
    if (parsed.success) {
      merged[key] = parsed.data;
    }
  }

  return InstallmentsSettingsSchema.parse(merged);
}
