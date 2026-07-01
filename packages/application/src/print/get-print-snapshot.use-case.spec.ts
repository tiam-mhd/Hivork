import { describe, expect, it } from 'vitest';

import { GetPrintSnapshotUseCase } from './get-print-snapshot.use-case.js';
import type { IPrintSnapshotStore, PrintSnapshotRecord } from '../ports/print-snapshot-store.port.js';

class InMemoryPrintSnapshotStore implements IPrintSnapshotStore {
  constructor(private readonly records = new Map<string, PrintSnapshotRecord>()) {}

  async save(token: string, record: PrintSnapshotRecord, _ttlSeconds: number): Promise<void> {
    this.records.set(token, record);
  }

  async get(token: string): Promise<PrintSnapshotRecord | null> {
    return this.records.get(token) ?? null;
  }
}

const basePayload = {
  resourceKey: 'customers' as const,
  title: 'لیست مشتریان',
  locale: 'fa-IR' as const,
  orientation: 'portrait' as const,
  tenant: { name: 'Demo' },
  generatedAt: new Date().toISOString(),
  columns: [{ id: 'name', header: 'نام' }],
  rows: [['علی']],
  rowCount: 1,
};

describe('GetPrintSnapshotUseCase', () => {
  it('returns snapshot for matching tenant and staff', async () => {
    const store = new InMemoryPrintSnapshotStore();
    const token = '00000000-0000-4000-8000-000000000001';
    const expiresAt = new Date(Date.now() + 60_000);

    await store.save(token, {
      tenantId: 'tenant-1',
      staffId: 'staff-1',
      expiresAt,
      payload: basePayload,
    });

    const useCase = new GetPrintSnapshotUseCase(store);
    const result = await useCase.execute({
      token,
      tenantId: 'tenant-1',
      staffId: 'staff-1',
    });

    expect(result.title).toBe('لیست مشتریان');
  });

  it('throws PRINT_TOKEN_EXPIRED when token is missing', async () => {
    const useCase = new GetPrintSnapshotUseCase(new InMemoryPrintSnapshotStore());

    await expect(
      useCase.execute({
        token: '00000000-0000-4000-8000-000000000099',
        tenantId: 'tenant-1',
        staffId: 'staff-1',
      }),
    ).rejects.toMatchObject({ code: 'PRINT_TOKEN_EXPIRED' });
  });

  it('throws PRINT_TOKEN_EXPIRED when tenant does not match', async () => {
    const store = new InMemoryPrintSnapshotStore();
    const token = '00000000-0000-4000-8000-000000000002';

    await store.save(token, {
      tenantId: 'tenant-1',
      staffId: 'staff-1',
      expiresAt: new Date(Date.now() + 60_000),
      payload: basePayload,
    });

    const useCase = new GetPrintSnapshotUseCase(store);

    await expect(
      useCase.execute({
        token,
        tenantId: 'tenant-2',
        staffId: 'staff-1',
      }),
    ).rejects.toMatchObject({ code: 'PRINT_TOKEN_EXPIRED' });
  });
});
