import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';

export type CustomerDocumentType =
  | 'national_id'
  | 'birth_certificate'
  | 'contract'
  | 'photo'
  | 'other';

const DOCUMENT_TYPES = new Set<CustomerDocumentType>([
  'national_id',
  'birth_certificate',
  'contract',
  'photo',
  'other',
]);

export const ALLOWED_CUSTOMER_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

export type AllowedCustomerDocumentMimeType = (typeof ALLOWED_CUSTOMER_DOCUMENT_MIME_TYPES)[number];

const MAX_STORAGE_KEY_LENGTH = 512;
const MAX_FILE_NAME_LENGTH = 255;
const MAX_MIME_TYPE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;

export class CustomerDocument {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    readonly tenantCustomerId: string,
    private _documentType: CustomerDocumentType,
    private _fileStorageKey: string,
    private _originalFileName: string,
    private _mimeType: AllowedCustomerDocumentMimeType,
    private _sizeBytes: bigint,
    readonly uploadedById: string,
    private _description: string | null,
    private _expiresAt: Date | null,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
    private _deleteReason: string | null = null,
  ) {}

  static create(props: {
    id?: string;
    tenantId: string;
    tenantCustomerId: string;
    documentType: CustomerDocumentType;
    fileStorageKey: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: bigint;
    uploadedById: string;
    description?: string | null;
    expiresAt?: Date | null;
  }): CustomerDocument {
    return new CustomerDocument(
      props.id ?? randomUUID(),
      props.tenantId,
      props.tenantCustomerId,
      normalizeDocumentType(props.documentType),
      normalizeStorageKey(props.fileStorageKey),
      normalizeFileName(props.originalFileName),
      normalizeMimeType(props.mimeType),
      normalizeSizeBytes(props.sizeBytes),
      props.uploadedById,
      normalizeOptionalText(props.description, MAX_DESCRIPTION_LENGTH),
      props.expiresAt ?? null,
    );
  }

  static reconstitute(props: {
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
    deletedAt: Date | null;
    deletedById: string | null;
    deleteReason: string | null;
  }): CustomerDocument {
    return new CustomerDocument(
      props.id,
      props.tenantId,
      props.tenantCustomerId,
      props.documentType,
      props.fileStorageKey,
      props.originalFileName,
      normalizeMimeType(props.mimeType),
      props.sizeBytes,
      props.uploadedById,
      props.description,
      props.expiresAt,
      props.deletedAt,
      props.deletedById,
      props.deleteReason,
    );
  }

  get documentType(): CustomerDocumentType {
    return this._documentType;
  }

  get fileStorageKey(): string {
    return this._fileStorageKey;
  }

  get originalFileName(): string {
    return this._originalFileName;
  }

  get mimeType(): AllowedCustomerDocumentMimeType {
    return this._mimeType;
  }

  get sizeBytes(): bigint {
    return this._sizeBytes;
  }

  get description(): string | null {
    return this._description;
  }

  get expiresAt(): Date | null {
    return this._expiresAt;
  }

  get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  get deletedById(): string | null {
    return this._deletedById;
  }

  get deleteReason(): string | null {
    return this._deleteReason;
  }

  updateMetadata(props: {
    documentType?: CustomerDocumentType;
    description?: string | null;
    expiresAt?: Date | null;
  }): void {
    this.assertActive();
    if (props.documentType !== undefined) {
      this._documentType = normalizeDocumentType(props.documentType);
    }
    if (props.description !== undefined) {
      this._description = normalizeOptionalText(props.description, MAX_DESCRIPTION_LENGTH);
    }
    if (props.expiresAt !== undefined) {
      this._expiresAt = props.expiresAt;
    }
  }

  softDelete(deletedById: string, reason?: string): void {
    if (this.isDeleted) {
      throw new DomainError('ALREADY_DELETED');
    }
    this._deletedAt = new Date();
    this._deletedById = deletedById;
    this._deleteReason = reason?.trim() || null;
  }

  restore(): void {
    if (!this.isDeleted) {
      throw new DomainError('NOT_DELETED');
    }
    this._deletedAt = null;
    this._deletedById = null;
    this._deleteReason = null;
  }

  private assertActive(): void {
    if (this.isDeleted) {
      throw new DomainError('DOCUMENT_DELETED');
    }
  }
}

function normalizeDocumentType(value: CustomerDocumentType): CustomerDocumentType {
  if (!DOCUMENT_TYPES.has(value)) {
    throw new DomainError('INVALID_DOCUMENT_TYPE');
  }
  return value;
}

function normalizeStorageKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_STORAGE_KEY_LENGTH) {
    throw new DomainError('INVALID_STORAGE_KEY');
  }
  return trimmed;
}

function normalizeFileName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_FILE_NAME_LENGTH) {
    throw new DomainError('INVALID_FILE_NAME');
  }
  return trimmed;
}

function normalizeMimeType(value: string): AllowedCustomerDocumentMimeType {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > MAX_MIME_TYPE_LENGTH) {
    throw new DomainError('INVALID_MIME_TYPE');
  }
  if (!(ALLOWED_CUSTOMER_DOCUMENT_MIME_TYPES as readonly string[]).includes(trimmed)) {
    throw new DomainError('MIME_TYPE_NOT_ALLOWED');
  }
  return trimmed as AllowedCustomerDocumentMimeType;
}

function normalizeSizeBytes(value: bigint): bigint {
  if (value < 0n) {
    throw new DomainError('INVALID_FILE_SIZE');
  }
  return value;
}

function normalizeOptionalText(value: string | null | undefined, maxLength: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > maxLength) {
    throw new DomainError('FIELD_TOO_LONG');
  }
  return trimmed;
}
