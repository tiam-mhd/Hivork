import { randomUUID } from 'node:crypto';

import {
  realtimeStaffChannel,
  realtimeTenantBroadcastChannel,
} from '@hivork/contracts/realtime';
import { PrismaTenantRepository, RedisRealtimeConnectionRegistry } from '@hivork/infrastructure';
import {
  ForbiddenException,
  Injectable,
  Logger,
  type MessageEvent,
} from '@nestjs/common';
import Redis from 'ioredis';
import { Observable } from 'rxjs';

import type { StaffContext } from '../../common/types/auth-context.js';
import { AppConfigService } from '../../config/app-config.service.js';

const HEARTBEAT_MS = 30_000;

@Injectable()
export class RealtimeStreamService {
  private readonly logger = new Logger(RealtimeStreamService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly connectionRegistry: RedisRealtimeConnectionRegistry,
    private readonly tenantRepository: PrismaTenantRepository,
  ) {}

  subscribe(staff: StaffContext): Observable<MessageEvent> {
    const connectionId = randomUUID();
    const { tenantId, id: staffId } = staff;

    return new Observable<MessageEvent>((subscriber) => {
      let subscriberClient: Redis | null = null;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
      let closed = false;

      const cleanup = async (): Promise<void> => {
        if (closed) {
          return;
        }
        closed = true;
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
        }
        if (subscriberClient) {
          await subscriberClient.quit().catch(() => undefined);
        }
        await this.connectionRegistry.release(tenantId, staffId, connectionId);
        this.logger.log({ tenantId, staffId, event: 'realtime.disconnected' });
      };

      void (async () => {
        try {
          const tenant = await this.tenantRepository.findById(tenantId);
          if (!tenant) {
            subscriber.error(
              new ForbiddenException({
                code: 'TENANT_NOT_FOUND',
                message: 'Tenant not found.',
              }),
            );
            return;
          }

          if (tenant.status === 'suspended') {
            subscriber.error(
              new ForbiddenException({
                code: 'TENANT_SUSPENDED',
                message: 'Tenant is suspended.',
              }),
            );
            return;
          }

          const acquired = await this.connectionRegistry.tryAcquire(
            tenantId,
            staffId,
            connectionId,
          );
          if (!acquired) {
            subscriber.error(
              new ForbiddenException({
                code: 'REALTIME_CONNECTION_LIMIT',
                message: 'Only one realtime connection is allowed per staff session.',
              }),
            );
            return;
          }

          subscriberClient = new Redis(this.config.redisUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: null,
          });
          await subscriberClient.connect();

          const staffChannel = realtimeStaffChannel(tenantId, staffId);
          const broadcastChannel = realtimeTenantBroadcastChannel(tenantId);
          await subscriberClient.subscribe(staffChannel, broadcastChannel);

          subscriberClient.on('message', (_channel, message) => {
            if (closed) {
              return;
            }
            subscriber.next({ data: message, type: 'message' });
          });

          heartbeatTimer = setInterval(() => {
            if (closed) {
              return;
            }
            void this.connectionRegistry.refresh(tenantId, staffId, connectionId);
            subscriber.next({ data: '', type: 'heartbeat' });
          }, HEARTBEAT_MS);

          this.logger.log({ tenantId, staffId, event: 'realtime.connected' });

          subscriber.next({
            data: JSON.stringify({
              id: randomUUID(),
              type: 'system.connected',
              priority: 'low',
              payload: {},
              createdAt: new Date().toISOString(),
            }),
            type: 'message',
          });
        } catch (error) {
          subscriber.error(error);
          await cleanup();
        }
      })();

      return () => {
        void cleanup();
      };
    });
  }
}
