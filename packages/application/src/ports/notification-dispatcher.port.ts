export type ReceiptNotificationChannel = 'sms' | 'bale';

export type QueueReceiptNotificationInput = {
  tenantId: string;
  installmentId: string;
  channel: ReceiptNotificationChannel;
  recipientRef: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  createdById?: string;
};

export type QueueReceiptNotificationResult = {
  notificationLogId: string;
  status: 'queued' | 'skipped';
};

export interface INotificationDispatcher {
  findRecentByIdempotencyKey(
    idempotencyKey: string,
    withinMs: number,
  ): Promise<{ id: string } | null>;

  queue(input: QueueReceiptNotificationInput): Promise<QueueReceiptNotificationResult>;
}

export const NOTIFICATION_DISPATCHER = Symbol('NOTIFICATION_DISPATCHER');

/** Idempotency window for receipt send per attempt + channel (IFP-095). */
export const RECEIPT_SEND_IDEMPOTENCY_MS = 60 * 60 * 1000;

export function buildReceiptSendIdempotencyKey(
  paymentAttemptId: string,
  channel: ReceiptNotificationChannel,
): string {
  return `payment_receipt:${paymentAttemptId}:${channel}`;
}
