import type { OutboxTransaction } from './outbox.port.js';

export type StoredFileRecord = {
  id: string;
  tenantId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: bigint;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  metadata: Record<string, unknown> | null;
};

export type CreateStoredFileInput = {
  id: string;
  tenantId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: bigint;
  category?: string | null;
  createdById: string;
  metadata?: Record<string, unknown> | null;
};

export interface IStoredFileRepository {
  create(input: CreateStoredFileInput, tx?: OutboxTransaction): Promise<StoredFileRecord>;
  findById(tenantId: string, id: string, tx?: OutboxTransaction): Promise<StoredFileRecord | null>;
}

export const STORED_FILE_REPOSITORY = Symbol('STORED_FILE_REPOSITORY');
