// Entity aggregates and value objects — TASK-029+
export { GlobalCustomer, type GlobalCustomerStatus } from './customer/global-customer.entity.js';
export {
  TenantCustomer,
  type PreferredContactChannel,
  type TenantCustomerLinkProps,
} from './customer/tenant-customer.entity.js';
export * from './rbac/index.js';
export { Branch } from './branch/branch.entity.js';
export { Staff, type StaffStatus } from './staff/staff.entity.js';
export { User, type UserStatus } from './user/user.entity.js';
export {
  UserCredential,
  type CredentialStatus,
  type IPasswordHasher,
  type UserCredentialMetadata,
  type UserCredentialProps,
} from './auth/user-credential.entity.js';
export {
  UserMfaTotp,
  isBackupCodeFormat,
  isTotpCodeFormat,
  normalizeBackupCodeInput,
  type BackupCodeEntry,
  type UserMfaTotpProps,
} from './auth/user-mfa-totp.entity.js';
export {
  StaffSession,
  type SessionStatus,
  type StaffSessionProps,
  type CreateStaffSessionParams,
} from './auth/staff-session.entity.js';
export { Tenant, type TenantStatus } from './tenant/tenant.entity.js';