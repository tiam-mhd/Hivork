import { randomUUID } from 'node:crypto';

import { PublishRealtimeEventUseCase } from '@hivork/application';
import type { RealtimeEventDto } from '@hivork/contracts/realtime';
import {
  realtimeStaffChannel,
  realtimeTenantBroadcastChannel,
} from '@hivork/contracts/realtime';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { RedisRealtimeConnectionRegistry } from './redis-realtime-connection-registry.js';
import { RedisRealtimePublisher } from './redis-realtime-publisher.js';
import { RedisRealtimeUnreadCounter } from './redis-realtime-unread-counter.js';
import { RedisService } from './redis.service.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

async function probeRedis(url: string): Promise<boolean> {
  const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  try {
    await client.connect();
    await client.ping();
    await client.quit();
    return true;
  } catch {
    return false;
  }
}

const redisAvailable = await probeRedis(redisUrl);

function buildEvent(type: string): RealtimeEventDto {
  return {
    id: randomUUID(),
    type,
    priority: 'normal',
    payload: { entityId: randomUUID() },
    createdAt: new Date().toISOString(),
  };
}

describe.skipIf(!redisAvailable)('Redis realtime pub/sub', () => {
  let redisService: RedisService;
  let subscriber: Redis;

  beforeAll(async () => {
    redisService = new RedisService(redisUrl);
    await redisService.onModuleInit();
    subscriber = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: null });
    await subscriber.connect();
  });

  afterAll(async () => {
    await subscriber.quit().catch(() => undefined);
    await redisService.onModuleDestroy();
  });

  it('delivers staff-scoped events without cross-tenant leak', async () => {
    const publisher = new RedisRealtimePublisher(redisService);
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    const staffA = randomUUID();
    const staffB = randomUUID();
    const eventA = buildEvent('system.ping');
    const eventB = buildEvent('system.ping');

    const receivedA: string[] = [];
    const receivedB: string[] = [];

    await subscriber.subscribe(
      realtimeStaffChannel(tenantA, staffA),
      realtimeStaffChannel(tenantB, staffB),
    );
    subscriber.on('message', (channel, message) => {
      if (channel === realtimeStaffChannel(tenantA, staffA)) {
        receivedA.push(message);
      }
      if (channel === realtimeStaffChannel(tenantB, staffB)) {
        receivedB.push(message);
      }
    });

    await publisher.publish(tenantA, staffA, eventA);
    await publisher.publish(tenantB, staffB, eventB);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(receivedA).toHaveLength(1);
    expect(JSON.parse(receivedA[0]!).id).toBe(eventA.id);
    expect(receivedB).toHaveLength(1);
    expect(JSON.parse(receivedB[0]!).id).toBe(eventB.id);

    await subscriber.unsubscribe(
      realtimeStaffChannel(tenantA, staffA),
      realtimeStaffChannel(tenantB, staffB),
    );
  });

  it('broadcasts tenant events to broadcast channel', async () => {
    const publisher = new RedisRealtimePublisher(redisService);
    const tenantId = randomUUID();
    const event = buildEvent('system.announcement');
    const received: string[] = [];

    const channel = realtimeTenantBroadcastChannel(tenantId);
    await subscriber.subscribe(channel);
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        received.push(message);
      }
    });

    await publisher.publishToTenant(tenantId, event);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(received).toHaveLength(1);
    expect(JSON.parse(received[0]!).id).toBe(event.id);

    await subscriber.unsubscribe(channel);
  });

  it('increments unread counter via publish use case', async () => {
    const publisher = new RedisRealtimePublisher(redisService);
    const unreadCounter = new RedisRealtimeUnreadCounter(redisService);
    const useCase = new PublishRealtimeEventUseCase(publisher, unreadCounter);
    const tenantId = randomUUID();
    const staffId = randomUUID();

    await useCase.execute({
      tenantId,
      staffId,
      event: buildEvent('payment.reported'),
    });

    expect(await unreadCounter.get(tenantId, staffId)).toBe(1);
    await unreadCounter.reset(tenantId, staffId);
  });

  it('allows only one active connection per staff', async () => {
    const registry = new RedisRealtimeConnectionRegistry(redisService);
    const tenantId = randomUUID();
    const staffId = randomUUID();
    const connA = randomUUID();
    const connB = randomUUID();

    expect(await registry.tryAcquire(tenantId, staffId, connA)).toBe(true);
    expect(await registry.tryAcquire(tenantId, staffId, connB)).toBe(false);
    await registry.release(tenantId, staffId, connA);
    expect(await registry.tryAcquire(tenantId, staffId, connB)).toBe(true);
    await registry.release(tenantId, staffId, connB);
  });
});
