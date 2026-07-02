export type OutboxEventDispatchRecord = {
  id: string;
  tenantId: string | null;
  eventType: string;
  aggregateId: string;
  aggregateType: string | null;
  payload: Record<string, unknown>;
};

export interface IOutboxEventHandler {
  supports(eventType: string): boolean;
  handle(event: OutboxEventDispatchRecord): Promise<void>;
}

export const OUTBOX_EVENT_HANDLERS = Symbol('OUTBOX_EVENT_HANDLERS');

export const SYSTEM_STAFF_ACTOR_ID = '00000000-0000-4000-8000-000000000000';
