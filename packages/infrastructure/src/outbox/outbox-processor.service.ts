import { Injectable, Logger } from '@nestjs/common';

import type { IOutboxEventHandler } from '@hivork/application';

import { PrismaService } from '../prisma/prisma.service.js';

const DEFAULT_BATCH_SIZE = 25;

@Injectable()
export class OutboxProcessorService {
  private readonly logger = new Logger(OutboxProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly handlers: IOutboxEventHandler[] = [],
  ) {}

  async processPendingBatch(batchSize = DEFAULT_BATCH_SIZE): Promise<number> {
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    for (const event of events) {
      await this.processEvent(event.id);
    }

    return events.length;
  }

  private async processEvent(eventId: string): Promise<void> {
    const claimed = await this.prisma.outboxEvent.updateMany({
      where: { id: eventId, status: 'pending' },
      data: {
        status: 'processing',
        attempts: { increment: 1 },
      },
    });

    if (claimed.count === 0) {
      return;
    }

    const event = await this.prisma.outboxEvent.findUniqueOrThrow({
      where: { id: eventId },
    });

    try {
      this.logger.log(
        `Processing outbox event id=${event.id} type=${event.eventType} aggregate=${event.aggregateType}:${event.aggregateId}`,
      );

      for (const handler of this.handlers) {
        if (handler.supports(event.eventType)) {
          await handler.handle({
            id: event.id,
            tenantId: event.tenantId,
            eventType: event.eventType,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            payload: (event.payload ?? {}) as Record<string, unknown>,
          });
        }
      }

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'processed',
          processedAt: new Date(),
          lastError: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown outbox processing error';

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'failed',
          lastError: message,
        },
      });

      this.logger.error(`Outbox event id=${event.id} failed: ${message}`);
    }
  }
}
