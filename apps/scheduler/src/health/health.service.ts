import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

import { AppConfigService } from '../config/app-config.service';
import { HIVORK_JOBS_QUEUE } from '../config/env.schema';

export type SchedulerHealthResult = {
  status: 'ok' | 'degraded';
  redis: 'ok' | 'error';
  queue: 'ok' | 'error';
  queueCounts?: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
};

@Injectable()
export class HealthService {
  constructor(
    private readonly appConfig: AppConfigService,
    @InjectQueue(HIVORK_JOBS_QUEUE) private readonly queue: Queue,
  ) {}

  async check(): Promise<SchedulerHealthResult> {
    const [redis, queue] = await Promise.all([this.pingRedis(), this.getQueueStatus()]);
    const status = redis === 'ok' && queue.status === 'ok' ? 'ok' : 'degraded';

    return {
      status,
      redis,
      queue: queue.status,
      queueCounts: queue.counts,
    };
  }

  private async pingRedis(): Promise<'ok' | 'error'> {
    const redis = new Redis(this.appConfig.redisUrl, {
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

  private async getQueueStatus(): Promise<{
    status: 'ok' | 'error';
    counts?: SchedulerHealthResult['queueCounts'];
  }> {
    try {
      await this.queue.waitUntilReady();
      const counts = await this.queue.getJobCounts('waiting', 'active', 'completed', 'failed');
      return {
        status: 'ok',
        counts: {
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          completed: counts.completed ?? 0,
          failed: counts.failed ?? 0,
        },
      };
    } catch {
      return { status: 'error' };
    }
  }
}
