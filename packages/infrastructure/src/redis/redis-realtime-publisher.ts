import type { IRealtimePublisher } from '@hivork/application';
import type { RealtimeEventDto } from '@hivork/contracts/realtime';
import {
  realtimeStaffChannel,
  realtimeTenantBroadcastChannel,
} from '@hivork/contracts/realtime';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

@Injectable()
export class RedisRealtimePublisher implements IRealtimePublisher {
  constructor(private readonly redis: RedisService) {}

  async publish(tenantId: string, staffId: string, event: RealtimeEventDto): Promise<void> {
    const channel = realtimeStaffChannel(tenantId, staffId);
    await this.redis.client.publish(channel, JSON.stringify(event));
  }

  async publishToTenant(tenantId: string, event: RealtimeEventDto): Promise<void> {
    const channel = realtimeTenantBroadcastChannel(tenantId);
    await this.redis.client.publish(channel, JSON.stringify(event));
  }
}
