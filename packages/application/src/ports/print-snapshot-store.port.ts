import type { PrintSnapshotPayloadDto } from '@hivork/contracts/core';

export const PRINT_SNAPSHOT_TTL_SECONDS = 300;

export type PrintSnapshotRecord = {
  tenantId: string;
  staffId: string;
  payload: PrintSnapshotPayloadDto;
  expiresAt: Date;
};

export interface IPrintSnapshotStore {
  save(token: string, record: PrintSnapshotRecord, ttlSeconds: number): Promise<void>;
  get(token: string): Promise<PrintSnapshotRecord | null>;
}

export const PRINT_SNAPSHOT_STORE = Symbol('PRINT_SNAPSHOT_STORE');
