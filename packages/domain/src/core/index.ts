// Entity aggregates and value objects — TASK-029+
export { GlobalCustomer, type GlobalCustomerStatus } from './customer/global-customer.entity.js';
export {
  TenantCustomer,
  type PreferredContactChannel,
  type TenantCustomerLinkProps,
  type TenantCustomerStatus,
} from './customer/tenant-customer.entity.js';
export {
  CustomerCategory,
} from './customer/customer-category.entity.js';
export {
  CustomerAddress,
  type CustomerAddressLabel,
} from './customer/customer-address.entity.js';
export {
  IRAN_LATITUDE_MIN,
  IRAN_LATITUDE_MAX,
  IRAN_LONGITUDE_MIN,
  IRAN_LONGITUDE_MAX,
  TEHRAN_MAP_CENTER,
  IRAN_MAP_DEFAULT_ZOOM,
  IRAN_MAP_PIN_ZOOM,
  isWithinIranBounds,
  coordinatesArePaired,
} from './customer/iran-geo-bounds.js';
export {
  CustomerEmergencyContact,
  type EmergencyContactRelation,
} from './customer/customer-emergency-contact.entity.js';
export {
  CustomerDocument,
  ALLOWED_CUSTOMER_DOCUMENT_MIME_TYPES,
  type AllowedCustomerDocumentMimeType,
  type CustomerDocumentType,
} from './customer/customer-document.entity.js';
export { CustomerNote } from './customer/customer-note.entity.js';
export {
  assertCustomerMergeAllowed,
  mergeCustomerFields,
  type CustomerMergeSnapshot,
  type CustomerMergeHistoryEntry,
  type MergedCustomerFields,
} from './customer/customer-merge.service.js';
export {
  assertCustomerOwnershipTransferAllowed,
  buildCustomerOwnershipTransferFields,
  type CustomerOwnershipTransferSnapshot,
  type CustomerTransferHistoryEntry,
  type CustomerOwnershipTransferFields,
} from './customer/customer-ownership-transfer.service.js';
export {
  clampCreditScore,
  applyScoreDelta,
  adjustOverdueCount,
  scoreDeltaForEvent,
  resolveManualScoreAdjustment,
  shouldAutoBlacklist,
  buildAutoBlacklistReason,
  hasScoringEventProcessed,
  markScoringEventProcessed,
  parseCustomerScoringWeights,
  parseAutoBlacklistThreshold,
  DEFAULT_CREDIT_SCORE_MIN,
  DEFAULT_CREDIT_SCORE_MAX,
  DEFAULT_CUSTOMER_SCORING_WEIGHTS,
  type CustomerScoringWeights,
  type CustomerScoringEventKind,
} from './customer/customer-scoring.service.js';
export {
  CustomerOwnershipTransferredEvent,
  type CustomerOwnershipTransferredPayload,
} from './customer/customer-ownership-transferred.event.js';
export {
  CustomerContactPhone,
  DEFAULT_MAX_SECONDARY_PHONES,
  type CustomerContactPhoneLabel,
} from './customer/customer-contact-phone.entity.js';
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