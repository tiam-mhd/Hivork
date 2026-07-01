export { Permission } from './permission.vo.js';
export { Role } from './role.vo.js';
export { type DataScope, isDataScope, parseDataScope } from './data-scope.vo.js';
export {
  assertCanRestore,
  assertNotDeleted,
  softDeleteState,
  type SoftDeleteState,
} from './soft-deletable.vo.js';
export { hasPermission, resolveEffectivePermissions, partitionActiveOverrides, type PermissionOverrideInput } from './effective-permissions.service.js';
