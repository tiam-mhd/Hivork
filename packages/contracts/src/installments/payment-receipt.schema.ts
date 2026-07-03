import { z } from 'zod';

export const ReceiptNotificationChannelSchema = z.enum(['sms', 'bale']);

export type ReceiptNotificationChannelDto = z.infer<typeof ReceiptNotificationChannelSchema>;

export const SendPaymentReceiptSchema = z.object({
  channels: z.array(ReceiptNotificationChannelSchema).min(1).max(2),
  recipientPhone: z.string().trim().min(10).max(11).optional(),
});

export type SendPaymentReceiptDto = z.infer<typeof SendPaymentReceiptSchema>;

export const SendPaymentReceiptDispatchItemSchema = z.object({
  channel: ReceiptNotificationChannelSchema,
  status: z.enum(['queued', 'skipped']),
  notificationLogId: z.string().uuid(),
});

export const SendPaymentReceiptResponseSchema = z.object({
  receiptNumber: z.string().min(1),
  dispatched: z.array(SendPaymentReceiptDispatchItemSchema),
});

export type SendPaymentReceiptResponseDto = z.infer<typeof SendPaymentReceiptResponseSchema>;
