import { describe, expect, it, vi } from 'vitest';

import { PrismaAuditService } from './prisma-audit.service.js';

describe('PrismaAuditService', () => {
  it('creates an audit_logs row', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'audit-1' });
    const prisma = { auditLog: { create } } as never;
    const service = new PrismaAuditService(prisma);

    await service.log({
      tenantId: 'tenant-1',
      actorType: 'staff',
      actorId: 'staff-1',
      action: 'auth.login_success',
      entityType: 'staff',
      entityId: 'staff-1',
      ip: '127.0.0.1',
      userAgent: 'vitest',
      newValue: { phone: '09123456789' },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        actorType: 'staff',
        actorId: 'staff-1',
        action: 'auth.login_success',
        entityType: 'staff',
        entityId: 'staff-1',
        oldValue: undefined,
        newValue: { phone: '09123456789' },
        ip: '127.0.0.1',
        userAgent: 'vitest',
        metadata: undefined,
      },
    });
  });

  it('append delegates to log', async () => {
    const service = new PrismaAuditService({ auditLog: { create: vi.fn() } } as never);
    const logSpy = vi.spyOn(service, 'log').mockResolvedValue(undefined);

    await service.append({
      actorType: 'system',
      actorId: '00000000-0000-0000-0000-000000000001',
      action: 'auth.login_failed',
      entityType: 'staff',
      entityId: '00000000-0000-0000-0000-000000000001',
    });

    expect(logSpy).toHaveBeenCalledOnce();
  });

  it('finds audit rows by query', async () => {
    const createdAt = new Date('2026-06-01T10:00:00.000Z');
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'audit-1',
        tenantId: 'tenant-1',
        actorType: 'staff',
        actorId: 'staff-1',
        action: 'tenant.create',
        entityType: 'tenant',
        entityId: 'tenant-1',
        oldValue: null,
        newValue: { slug: 'demo' },
        ip: null,
        userAgent: null,
        metadata: null,
        createdAt,
      },
    ]);
    const service = new PrismaAuditService({ auditLog: { create: vi.fn(), findMany } } as never);

    const rows = await service.find({ tenantId: 'tenant-1', limit: 10 });

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'audit-1',
        action: 'tenant.create',
        createdAt,
      }),
    ]);
  });
});
