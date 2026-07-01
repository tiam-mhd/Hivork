import type { IOutboxPublisher, OutboxPublishOptions, OutboxTransaction } from '@hivork/application';
import type { DomainEvent } from '@hivork/domain';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { getTenantId } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';

type OutboxWriteClient = Pick<PrismaService, 'outboxEvent'>;

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction): OutboxWriteClient {
  return (tx ?? prisma) as OutboxWriteClient;
}

function aggregateTypeFromEvent(event: DomainEvent, override?: string): string {
  return override ?? event.eventType.split('.')[0] ?? 'unknown';
}

@Injectable()
export class PrismaOutboxPublisher implements IOutboxPublisher {
  constructor(private readonly prisma: PrismaService) {}

  async publish(
    event: DomainEvent,
    options?: OutboxPublishOptions,
    tx?: OutboxTransaction,
  ): Promise<void> {
    const client = resolveClient(this.prisma, tx);

    await client.outboxEvent.create({
      data: {
        tenantId: options?.tenantId ?? getTenantId(),
        aggregateType: aggregateTypeFromEvent(event, options?.aggregateType),
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.toPayload() as Prisma.InputJsonValue,
        status: 'pending',
      },
    });
  }
}
