import type {
  RestoreCommand,
  SoftDeleteCommand,
} from './soft-deletable.repository.port.js';

export type CustomerDocumentType =
  | 'national_id'
  | 'birth_certificate'
  | 'contract'
  | 'photo'
  | 'other';

export type CustomerDocumentRecord = {
  id: string;
  tenantId: string;
  tenantCustomerId: string;
  documentType: CustomerDocumentType;
  fileStorageKey: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: bigint;
  uploadedById: string;
  description: string | null;
  expiresAt: Date | null;
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

export type CreateCustomerDocumentInput = {
  id: string;
  tenantId: string;
  tenantCustomerId: string;
  documentType: CustomerDocumentType;
  fileStorageKey: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: bigint;
  uploadedById: string;
  createdById: string;
  description?: string | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
};

export type ListCustomerDocumentsOptions = {
  tenantId: string;
  tenantCustomerId: string;
  documentType?: CustomerDocumentType;
  includeDeleted?: boolean;
};

/** Repository port — Prisma implementation in IFP-043. */
export interface ICustomerDocumentRepository {
  findById(id: string, tenantId: string): Promise<CustomerDocumentRecord | null>;
  listByCustomer(options: ListCustomerDocumentsOptions): Promise<CustomerDocumentRecord[]>;
  create(input: CreateCustomerDocumentInput): Promise<CustomerDocumentRecord>;
  softDelete(command: SoftDeleteCommand): Promise<CustomerDocumentRecord>;
  restore(command: RestoreCommand): Promise<CustomerDocumentRecord>;
}

export const CUSTOMER_DOCUMENT_REPOSITORY = Symbol('CUSTOMER_DOCUMENT_REPOSITORY');
