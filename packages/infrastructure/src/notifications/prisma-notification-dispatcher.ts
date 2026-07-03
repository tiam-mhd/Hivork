import { randomUUID } from 'node:crypto';

import type {
  INotificationDispatcher,
  QueueReceiptNotificationInput,
  QueueReceiptNotificationResult,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PrismaNotificationDispatcher implements INotificationDispatcher {
  constructor(private readonly prisma: PrismaService) {}

  async findRecentByIdempotencyKey(
    idempotencyKey: string,
    withinMs: number,
  ): Promise<{ id: string } | null> {
    const since = new Date(Date.now() - withinMs);
    const row = await this.prisma.notificationLog.findFirst({
      where: {
        idempotencyKey,
        createdAt: { gte: since },
      },
      select: { id: true },
    });

    return row ? { id: row.id } : null;
  }

  async queue(input: QueueReceiptNotificationInput): Promise<QueueReceiptNotificationResult> {
    const recent = await this.findRecentByIdempotencyKey(input.idempotencyKey, 60 * 60 * 1000);
    if (recent) {
      return { notificationLogId: recent.id, status: 'skipped' };
    }

    const row = await this.prisma.notificationLog.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId,
        installmentId: input.installmentId,
        channel: input.channel,
        reminderType: 'payment_receipt',
        status: 'queued',
        idempotencyKey: input.idempotencyKey,
        recipientRef: input.recipientRef,
        createdById: input.createdById,
        metadata: input.metadata ?? {},
      },
    });

    return { notificationLogId: row.id, status: 'queued' };
  }
}
