export { type ITenantRepository, type TenantRecord, type TenantDetailRecord } from './tenant.repository.port.js';
export { type ISmsPort } from './sms.port.js';
export { type IOtpRateLimiter, type IOtpStore, type OtpPurpose, type OtpRecord } from './otp.port.js';
export { type IStaffRoleRepository, type StaffRoleAssignment, type AssignStaffRoleInput, type AssignStaffRoleResult } from './staff-role.repository.port.js';
export {
  type IStaffRepository,
  type StaffAuthRecord,
  type StaffContextRecord,
  type StaffWithTenantRecord,
  type StaffRecord,
  type StaffListItem,
  type StaffListSort,
  type StaffListScope,
  type StaffCursorPosition,
  type ListStaffOptions,
  type ListStaffResult,
  type CreateStaffPersistenceInput,
  type UpdateStaffPersistenceInput,
} from './staff.repository.port.js';
export { type IStaffActiveBranchStore } from './staff-active-branch.port.js';
export {
  type IStaffPermissionsCache,
} from './staff-permissions-cache.port.js';
export {
  type IStaffPermissionsRepository,
  type StaffPermissionSources,
} from './staff-permissions.repository.port.js';
export {
  type IGlobalCustomerRepository,
  type GlobalCustomerAuthRecord,
  type GlobalCustomerDetailRecord,
  type GlobalCustomerProfileInput,
  type GlobalCustomerGender,
} from './global-customer.repository.port.js';
export {
  type IUserRepository,
  type PhoneConflictKind,
  type UserAuthRecord,
} from './user.repository.port.js';
export {
  type IUserCredentialRepository,
  type CreateUserCredentialInput,
} from './user-credential.repository.port.js';
export { type IPasswordHasherPort } from './password-hasher.port.js';
export { type ILoginHardeningPort, type LoginHardeningContext } from '../auth/ports/login-hardening.port.js';
export { type IUserMfaPort, type UserMfaLoginStepUp, type UserMfaSettings, type TotpVerifyResult } from '../auth/ports/user-mfa.port.js';
export {
  type IUserMfaTotpRepository,
  type CreateUserMfaTotpInput,
} from '../auth/ports/user-mfa-totp.repository.port.js';
export { type IMfaEncryptionPort } from '../auth/ports/mfa-encryption.port.js';
export { type ITotpServicePort, TOTP_ISSUER } from '../auth/ports/totp-service.port.js';
export { type ITotpSetupStorePort, TOTP_SETUP_TTL_SECONDS, type TotpSetupPending } from '../auth/ports/totp-setup-store.port.js';
export { type ITotpVerificationPort } from '../auth/ports/totp-verification.port.js';
export { type IQrCodeGeneratorPort } from '../auth/ports/qr-code-generator.port.js';
export { type IAuditLogPort, type AuditLogEntry, type AuditService, type AuditLogInput, type AuditLogRecord, type AuditFindQuery, type ActorType, AUDIT_SERVICE } from './audit.port.js';
export {
  type IOutboxPublisher,
  type OutboxPublishOptions,
  type OutboxTransaction,
  OUTBOX_PUBLISHER,
} from './outbox.port.js';
export { type ITokenBlacklistPort } from './token-blacklist.port.js';
export {
  type AccessTokenPayload,
  type AuthActor,
  type ChangePasswordTokenPayload,
  type CustomerAccessTokenPayload,
  type IAuthTokenService,
  type MfaPendingTokenPayload,
  type RefreshTokenPayload,
  type ResetTokenPayload,
  type StaffAccessTokenPayload,
  type VerifiedTokenPayload,
} from './auth.port.js';
export {
  FORGOT_PASSWORD_IP_LIMIT,
  FORGOT_PASSWORD_IP_WINDOW_SECONDS,
  FORGOT_PASSWORD_PHONE_LIMIT,
  FORGOT_PASSWORD_PHONE_WINDOW_SECONDS,
  RESET_PASSWORD_IP_LIMIT,
  RESET_PASSWORD_IP_WINDOW_SECONDS,
  type IForgotPasswordRateLimiterPort,
} from '../auth/ports/forgot-password-rate-limiter.port.js';
export {
  LOGIN_IP_LIMIT,
  LOGIN_IP_WINDOW_SECONDS,
  LOGIN_PHONE_LIMIT,
  LOGIN_PHONE_WINDOW_SECONDS,
  DEFAULT_LOCKOUT_POLICY,
  type ILoginRateLimiterPort,
  type LockoutPolicy,
} from '../auth/ports/login-rate-limiter.port.js';
export { type IResetTokenConsumptionPort } from '../auth/ports/reset-token-consumption.port.js';
export {
  type IUserRefreshInvalidationPort,
  type IUserSessionRevocationPort,
} from '../auth/ports/user-session-revocation.port.js';
export {
  type BooleanSettingDef,
  type EnumSettingDef,
  type ISettingsSchemaRegistry,
  type SettingFieldDef,
  type SettingsModuleSchema,
} from './settings-schema-registry.port.js';
export {
  type ITenantSettingsRepository,
  type TenantSettingRecord,
  type UpsertTenantSettingInput,
} from './tenant-settings.repository.port.js';
export { type IModuleEntitlement } from './module-entitlement.port.js';
export {
  type IDashboardReportRepository,
  type DashboardReportAggregates,
  type DashboardReportScopeFilter,
  type DashboardTimeBounds,
  type CashflowWindowBounds,
  type CashflowMonthAggregate,
} from './dashboard-report.repository.port.js';
export {
  type IOverdueReportRepository,
  type OverdueReportCursorPayload,
  type OverdueReportListQuery,
  type OverdueReportListResult,
  type OverdueReportRow,
  type OverdueReportScopeFilter,
  type OverdueReportSort,
} from './overdue-report.repository.port.js';
export {
  REPORT_CACHE,
  type IReportCache,
  type CachedDashboardEntry,
  type CachedDashboardPayload,
} from './report-cache.port.js';
export {
  type ISoftDeletableRepository,
  type SoftDeletableRecord,
  type SoftDeleteCommand,
  type RestoreCommand,
} from './soft-deletable.repository.port.js';
export {
  type ITenantCustomerRepository,
  type TenantCustomerRecord,
  type TenantCustomerDetailRecord,
  type DeletedTenantCustomerRecord,
  type TenantCustomerListItem,
  type TenantCustomerListSort,
  type TenantCustomerListLinkStatusFilter,
  type TenantCustomerListScope,
  type TenantCustomerFullDetail,
  type TenantCustomerGlobalProfile,
  type TenantCustomerSalesSummary,
  type TenantCustomerSalesSummaryScope,
  type TenantCustomerCursorPosition,
  type ListActiveTenantCustomersOptions,
  type ListActiveTenantCustomersResult,
  type CreateTenantCustomerLinkInput,
  type TenantCustomerDetailWithRelationsRecord,
  type TenantCustomerStatus,
  type PreferredContactChannel,
  type RestoreTenantCustomerLinkInput,
  type UpdateTenantCustomerLinkInput,
} from './tenant-customer.repository.port.js';
export {
  CUSTOMER_DOCUMENT_REPOSITORY,
  type CreateCustomerDocumentInput,
  type CustomerDocumentRecord,
  type CustomerDocumentType,
  type ICustomerDocumentRepository,
  type ListCustomerDocumentsOptions,
} from './customer-document.repository.port.js';
export {
  type CustomerTimelineEventRecord,
  type CustomerTimelineEventType,
  type CustomerTimelineScopeFilter,
  type ICustomerTimelineRepository,
  type ListCustomerTimelineOptions,
} from './customer-timeline.repository.port.js';
export {
  type CustomerPaymentListRecord,
  type CustomerPaymentScopeFilter,
  type CustomerPaymentStatus,
  type CustomerPaymentSummaryRecord,
  type ICustomerPaymentsRepository,
  type ListCustomerPaymentsOptions,
  type SummarizeCustomerPaymentsOptions,
} from './customer-payments.repository.port.js';
export {
  type CustomerContractListRecord,
  type CustomerContractScopeFilter,
  type CustomerContractStatus,
  type ICustomerContractsRepository,
  type ListCustomerContractsOptions,
} from './customer-contracts.repository.port.js';
export {
  CUSTOMER_NOTE_REPOSITORY,
  type CreateCustomerNoteInput,
  type CustomerNoteRecord,
  type CustomerNoteRecordWithAuthor,
  type ICustomerNoteRepository,
  type ListCustomerNotesOptions,
  type UpdateCustomerNoteInput,
} from './customer-note.repository.port.js';
export {
  CUSTOMER_CONTACT_PHONE_REPOSITORY,
  type CreateCustomerContactPhonesInput,
  type CustomerContactPhoneLabel,
  type CustomerContactPhoneRecord,
  type ICustomerContactPhoneRepository,
  type ListCustomerContactPhonesOptions,
  type UpsertCustomerContactPhoneItem,
  type UpsertCustomerContactPhonesInput,
  type SyncCustomerContactPhoneItem,
  type SyncCustomerContactPhonesInput,
} from './customer-contact-phone.repository.port.js';
export {
  CUSTOMER_ADDRESS_REPOSITORY,
  type CreateCustomerAddressItem,
  type CreateCustomerAddressesInput,
  type SyncCustomerAddressItem,
  type SyncCustomerAddressesInput,
  type CustomerAddressLabel,
  type CustomerAddressRecord,
  type ICustomerAddressRepository,
  type ListCustomerAddressesOptions,
} from './customer-address.repository.port.js';
export {
  CUSTOMER_EMERGENCY_CONTACT_REPOSITORY,
  type CreateCustomerEmergencyContactItem,
  type CreateCustomerEmergencyContactsInput,
  type SyncCustomerEmergencyContactItem,
  type SyncCustomerEmergencyContactsInput,
  type CustomerEmergencyContactRecord,
  type EmergencyContactRelation,
  type ICustomerEmergencyContactRepository,
  type ListCustomerEmergencyContactsOptions,
} from './customer-emergency-contact.repository.port.js';
export {
  CUSTOMER_CATEGORY_READER,
  type ICustomerCategoryReader,
  type CustomerCategoryLookupResult,
} from './customer-category.reader.port.js';
export {
  type ISaleRepository,
  type SaleRecord,
  type CreateSalePersistenceInput,
  type SaveSalePersistenceInput,
  type UpdateSalePersistenceInput,
  type UpdateSaleFinancialsPersistenceInput,
  type ExtendSalePersistenceInput,
  type TerminateSalePersistenceInput,
  type CloseSalePersistenceInput,
  type ArchiveSalePersistenceInput,
  type UnarchiveSalePersistenceInput,
  type SaleCustomerEmbed,
  type SaleListItem,
  type SaleDetailRecord,
  type SaleListSort,
  type SaleCursorPosition,
  type ListSalesQueryOptions,
  type ListSalesResult,
  SALE_REPOSITORY,
} from './sale.repository.port.js';
export {
  type IContractVersionRepository,
  type ContractVersionRecord,
  type ContractVersionSnapshot,
  type ContractVersionChangeType,
  type AppendContractVersionInput,
} from './contract-version.repository.port.js';
export {
  CONTRACT_NUMBER_ALLOCATOR,
  type IContractNumberAllocator,
} from './contract-number-allocator.port.js';
export {
  CONTRACT_NUMBER_SEQUENCE_KEY,
  TENANT_SEQUENCE_REPOSITORY,
  type ITenantSequenceRepository,
} from './tenant-sequence.repository.port.js';
export {
  SALE_COPY_RELATED_REPOSITORY,
  type ISaleCopyRelatedRepository,
  type SaleCopyLineItemRecord,
  type SaleCopyGuarantorRecord,
} from './sale-copy-related.repository.port.js';
export {
  INSTALLMENT_SCHEDULE_EXTENDER,
  type ExtendInstallmentScheduleInput,
  type IInstallmentScheduleExtender,
} from './installment-schedule-extender.port.js';
export {
  INSTALLMENT_CLOSE_WAIVER,
  type IInstallmentCloseWaiver,
  type WaiveRemainingOnCloseInput,
} from './installment-close-waiver.port.js';
export {
  type ISaleLineItemRepository,
  type SaleLineItemRecord,
  type CreateSaleLineItemInput,
  type UpdateSaleLineItemInput,
  type ReplaceSaleLineItemsInput,
  type ListSaleLineItemsOptions,
  SALE_LINE_ITEM_REPOSITORY,
} from './sale-line-item.repository.port.js';
export {
  type IContractCollateralRepository,
  type ContractCollateralRecord,
  type CollateralType,
  type CollateralStatus,
  type CreateContractCollateralInput,
  type UpdateContractCollateralInput,
  type UpdateContractCollateralStatusInput,
  type ListContractCollateralsOptions,
  CONTRACT_COLLATERAL_REPOSITORY,
} from './contract-collateral.repository.port.js';
export {
  type IContractGuarantorRepository,
  type ContractGuarantorRecord,
  type GuarantorRelationship,
  type CreateContractGuarantorInput,
  type UpdateContractGuarantorInput,
  type ListContractGuarantorsOptions,
  CONTRACT_GUARANTOR_REPOSITORY,
} from './contract-guarantor.repository.port.js';
export {
  type IContractAttachmentRepository,
  type ContractAttachmentRecord,
  type ContractAttachmentType,
  type CreateContractAttachmentInput,
  type ListContractAttachmentsOptions,
  CONTRACT_ATTACHMENT_REPOSITORY,
} from './contract-attachment.repository.port.js';
export {
  type IInstallmentRepository,
  type InstallmentRecord,
  type SaveInstallmentPersistenceInput,
  type RegenerateInstallmentScheduleInput,
  type UpdateInstallmentAmountInput,
  type InstallmentListItem,
  type InstallmentListSort,
  type InstallmentCursorPosition,
  type ListInstallmentsQueryOptions,
  type ListInstallmentsResult,
  INSTALLMENT_REPOSITORY,
} from './installment.repository.port.js';
export {
  type ISaleIdempotencyStore,
  type SaleIdempotencyCachedRecord,
  SALE_IDEMPOTENCY_STORE,
} from './sale-idempotency.port.js';
export {
  type ICustomerImportIdempotencyStore,
  type CustomerImportIdempotencyResult,
  type CustomerImportIdempotencyCachedRecord,
  CUSTOMER_IMPORT_IDEMPOTENCY_STORE,
  CUSTOMER_IMPORT_IDEMPOTENCY_TTL_SECONDS,
} from './customer-import-idempotency.port.js';
export {
  type ICustomerMergeIdempotencyStore,
  type CustomerMergeIdempotencyResult,
  type CustomerMergeIdempotencyCachedRecord,
  CUSTOMER_MERGE_IDEMPOTENCY_STORE,
  CUSTOMER_MERGE_IDEMPOTENCY_TTL_SECONDS,
} from './customer-merge-idempotency.port.js';
export {
  type ITenantCustomerMergeRepository,
  type ReassignCustomerRelatedRecordsInput,
  type ReassignCustomerRelatedRecordsResult,
  TENANT_CUSTOMER_MERGE_REPOSITORY,
} from './tenant-customer-merge.repository.port.js';
export { type IUnitOfWork, UNIT_OF_WORK } from './unit-of-work.port.js';
export {
  type IPaymentAttemptRepository,
  type PaymentAttemptRecord,
  type CreatePaymentAttemptInput,
} from './payment-attempt.repository.port.js';
export { type IBranchReader } from './branch.reader.port.js';
export { type IPermissionRegistry } from './permission.registry.port.js';
export {
  type IPermissionOverrideRepository,
  type PermissionOverrideRecord,
  type CreatePermissionOverridePersistenceInput,
} from './permission-override.repository.port.js';
export {
  type IRoleRepository,
  type RoleRecord,
  type CreateRolePersistenceInput,
  type UpdateRolePersistenceInput,
} from './role.repository.port.js';
export {
  type IBranchRepository,
  type BranchRecord,
  type BranchListItem,
  type BranchListSort,
  type BranchCursorPosition,
  type BranchListScope,
  type ListBranchesOptions,
  type ListBranchesResult,
  type CreateBranchPersistenceInput,
  type UpdateBranchPersistenceInput,
} from './branch.repository.port.js';
export { type ITenantPlanReader } from './tenant-plan.reader.port.js';
export {
  type ITenantRegistrationRepository,
  type RegisterTenantData,
  type RegisterTenantResult,
} from './tenant-registration.repository.port.js';
export { type IRegisterRateLimiter } from './register-rate-limiter.port.js';
