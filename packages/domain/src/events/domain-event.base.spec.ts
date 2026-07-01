import { describe, expect, it } from 'vitest';

import { DomainEvent } from './domain-event.base.js';

class TestEvent extends DomainEvent {
  readonly eventType = 'test.created';
  readonly aggregateId = 'agg-1';

  toPayload(): Record<string, unknown> {
    return { foo: 'bar' };
  }
}

describe('DomainEvent', () => {
  it('requires eventType, aggregateId, and payload', () => {
    const event = new TestEvent();

    expect(event.eventType).toBe('test.created');
    expect(event.aggregateId).toBe('agg-1');
    expect(event.toPayload()).toEqual({ foo: 'bar' });
  });
});
