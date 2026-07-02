import { z } from 'zod';

import { customerValidationMessages } from './customer-validation-messages.js';

export const CustomerTimelineEventTypeSchema = z.enum([
  'payment',
  'contract',
  'sms',
  'notification',
  'note',
  'call',
  'audit',
]);

export type CustomerTimelineEventTypeDto = z.infer<typeof CustomerTimelineEventTypeSchema>;

export const CustomerTimelineEntityRefSchema = z.object({
  type: z.string().min(1),
  id: z.string().uuid(customerValidationMessages.uuid),
});

export type CustomerTimelineEntityRefDto = z.infer<typeof CustomerTimelineEntityRefSchema>;

export const CustomerTimelineActorSchema = z.object({
  type: z.enum(['staff', 'customer', 'system', 'platform']),
  id: z.string().uuid(customerValidationMessages.uuid).optional(),
  name: z.string().nullable().optional(),
});

export type CustomerTimelineActorDto = z.infer<typeof CustomerTimelineActorSchema>;

export const CustomerTimelineEventSchema = z.object({
  id: z.string().min(1),
  type: CustomerTimelineEventTypeSchema,
  occurredAt: z.string().datetime(),
  title: z.string().min(1),
  summary: z.string().nullable(),
  actor: CustomerTimelineActorSchema.nullable().optional(),
  entityRef: CustomerTimelineEntityRefSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type CustomerTimelineEventDto = z.infer<typeof CustomerTimelineEventSchema>;

const timelineTypesQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return value;
}, z.array(CustomerTimelineEventTypeSchema).optional());

const isoDateTimeQuerySchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime())
  .optional();

export const ListCustomerTimelineQuerySchema = z.object({
  cursor: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  types: timelineTypesQuerySchema,
  occurredFrom: isoDateTimeQuerySchema,
  occurredTo: isoDateTimeQuerySchema,
});

export type ListCustomerTimelineQueryDto = z.infer<typeof ListCustomerTimelineQuerySchema>;

export const CustomerTimelineListResponseSchema = z.object({
  items: z.array(CustomerTimelineEventSchema),
  meta: z.object({
    hasNext: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type CustomerTimelineListResponseDto = z.infer<typeof CustomerTimelineListResponseSchema>;
