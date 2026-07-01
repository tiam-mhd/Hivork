import { afterAll, describe, expect, it } from 'vitest';

import { PrismaAuditService } from './prisma-audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('PrismaAuditService (integration)', () => {
  const prisma = new PrismaService();
  const audit = new PrismaAuditService(prisma);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists a row in audit_logs', async () => {
    const entityId = '00000000-0000-0000-0000-00000000a047';

    await audit.log({
      actorType: 'system',
      actorId: '00000000-0000-0000-0000-000000000001',
      action: 'tenant.create',
      entityType: 'tenant',
      entityId,
      newValue: { slug: 'integration-test' },
    });

    const row = await prisma.auditLog.findFirst({
      where: { entityId, action: 'tenant.create' },
      orderBy: { createdAt: 'desc' },
    });

    expect(row).toMatchObject({
      action: 'tenant.create',
      entityType: 'tenant',
      entityId,
      actorType: 'system',
    });
  });
});
