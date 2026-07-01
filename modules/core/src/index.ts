export { CoreModule, coreHivorkModule } from './core.module.js';
export {
  CORE_PERMISSION_CODES,
  CORE_PERMISSIONS,
  toPermissionDefinition,
  type CorePermissionCode,
} from './core.permissions.js';
export { RequireModule, REQUIRE_MODULE_KEY } from './decorators/require-module.decorator.js';
export { ModuleGuard } from './guards/module.guard.js';
export { ModuleEntitlementService } from './module-entitlement.service.js';
export {
  TENANT_ID_RESOLVER,
  type TenantIdResolver,
} from './ports/tenant-id-resolver.port.js';
export {
  TENANT_MODULES_CACHE,
  TENANT_MODULES_READER,
  type TenantModulesCache,
  type TenantModulesReader,
} from './ports/tenant-modules-reader.port.js';
export type { HivorkModule, PermissionDefinition } from './interfaces/hivork-module.interface.js';
export { ModuleRegistryService } from './module-registry.service.js';
export {
  coreSettingsSchema,
  type CoreSettingKey,
  type CoreSettingsSchema,
} from './settings/core.settings.schema.js';
export {
  remindersSettingsSchema,
  type RemindersSettingKey,
  type RemindersSettingsSchema,
} from './settings/reminders.settings.schema.js';
export {
  installmentsSettingsSchema,
  type InstallmentsSettingKey,
  type InstallmentsSettingsSchema,
} from './settings/installments.settings.schema.js';
