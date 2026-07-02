import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

import { JwtTokenService, PrismaTenantRepository, RedisRealtimeConnectionRegistry } from '@hivork/infrastructure';
import {
  realtimeStaffChannel,
  realtimeTenantBroadcastChannel,
} from '@hivork/contracts/realtime';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import Redis from 'ioredis';
import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';

import { AppConfigService } from '../../config/app-config.service.js';
import { extractAccessToken } from '../../common/utils/auth-request.util.js';

/**
 * WebSocket fallback when reverse proxies block SSE (`text/event-stream`).
 * Same auth as SSE: `Authorization: Bearer` or `?access_token=` query param.
 */
@Injectable()
export class RealtimeWsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeWsService.name);
  private wss: WebSocketServer | null = null;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly config: AppConfigService,
    private readonly tokens: JwtTokenService,
    private readonly connectionRegistry: RedisRealtimeConnectionRegistry,
    private readonly tenantRepository: PrismaTenantRepository,
  ) {}

  onModuleInit(): void {
    const server = this.httpAdapterHost.httpAdapter.getHttpServer() as Server;
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const pathname = request.url?.split('?')[0];
      if (pathname !== '/api/v1/realtime/ws') {
        return;
      }

      void this.handleUpgrade(request, socket as Socket, head);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (!this.wss) {
        resolve();
        return;
      }
      this.wss.close(() => resolve());
    });
  }

  private async handleUpgrade(
    request: IncomingMessage,
    socket: Socket,
    head: Buffer,
  ): Promise<void> {
    try {
      const staff = await this.authenticate(request);
      const tenant = await this.tenantRepository.findById(staff.tenantId);
      if (!tenant) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }
      if (tenant.status === 'suspended') {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      const connectionId = randomUUID();
      const acquired = await this.connectionRegistry.tryAcquire(
        staff.tenantId,
        staff.staffId,
        connectionId,
      );
      if (!acquired) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      this.wss?.handleUpgrade(request, socket, head, (ws) => {
        void this.attachClient(ws, staff.tenantId, staff.staffId, connectionId);
      });
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  }

  private async attachClient(
    ws: WebSocket,
    tenantId: string,
    staffId: string,
    connectionId: string,
  ): Promise<void> {
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
      this.logger.log({ tenantId, staffId, event: 'realtime.ws.disconnected' });
    };

    try {
      subscriberClient = new Redis(this.config.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: null,
      });
      await subscriberClient.connect();

      const staffChannel = realtimeStaffChannel(tenantId, staffId);
      const broadcastChannel = realtimeTenantBroadcastChannel(tenantId);
      await subscriberClient.subscribe(staffChannel, broadcastChannel);

      subscriberClient.on('message', (_channel, message) => {
        if (closed || ws.readyState !== WebSocket.OPEN) {
          return;
        }
        ws.send(message);
      });

      heartbeatTimer = setInterval(() => {
        if (closed || ws.readyState !== WebSocket.OPEN) {
          return;
        }
        void this.connectionRegistry.refresh(tenantId, staffId, connectionId);
        ws.send(JSON.stringify({ type: 'heartbeat' }));
      }, 30_000);

      ws.on('close', () => {
        void cleanup();
      });

      ws.send(
        JSON.stringify({
          id: randomUUID(),
          type: 'system.connected',
          priority: 'low',
          payload: {},
          createdAt: new Date().toISOString(),
        }),
      );

      this.logger.log({ tenantId, staffId, event: 'realtime.ws.connected' });
    } catch (error) {
      this.logger.error({ tenantId, staffId, event: 'realtime.ws.error', error });
      ws.close();
      await cleanup();
    }
  }

  private async authenticate(
    request: IncomingMessage,
  ): Promise<{ tenantId: string; staffId: string }> {
    const fakeRequest = {
      headers: request.headers,
      query: Object.fromEntries(new URL(request.url ?? '', 'http://localhost').searchParams),
    } as Parameters<typeof extractAccessToken>[0];

    const token = extractAccessToken(fakeRequest);
    if (!token) {
      throw new UnauthorizedException();
    }

    const payload = await this.tokens.verifyAccessToken(token);
    if (!payload || payload.actor !== 'staff') {
      throw new UnauthorizedException();
    }

    return { tenantId: payload.tenantId, staffId: payload.sub };
  }
}
