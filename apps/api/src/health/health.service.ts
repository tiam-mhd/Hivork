import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Client } from 'pg';

import { EnvConfig } from '../config/env.schema';

export type HealthCheckResult = {
  status: 'ok' | 'degraded';
  db: 'ok' | 'error';
  redis: 'ok' | 'error';
};

@Injectable()
export class HealthService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async check(): Promise<HealthCheckResult> {
    const [db, redis] = await Promise.all([this.pingDatabase(), this.pingRedis()]);
    const status = db === 'ok' && redis === 'ok' ? 'ok' : 'degraded';

    return { status, db, redis };
  }

  private async pingDatabase(): Promise<'ok' | 'error'> {
    const databaseUrl = this.config.get('DATABASE_URL', { infer: true });
    const connectionString = databaseUrl.split('?')[0] ?? databaseUrl;
    const client = new Client({
      connectionString,
      ssl: false,
    });
    try {
      await client.connect();
      await client.query('SELECT 1');
      return 'ok';
    } catch {
      return 'error';
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  private async pingRedis(): Promise<'ok' | 'error'> {
    const redis = new Redis(this.config.get('REDIS_URL', { infer: true }), {
      connectTimeout: 2_000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });

    try {
      await redis.connect();
      const pong = await redis.ping();
      return pong === 'PONG' ? 'ok' : 'error';
    } catch {
      return 'error';
    } finally {
      redis.disconnect();
    }
  }
}
