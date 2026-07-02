import type { RestoreCommand, SoftDeleteCommand } from './soft-deletable.repository.port.js';
import type { OutboxTransaction } from './outbox.port.js';

export type ContractAttachmentType =
  | 'CONTRACT_SCAN'
  | 'SIGNED_CONTRACT'
  | 'IDENTITY_DOC'
  | 'COLLATERAL_DOC'
  | 'OTHER';

export type ContractAttachmentRecord = {
  id: string;
  tenantId: string;
  saleId: string;
  fileId: string;
  attachmentType: ContractAttachmentType;
  label: string | null;
  description: string | null;
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

export type CreateContractAttachmentInput = {
  id: string;
  tenantId: string;
  saleId: string;
  fileId: string;
  attachmentType: ContractAttachmentType;
  createdById: string;
  label?: string | null;
  description?: string | null;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

export type ListContractAttachmentsOptions = {
  tenantId: string;
  saleId: string;
  attachmentType?: ContractAttachmentType;
  includeDeleted?: boolean;
};

/** Repository port — Prisma implementation in IFP-057. Restore pattern: IFP-063. */
export interface IContractAttachmentRepository {
  findById(id: string, tenantId: string): Promise<ContractAttachmentRecord | null>;
  listBySale(
    options: ListContractAttachmentsOptions,
    tx?: OutboxTransaction,
  ): Promise<ContractAttachmentRecord[]>;
  countActiveBySale(tenantId: string, saleId: string): Promise<number>;
  create(
    input: CreateContractAttachmentInput,
    tx?: OutboxTransaction,
  ): Promise<ContractAttachmentRecord>;
  softDelete(command: SoftDeleteCommand): Promise<ContractAttachmentRecord>;
  restore(command: RestoreCommand): Promise<ContractAttachmentRecord>;
}

export const CONTRACT_ATTACHMENT_REPOSITORY = Symbol('CONTRACT_ATTACHMENT_REPOSITORY');
