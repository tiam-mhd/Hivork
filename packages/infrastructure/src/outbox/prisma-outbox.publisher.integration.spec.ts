import { DomainEvent } from '@hivork/domain';
import { afterAll, describe, expect, it } from 'vitest';

import { PrismaOutboxPublisher } from './prisma-outbox.publisher.js';
import { PrismaService } from '../prisma/prisma.service.js';

class IntegrationTestEvent extends DomainEvent {
  readonly eventType = 'tenant.created';

  constructor(readonly aggregateId: string) {
    super();
  }

  toPayload(): Record<string, unknown> {
    return { source: 'integration-test' };
  }
}

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('PrismaOutboxPublisher (integration)', () => {
  const prisma = new PrismaService();
  const publisher = new PrismaOutboxPublisher(prisma);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('commits entity and outbox row together or rolls back both', async () => {
    const plan = await prisma.plan.findFirst({ where: { deletedAt: null } });
    if (!plan) {
      throw new Error('Seed plan required for outbox transaction integration test');
    }

    const tenantId = '00000000-0000-0000-0000-000000000a50';
    const slug = `outbox-tx-${Date.now()}`;

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.tenant.create({
          data: {
            id: tenantId,
            name: 'Outbox Tx Test',
            slug,
            planId: plan.id,
            enabledModules: ['installments'],
          },
        });

        await publisher.publish(new IntegrationTestEvent(tenantId), { tenantId }, tx);

        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } });
    const outbox = await prisma.outboxEvent.findFirst({
      where: { aggregateId: tenantId, eventType: 'tenant.created' },
    });

    expect(tenant).toBeNull();
    expect(outbox).toBeNull();

    await prisma.$transaction(async (tx) => {
      await tx.tenant.create({
        data: {
          id: tenantId,
          name: 'Outbox Tx Test',
          slug,
          planId: plan.id,
          enabledModules: ['installments'],
        },
      });

      await publisher.publish(new IntegrationTestEvent(tenantId), { tenantId }, tx);
    });

    const committedTenant = await prisma.tenant.findFirst({ where: { id: tenantId } });
    const committedOutbox = await prisma.outboxEvent.findFirst({
      where: { aggregateId: tenantId, eventType: 'tenant.created' },
    });

    expect(committedTenant?.slug).toBe(slug);
    expect(committedOutbox).toMatchObject({
      status: 'pending',
      eventType: 'tenant.created',
      aggregateType: 'tenant',
    });

    await prisma.outboxEvent.deleteMany({ where: { aggregateId: tenantId } });
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { deletedAt: new Date(), deleteReason: 'outbox integration test cleanup' },
    });
  });
});
