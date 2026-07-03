import type { OutboxTransaction } from './outbox.port.js';

export type CheckTrackingNoteRecord = {
  id: string;
  tenantId: string;
  checkId: string;
  body: string;
  authorStaffId: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  version: number;
  metadata: Record<string, unknown> | null;
};

export type CreateCheckTrackingNoteInput = {
  id: string;
  tenantId: string;
  checkId: string;
  body: string;
  authorStaffId: string;
  createdById: string;
};

export interface ICheckTrackingNoteRepository {
  create(
    input: CreateCheckTrackingNoteInput,
    tx?: OutboxTransaction,
  ): Promise<CheckTrackingNoteRecord>;
  listByCheckId(tenantId: string, checkId: string): Promise<CheckTrackingNoteRecord[]>;
}

export const CHECK_TRACKING_NOTE_REPOSITORY = Symbol('CHECK_TRACKING_NOTE_REPOSITORY');
