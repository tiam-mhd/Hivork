/**
 * Re-exports installments settings from @hivork/contracts — single source of truth (TASK-070).
 */
export {
  DEFAULT_INSTALLMENTS_SETTINGS,
  INSTALLMENTS_SETTINGS_SCHEMA_VERSION,
  InstallmentsSettingsSchema as installmentsSettingsSchema,
  type InstallmentsSettingsDto as InstallmentsSettings,
} from '@hivork/contracts';
