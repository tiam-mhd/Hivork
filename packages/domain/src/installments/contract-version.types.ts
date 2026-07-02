/**
 * IFP-056 — immutable contract version snapshot shape stored in `ContractVersion.snapshot`.
 *
 * Append-only table — no soft delete (SOFT-DELETE-POLICY exception, same as AuditLog).
 */

export const CONTRACT_VERSION_MIN_CHANGE_REASON_LENGTH = 3;

export enum ContractVersionChangeType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  EXTEND = 'EXTEND',
  COPY_SOURCE = 'COPY_SOURCE',
  TERMINATE = 'TERMINATE',
  CLOSE = 'CLOSE',
  FINANCIAL_RECALC = 'FINANCIAL_RECALC',
}

/** Serialized sale fields at the point in time (bigint fields as string). */
export type ContractVersionSaleSnapshot = Record<string, unknown>;

export type ContractVersionSnapshot = {
  /** Required — serialized Sale fields at version time */
  sale: ContractVersionSaleSnapshot;
  lineItems?: Record<string, unknown>[];
  guarantors?: Record<string, unknown>[];
  collaterals?: Record<string, unknown>[];
  installmentSchedule?: Record<string, unknown>[];
  /** SHA-256 of relevant tenant settings keys at version time */
  settingsHash?: string;
};

export type ContractVersionProps = {
  id: string;
  tenantId: string;
  saleId: string;
  versionNumber: number;
  changeType: ContractVersionChangeType;
  changeReason: string;
  snapshot: ContractVersionSnapshot;
  createdAt: Date;
  createdById: string | null;
};

const REQUIRED_SNAPSHOT_KEYS: Array<keyof ContractVersionSnapshot> = ['sale'];

export function isContractVersionSnapshot(value: unknown): value is ContractVersionSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const snapshot = value as ContractVersionSnapshot;
  if (!snapshot.sale || typeof snapshot.sale !== 'object') {
    return false;
  }

  for (const key of REQUIRED_SNAPSHOT_KEYS) {
    if (!(key in snapshot)) {
      return false;
    }
  }

  return true;
}

export function assertValidChangeReason(reason: string): void {
  if (reason.trim().length < CONTRACT_VERSION_MIN_CHANGE_REASON_LENGTH) {
    throw new Error(
      `changeReason must be at least ${CONTRACT_VERSION_MIN_CHANGE_REASON_LENGTH} characters`,
    );
  }
}
