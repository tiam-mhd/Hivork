import type { RestoreCommand, SoftDeleteCommand } from './soft-deletable.repository.port.js';
import type { OutboxTransaction } from './outbox.port.js';

export type GuarantorRelationship =
  | 'PARENT'
  | 'SPOUSE'
  | 'SIBLING'
  | 'EMPLOYER'
  | 'OTHER';

export type ContractGuarantorRecord = {
  id: string;
  tenantId: string;
  saleId: string;
  tenantCustomerId: string | null;
  fullName: string | null;
  nationalId: string | null;
  phone: string | null;
  relationship: GuarantorRelationship;
  note: string | null;
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

export type CreateContractGuarantorInput = {
  id: string;
  tenantId: string;
  saleId: string;
  tenantCustomerId?: string | null;
  fullName?: string | null;
  nationalId?: string | null;
  phone?: string | null;
  relationship: GuarantorRelationship;
  note?: string | null;
  sortOrder?: number;
  createdById: string;
  metadata?: Record<string, unknown>;
};

export type UpdateContractGuarantorInput = {
  id: string;
  tenantId: string;
  tenantCustomerId?: string | null;
  fullName?: string | null;
  nationalId?: string | null;
  phone?: string | null;
  relationship?: GuarantorRelationship;
  note?: string | null;
  sortOrder?: number;
  updatedById: string;
};

export type ListContractGuarantorsOptions = {
  tenantId: string;
  saleId: string;
  includeDeleted?: boolean;
};

/** Repository port — Prisma implementation in IFP-065. */
export interface IContractGuarantorRepository {
  findById(id: string, tenantId: string): Promise<ContractGuarantorRecord | null>;
  listBySale(
    options: ListContractGuarantorsOptions,
    tx?: OutboxTransaction,
  ): Promise<ContractGuarantorRecord[]>;
  countActiveBySale(tenantId: string, saleId: string): Promise<number>;
  create(
    input: CreateContractGuarantorInput,
    tx?: OutboxTransaction,
  ): Promise<ContractGuarantorRecord>;
  update(
    input: UpdateContractGuarantorInput,
    tx?: OutboxTransaction,
  ): Promise<ContractGuarantorRecord>;
  softDelete(command: SoftDeleteCommand): Promise<ContractGuarantorRecord>;
  restore(command: RestoreCommand): Promise<ContractGuarantorRecord>;
}

export const CONTRACT_GUARANTOR_REPOSITORY = Symbol('CONTRACT_GUARANTOR_REPOSITORY');
