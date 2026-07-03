import { randomUUID } from 'node:crypto';

import type {
  CreatePaymentReceiptInput,
  IPaymentReceiptRepository,
  PaymentReceiptRecord,
} from '@hivork/application';
import type { OutboxTransaction } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction) {
  return (tx ?? prisma) as PrismaService;
}

function toRecord(row: {
  id: string;
  tenantId: string;
  paymentAttemptId: string;
  receiptNumber: string;
  pdfFileId: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PaymentReceiptRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    paymentAttemptId: row.paymentAttemptId,
    receiptNumber: row.receiptNumber,
    pdfFileId: row.pdfFileId,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaPaymentReceiptRepository implements IPaymentReceiptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPaymentAttemptId(
    tenantId: string,
    paymentAttemptId: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentReceiptRecord | null> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.paymentReceipt.findFirst({
      where: { tenantId, paymentAttemptId, deletedAt: null },
    });

    return row ? toRecord(row) : null;
  }

  async create(
    input: CreatePaymentReceiptInput,
    tx?: OutboxTransaction,
  ): Promise<PaymentReceiptRecord> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.paymentReceipt.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId,
        paymentAttemptId: input.paymentAttemptId,
        receiptNumber: input.receiptNumber,
        createdById: input.createdById,
        updatedById: input.createdById,
      },
    });

    return toRecord(row);
  }

  async markSent(
    tenantId: string,
    id: string,
    sentAt: Date,
    updatedById: string,
    tx?: OutboxTransaction,
  ): Promise<void> {
    const client = resolveClient(this.prisma, tx);
    await client.paymentReceipt.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { sentAt, updatedById },
    });
  }
}
