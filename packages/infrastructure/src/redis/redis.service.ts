import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  readonly client: Redis;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      connectTimeout: 2_000,
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }

  async ping(): Promise<'ok' | 'error'> {
    try {
      const response = await this.client.ping();
      return response === 'PONG' ? 'ok' : 'error';
    } catch {
      return 'error';
    }
  }
}
