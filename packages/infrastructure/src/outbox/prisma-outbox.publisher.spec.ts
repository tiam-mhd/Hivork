import { DomainEvent } from '@hivork/domain';
import { describe, expect, it, vi } from 'vitest';

import { PrismaOutboxPublisher } from './prisma-outbox.publisher.js';

class TestEvent extends DomainEvent {
  readonly eventType = 'tenant.created';
  constructor(readonly aggregateId: string) {
    super();
  }

  toPayload(): Record<string, unknown> {
    return { slug: 'demo' };
  }
}

describe('PrismaOutboxPublisher', () => {
  it('creates a pending outbox row', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'event-1' });
    const prisma = { outboxEvent: { create } } as never;
    const publisher = new PrismaOutboxPublisher(prisma);

    await publisher.publish(new TestEvent('00000000-0000-0000-0000-000000000050'), {
      tenantId: '00000000-0000-0000-0000-000000000001',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: '00000000-0000-0000-0000-000000000001',
        aggregateType: 'tenant',
        aggregateId: '00000000-0000-0000-0000-000000000050',
        eventType: 'tenant.created',
        payload: { slug: 'demo' },
        status: 'pending',
      },
    });
  });

  it('uses transaction client when provided', async () => {
    const txCreate = vi.fn().mockResolvedValue({ id: 'event-1' });
    const tx = { outboxEvent: { create: txCreate } };
    const prisma = { outboxEvent: { create: vi.fn() } } as never;
    const publisher = new PrismaOutboxPublisher(prisma);

    await publisher.publish(
      new TestEvent('00000000-0000-0000-0000-000000000050'),
      { tenantId: '00000000-0000-0000-0000-000000000001' },
      tx,
    );

    expect(txCreate).toHaveBeenCalledOnce();
    expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
  });
});
