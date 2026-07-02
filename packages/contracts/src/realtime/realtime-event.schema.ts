import { z } from 'zod';

export const RealtimeEventPrioritySchema = z.enum(['low', 'normal', 'high']);

export type RealtimeEventPriorityDto = z.infer<typeof RealtimeEventPrioritySchema>;

export const RealtimeEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1).max(120),
  priority: RealtimeEventPrioritySchema.default('normal'),
  payload: z.record(z.unknown()),
  createdAt: z.string().datetime(),
});

export type RealtimeEventDto = z.infer<typeof RealtimeEventSchema>;

export const NotificationUnreadCountSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
});

export type NotificationUnreadCountDto = z.infer<typeof NotificationUnreadCountSchema>;

export function realtimeStaffChannel(tenantId: string, staffId: string): string {
  return `realtime:tenant:${tenantId}:staff:${staffId}`;
}

export function realtimeTenantBroadcastChannel(tenantId: string): string {
  return `realtime:tenant:${tenantId}:broadcast`;
}
