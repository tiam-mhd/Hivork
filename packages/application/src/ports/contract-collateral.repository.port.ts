import type { RestoreCommand, SoftDeleteCommand } from './soft-deletable.repository.port.js';
import type { OutboxTransaction } from './outbox.port.js';

export type CollateralType =
  | 'CHEQUE'
  | 'PROMISSORY_NOTE'
  | 'GOLD'
  | 'VEHICLE'
  | 'PROPERTY'
  | 'CASH_DEPOSIT'
  | 'OTHER';

export type CollateralStatus = 'PLEDGED' | 'RELEASED' | 'FORFEITED';

export type ContractCollateralRecord = {
  id: string;
  tenantId: string;
  saleId: string;
  collateralType: CollateralType;
  title: string;
  description: string | null;
  estimatedValueRial: bigint;
  documentFileId: string | null;
  registrationNumber: string | null;
  issuedAt: Date | null;
  status: CollateralStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  version: number;
  metadata: Record<string, unknown> | null;
};

export type CreateContractCollateralInput = {
  id: string;
  tenantId: string;
  saleId: string;
  collateralType: CollateralType;
  title: string;
  description?: string | null;
  estimatedValueRial: bigint;
  documentFileId?: string | null;
  registrationNumber?: string | null;
  issuedAt?: Date | null;
  sortOrder?: number;
  createdById: string;
  metadata?: Record<string, unknown>;
};

export type UpdateContractCollateralStatusInput = {
  id: string;
  tenantId: string;
  status: CollateralStatus;
  updatedById: string;
};

export type UpdateContractCollateralInput = {
  id: string;
  tenantId: string;
  collateralType?: CollateralType;
  title?: string;
  description?: string | null;
  estimatedValueRial?: bigint;
  documentFileId?: string | null;
  registrationNumber?: string | null;
  issuedAt?: Date | null;
  sortOrder?: number;
  updatedById: string;
};

export type ListContractCollateralsOptions = {
  tenantId: string;
  saleId: string;
  status?: CollateralStatus;
  includeDeleted?: boolean;
};

/** Repository port — Prisma implementation in IFP-066. */
export interface IContractCollateralRepository {
  findById(id: string, tenantId: string): Promise<ContractCollateralRecord | null>;
  listBySale(
    options: ListContractCollateralsOptions,
    tx?: OutboxTransaction,
  ): Promise<ContractCollateralRecord[]>;
  countActiveBySale(tenantId: string, saleId: string): Promise<number>;
  create(
    input: CreateContractCollateralInput,
    tx?: OutboxTransaction,
  ): Promise<ContractCollateralRecord>;
  update(
    input: UpdateContractCollateralInput,
    tx?: OutboxTransaction,
  ): Promise<ContractCollateralRecord>;
  updateStatus(
    input: UpdateContractCollateralStatusInput,
    tx?: OutboxTransaction,
  ): Promise<ContractCollateralRecord>;
  softDelete(command: SoftDeleteCommand): Promise<ContractCollateralRecord>;
  restore(command: RestoreCommand): Promise<ContractCollateralRecord>;
}

export const CONTRACT_COLLATERAL_REPOSITORY = Symbol('CONTRACT_COLLATERAL_REPOSITORY');
