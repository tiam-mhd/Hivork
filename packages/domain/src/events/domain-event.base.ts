export abstract class DomainEvent {
  abstract readonly eventType: string;
  abstract readonly aggregateId: string;
  abstract toPayload(): Record<string, unknown>;
}
