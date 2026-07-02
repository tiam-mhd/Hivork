import type { OutboxTransaction } from './outbox.port.js';

export type ContractVersionChangeType =
  | 'CREATE'
  | 'UPDATE'
  | 'EXTEND'
  | 'COPY_SOURCE'
  | 'TERMINATE'
  | 'CLOSE'
  | 'FINANCIAL_RECALC';

export type ContractVersionSnapshot = {
  sale: Record<string, unknown>;
  lineItems?: Record<string, unknown>[];
  guarantors?: Record<string, unknown>[];
  collaterals?: Record<string, unknown>[];
  installmentSchedule?: Record<string, unknown>[];
  settingsHash?: string;
};

export type ContractVersionRecord = {
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

export type AppendContractVersionInput = {
  tenantId: string;
  saleId: string;
  versionNumber: number;
  changeType: ContractVersionChangeType;
  changeReason: string;
  snapshot: ContractVersionSnapshot;
  createdById?: string | null;
};

/** Append-only — no update/delete (SOFT-DELETE-POLICY exception). */
export interface IContractVersionRepository {
  appendVersion(input: AppendContractVersionInput, tx?: OutboxTransaction): Promise<ContractVersionRecord>;
  listBySale(tenantId: string, saleId: string): Promise<ContractVersionRecord[]>;
  findByVersionNumber(
    tenantId: string,
    saleId: string,
    versionNumber: number,
  ): Promise<ContractVersionRecord | null>;
  findLatestVersionNumber(tenantId: string, saleId: string): Promise<number | null>;
}
