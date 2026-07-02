/**
 * Re-exports installments settings from @hivork/contracts — single source of truth (TASK-070).
 */
export {
  ContractNumberingSettingsSchema as contractNumberingSettingsSchema,
  DEFAULT_INSTALLMENTS_SETTINGS,
  INSTALLMENTS_SETTINGS_SCHEMA_VERSION,
  InstallmentsSettingsSchema as installmentsSettingsSchema,
  InstallmentsSettingsEnterpriseSchema as installmentsSettingsEnterpriseSchema,
  InstallmentsSettingsReadSchema as installmentsSettingsReadSchema,
  READONLY_INSTALLMENTS_SETTING_KEYS as readonlyInstallmentsSettingKeys,
  RoundingHolidaySettingsSchema as roundingHolidaySettingsSchema,
  type ContractNumberingSettingsDto as ContractNumberingSettings,
  type InstallmentsSettingsDto as InstallmentsSettings,
  type InstallmentsSettingsReadDto as InstallmentsSettingsRead,
  type RoundingHolidaySettingsDto as RoundingHolidaySettings,
} from '@hivork/contracts';
