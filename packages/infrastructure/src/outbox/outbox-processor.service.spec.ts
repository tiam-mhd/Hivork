import { describe, expect, it, vi } from 'vitest';

import { OutboxProcessorService } from './outbox-processor.service.js';

describe('OutboxProcessorService', () => {
  it('marks pending events as processed', async () => {
    const event = {
      id: 'event-1',
      eventType: 'tenant.created',
      aggregateType: 'tenant',
      aggregateId: '00000000-0000-0000-0000-000000000001',
    };

    const prisma = {
      outboxEvent: {
        findMany: vi.fn().mockResolvedValue([{ id: event.id }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(event),
        update: vi.fn().mockResolvedValue({ ...event, status: 'processed' }),
      },
    } as never;

    const processor = new OutboxProcessorService(prisma);
    const processed = await processor.processPendingBatch();

    expect(processed).toBe(1);
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: event.id },
      data: {
        status: 'processed',
        processedAt: expect.any(Date),
        lastError: null,
      },
    });
  });
});
