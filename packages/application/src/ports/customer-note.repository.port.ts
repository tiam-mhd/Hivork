import type {
  RestoreCommand,
  SoftDeleteCommand,
} from './soft-deletable.repository.port.js';

export type CustomerNoteRecord = {
  id: string;
  tenantId: string;
  tenantCustomerId: string;
  body: string;
  isPinned: boolean;
  authorStaffId: string;
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

export type CreateCustomerNoteInput = {
  tenantId: string;
  tenantCustomerId: string;
  body: string;
  authorStaffId: string;
  createdById: string;
  isPinned?: boolean;
  metadata?: Record<string, unknown>;
};

export type UpdateCustomerNoteInput = {
  tenantId: string;
  id: string;
  updatedById: string;
  body?: string;
  isPinned?: boolean;
};

export type ListCustomerNotesOptions = {
  tenantId: string;
  tenantCustomerId: string;
  limit?: number;
  cursor?: {
    isPinned: boolean;
    createdAt: Date;
    id: string;
  };
  includeDeleted?: boolean;
};

export type CustomerNoteRecordWithAuthor = CustomerNoteRecord & {
  authorName: string | null;
};

/** Repository port — Prisma implementation in IFP-047. */
export interface ICustomerNoteRepository {
  findById(id: string, tenantId: string): Promise<CustomerNoteRecord | null>;
  listByCustomer(options: ListCustomerNotesOptions): Promise<CustomerNoteRecordWithAuthor[]>;
  create(input: CreateCustomerNoteInput): Promise<CustomerNoteRecord>;
  update(input: UpdateCustomerNoteInput): Promise<CustomerNoteRecord>;
  softDelete(command: SoftDeleteCommand): Promise<CustomerNoteRecord>;
  restore(command: RestoreCommand): Promise<CustomerNoteRecord>;
}

export const CUSTOMER_NOTE_REPOSITORY = Symbol('CUSTOMER_NOTE_REPOSITORY');
